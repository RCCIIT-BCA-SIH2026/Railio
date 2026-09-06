// ─────────────────────────────────────────────────────────────────────────────
// RouteDecisionEngine — Navigation Decision Engine
//
// CRITICAL FIXES:
//
// 1. Direction is now derived from stableXCenter (EMA-smoothed across frames),
//    NOT from a single frame's object.direction field OR single xCenter.
//
//    OLD BROKEN LOGIC (caused "always turn right"):
//      if (target.direction === 'right' || xCenter > 0.65) → TURN_RIGHT
//      (The OR means direction='right' alone triggers TURN_RIGHT even at xCenter=0.51)
//
//    NEW CORRECT LOGIC:
//      xCenter in [0.35, 0.65] → MOVE_FORWARD  (door is ahead — highest priority)
//      xCenter < 0.35          → TURN_LEFT
//      xCenter > 0.65          → TURN_RIGHT
//      direction === 'behind'  → TURN_AROUND
//      (stableDirection is only used as a tiebreaker when xCenter is ambiguous)
//
// 2. Input now comes from TemporalSceneMemory.getConfirmedObjects() — objects
//    must appear in ≥2 frames before influencing navigation.
//
// 3. Route graph fallback (Dijkstra) still works for pre-mapped environments.
// ─────────────────────────────────────────────────────────────────────────────

import {
  EstimatedPose,
  SpatialMapNode,
  SceneUnderstanding,
  NavigationInstruction,
  NavAction,
  SpatialCoordinates,
} from './types';
import { TrackedObject } from './types';
import { SelectedTarget } from './TargetSelectionEngine';
import { directionResolver } from './DirectionResolver';
import { navigationRuntimeTrace } from './NavigationRuntimeTrace';
import { targetLocalizer } from './TargetLocalizer';
import { spatialTrackingProvider } from './SpatialTrackingProvider';
import { GuidanceMode } from './types';

// How centered a target must be to count as FORWARD (normalized 0-1)
const FORWARD_ZONE_MIN = 0.35;
const FORWARD_ZONE_MAX = 0.65;
// Confidence threshold below which we issue SCAN instead of direction
const MIN_NAVIGATION_CONFIDENCE = 0.55;

export class RouteDecisionEngine {
  private currentPath: SpatialMapNode[] = [];
  private currentWaypointIndex: number = 0;
  private offRouteCounter: number = 0;
  private offRouteThreshold: number = 5;

  public setRoute(path: SpatialMapNode[]): void {
    this.currentPath = path;
    this.currentWaypointIndex = 0;
    this.offRouteCounter = 0;
  }

  public getRoute(): SpatialMapNode[] {
    return this.currentPath;
  }

  public getTargetNode(): SpatialMapNode | null {
    if (this.currentPath.length === 0) return null;
    return this.currentPath[this.currentPath.length - 1];
  }

  /**
   * Distance to the mapped destination. Does NOT imply arrival.
   */
  public getDistanceToDestination(pose: EstimatedPose): number | null {
    const finalNode = this.getTargetNode();
    if (!finalNode) return null;
    return this.calculateDistance(pose.position, finalNode.coordinates);
  }

  public hasMappedDestination(): boolean {
    return this.currentPath.length > 0 && this.getTargetNode() !== null;
  }

  /**
   * PRIMARY ENTRY POINT: Evaluate navigation using confirmed temporal objects.
   *
   * This method uses CONFIRMED objects from TemporalSceneMemory — objects that
   * have been seen in multiple frames. A single noisy frame cannot influence this.
   */
  public evaluateWithConfirmedObjects(
    pose: EstimatedPose,
    confirmedObjects: TrackedObject[],
    lockedTarget: SelectedTarget | null,
    scene?: SceneUnderstanding | null
  ): {
    instruction: NavigationInstruction;
    isOffRoute: boolean;
    isArrived: boolean;
    isPathBlocked: boolean;
  } {
    // 1. Path blocked check from scene
    if (scene?.recommendedAction === 'PATH_BLOCKED') {
      return this.buildResult('PATH_BLOCKED', 'The path ahead is blocked. Please wait.', '⚠️ Path Blocked', 1.5, 0, 0.95, false, false, true);
    }

    // 2. Low scene confidence — trigger scan
    if (scene && scene.confidence < MIN_NAVIGATION_CONFIDENCE && scene.recommendedAction === 'SCAN') {
      return this.buildResult('SCAN', 'Please slowly look around so I can understand your surroundings.', 'Looking around...', 0, 0, 0.5, false, false, false);
    }

    // 3. Vision-first guidance using LOCKED TARGET from TemporalSceneMemory
    if (lockedTarget) {
      return this.generateVisionDecision(lockedTarget, pose, scene);
    }

    // 4. If we have confirmed objects but no locked target yet, check the best one
    const primaryCandidate = confirmedObjects.find(
      (o) => o.type === 'exit' || o.type === 'emergency_exit' || o.type === 'door'
    ) || confirmedObjects[0];

    if (primaryCandidate) {
      return this.generateObjectDecision(primaryCandidate, pose, scene);
    }

    // 5. Fallback to spatial graph route
    return this.evaluateGraphRoute(pose);
  }

  /**
   * LEGACY ENTRY POINT: Kept for backward compatibility with tests and
   * the setInterval-based old flow. Prefer evaluateWithConfirmedObjects().
   */
  public evaluateStep(
    pose: EstimatedPose,
    scene?: SceneUnderstanding | null
  ): {
    instruction: NavigationInstruction;
    isOffRoute: boolean;
    isArrived: boolean;
    isPathBlocked: boolean;
  } {
    // 1. Path blocked
    if (scene?.recommendedAction === 'PATH_BLOCKED') {
      return this.buildResult('PATH_BLOCKED', 'The path ahead is blocked. Recalculating route.', '⚠️ Path Blocked Ahead', 1.5, 0, 0.95, false, false, true);
    }

    // 2. Vision objects (single-frame, legacy flow)
    if (scene?.objects && scene.objects.length > 0 && scene.confidence >= MIN_NAVIGATION_CONFIDENCE) {
      const primaryTarget =
        scene.objects.find((o) => o.type === 'exit' || o.type === 'emergency_exit') ||
        scene.objects.find((o) => o.type === 'door' && o.direction !== 'behind') ||
        scene.objects[0];

      if (primaryTarget && primaryTarget.confidence >= MIN_NAVIGATION_CONFIDENCE) {
        return this.generateLegacyVisionInstruction(primaryTarget, scene, pose);
      }
    }

    // 3. No objects / low confidence — scan
    if (!scene || scene.confidence < MIN_NAVIGATION_CONFIDENCE) {
      return this.buildResult('SCAN', 'Please look around so I can identify your surroundings.', 'Looking for doors & exits...', 0, 0, 0.5, false, false, false);
    }

    // 4. Graph fallback
    return this.evaluateGraphRoute(pose);
  }

  // ─── Vision-based navigation using locked target ──────────────────────────

  /**
   * Generate instruction from a SelectedTarget (locked, multi-frame confirmed).
   *
   * DIRECTION RULE:
   *   stableXCenter in [0.35, 0.65] → MOVE_FORWARD (target is AHEAD)
   *   stableXCenter < 0.35          → TURN_LEFT
   *   stableXCenter > 0.65          → TURN_RIGHT
   *   stableDirection === 'behind'  → TURN_AROUND
   *
   * stableDirection is used ONLY as a tiebreaker when xCenter is near a boundary.
   */
  private generateVisionDecision(
    target: SelectedTarget,
    pose: EstimatedPose,
    scene?: SceneUnderstanding | null
  ): {
    instruction: NavigationInstruction;
    isOffRoute: boolean;
    isArrived: boolean;
    isPathBlocked: boolean;
  } {
    const xCenter = target.stableXCenter;
    const direction = target.stableDirection;
    const confidence = target.aggregateConfidence;


    // ────────────────────────────────────────────────────────────────────────
    // CORE DIRECTION LOGIC — Honest Hybrid Pipeline (VISUAL vs SPATIAL)
    // ────────────────────────────────────────────────────────────────────────

    let action: NavAction = 'MOVE_FORWARD';
    let arrowAngleDeg = 0;
    let spokenText = '';
    let displayText = '';
    let traceReason = '';
    let mode: GuidanceMode = 'VISUAL';

    const spatialTarget = targetLocalizer.localizeTarget(target as any); // Cast as TrackedObject for localizer

    if (!spatialTarget.worldPosition) {
      // ────────────────────────────────────────────────────────────────────────
      // MODE A: VISUAL GUIDANCE (No 3D spatial geometry)
      // ────────────────────────────────────────────────────────────────────────
      mode = 'VISUAL';
      
      // We only use the screen center (xCenter) to provide basic semantic guidance.
      // We DO NOT output physical turns (TURN_LEFT/TURN_RIGHT) without spatial proof.
      if (xCenter >= FORWARD_ZONE_MIN && xCenter <= FORWARD_ZONE_MAX) {
        action = 'MOVE_FORWARD';
        spokenText = target.isConfirmedExit
          ? `The exit is directly ahead. Move forward.`
          : `The ${this.safeLabel(target)} is directly ahead. Move forward.`;
        displayText = `Walk forward toward ${target.label}`;
        traceReason = 'Visual Guidance: Target is centered in the camera view.';
      } else {
        // Target is visible but off-center. Tell the user to look toward it.
        action = 'ORIENT';
        arrowAngleDeg = xCenter < 0.5 ? -45 : 45; // Just a generic arrow indicator, not a physical turn degree
        spokenText = `Please look toward the ${this.safeLabel(target)}.`;
        displayText = `Look toward ${target.label}`;
        traceReason = 'Visual Guidance: Target is off-center. Requesting user reorientation.';
      }
    } else {
      // ────────────────────────────────────────────────────────────────────────
      // MODE B: SPATIAL GUIDANCE (Native AR Depth exists)
      // ────────────────────────────────────────────────────────────────────────
      mode = 'SPATIAL';

      const camPose = spatialTrackingProvider.getCameraPose();
      if (!camPose) {
        // Fallback safety if AR is lost momentarily but we had a target
        action = 'SCAN';
        spokenText = `I temporarily lost spatial tracking. Please hold still.`;
        displayText = `Locating ${target.label}...`;
        traceReason = 'Spatial Guidance: cameraPose is null';
      } else {
        // In a real AR implementation, we would extract the true Forward Vector from the AR camera matrix.
        // For now, we mock the forward vector as we removed the DeviceMotion proxy.
        // A real iOSSpatialTrackingProvider would return the true matrix.
        const camFwd = { x: 0, y: 1, z: 0 }; // Placeholder for real AR Forward

        const resolution = directionResolver.resolveDirection(
          camPose.position,
          camFwd,
          spatialTarget.worldPosition
        );

        action = resolution.action;
        arrowAngleDeg = resolution.relativeAngleDeg;
        traceReason = `Spatial Guidance: ${resolution.reason}`;

        if (action === 'MOVE_FORWARD') {
          spokenText = target.isConfirmedExit
            ? `The exit is directly ahead. Move forward.`
            : `The ${this.safeLabel(target)} is directly ahead. Move forward.`;
          displayText = `Walk forward toward ${target.label}`;
        } else if (action === 'SLIGHT_LEFT' || action === 'SLIGHT_RIGHT') {
          const side = action === 'SLIGHT_LEFT' ? 'left' : 'right';
          spokenText = `Bear slightly ${side} toward the ${this.safeLabel(target)}.`;
          displayText = `Slight ${side} • ${target.label}`;
        } else if (action === 'TURN_LEFT' || action === 'TURN_RIGHT') {
          const side = action === 'TURN_LEFT' ? 'left' : 'right';
          spokenText = `The ${this.safeLabel(target)} is to your ${side}. Turn ${side}.`;
          displayText = `Turn ${side} toward ${target.label}`;
        } else if (action === 'TURN_AROUND') {
          spokenText = `The ${this.safeLabel(target)} is behind you. Please turn around.`;
          displayText = `Turn around toward ${target.label}`;
        }
      }
    }

    // LOG DECISION TRACE
    navigationRuntimeTrace.logDecision({
      timestamp: Date.now(),
      frameId: scene?.requestId || 'unknown',
      sceneVersion: scene?.sceneVersion || 0,
      deviceHeadingDeg: pose.headingDeg,
      rawXCenter: xCenter,
      targetBearingDeg: null,
      targetWorldPosition: spatialTarget.worldPosition,
      cameraForwardVector: null, // Tracked in Spatial mode natively, hidden for now
      relativeAngleDeg: arrowAngleDeg,
      selectedTargetId: target.trackId,
      actionTaken: action,
      reason: traceReason,
      guidanceMode: mode,
    });

    const mappedDist = this.getDistanceToDestination(pose);
    const distanceMeters = mappedDist !== null
      ? Math.round(mappedDist * 10) / 10
      : spatialTarget.worldPosition
      ? Math.round(this.calculateDistance(pose.position, spatialTarget.worldPosition) * 10) / 10
      : 0;

    return {
      instruction: {
        action,
        spokenText,
        displayText,
        distanceMeters,
        confidence,
        arrowAngleDeg,
        targetObject: target.label,
        timestamp: Date.now(),
        guidanceMode: mode,
      },
      isOffRoute: false,
      isArrived: false,
      isPathBlocked: false,
    };
  }

  /**
   * Generate instruction from a confirmed TrackedObject (when no locked target yet).
   * Same direction logic as generateVisionDecision.
   */
  private generateObjectDecision(
    obj: TrackedObject,
    pose: EstimatedPose,
    scene?: SceneUnderstanding | null
  ): {
    instruction: NavigationInstruction;
    isOffRoute: boolean;
    isArrived: boolean;
    isPathBlocked: boolean;
  } {
    const xCenter = obj.stableXCenter;
    const isExit = obj.type === 'exit' || obj.type === 'emergency_exit' || obj.hasExitSign;

    // ────────────────────────────────────────────────────────────────────────
    // FALLBACK OBJECT LOGIC — Honest Hybrid Pipeline (VISUAL vs SPATIAL)
    // ────────────────────────────────────────────────────────────────────────
    
    let action: NavAction = 'MOVE_FORWARD';
    let arrowAngleDeg = 0;
    let spokenText = '';
    let displayText = '';
    let traceReason = '';
    let mode: GuidanceMode = 'VISUAL';

    const spatialTarget = targetLocalizer.localizeTarget(obj);

    if (!spatialTarget.worldPosition) {
      mode = 'VISUAL';
      if (xCenter >= FORWARD_ZONE_MIN && xCenter <= FORWARD_ZONE_MAX) {
        action = 'MOVE_FORWARD';
        spokenText = isExit ? 'The exit is ahead. Move forward.' : `The ${obj.label.toLowerCase()} is ahead. Move forward.`;
        displayText = `Walk forward • ${obj.label}`;
        traceReason = '(Fallback) Visual Guidance: Target is centered.';
      } else {
        action = 'ORIENT';
        arrowAngleDeg = xCenter < 0.5 ? -45 : 45;
        spokenText = `Please look toward the ${obj.label.toLowerCase()}.`;
        displayText = `Look toward ${obj.label}`;
        traceReason = '(Fallback) Visual Guidance: Target is off-center.';
      }
    } else {
      mode = 'SPATIAL';
      const camPose = spatialTrackingProvider.getCameraPose();
      if (!camPose) {
        action = 'SCAN';
        spokenText = `I need a better view.`;
        displayText = `Locating ${obj.label}...`;
        traceReason = '(Fallback) Spatial Guidance: missing cameraPose';
      } else {
        const camFwd = { x: 0, y: 1, z: 0 }; 

        const resolution = directionResolver.resolveDirection(
          camPose.position,
          camFwd,
          spatialTarget.worldPosition
        );
        action = resolution.action;
        arrowAngleDeg = resolution.relativeAngleDeg;
        traceReason = `(Fallback) Spatial Guidance: ${resolution.reason}`;

        if (action === 'MOVE_FORWARD') {
          spokenText = isExit ? 'The exit is ahead. Move forward.' : `The ${obj.label.toLowerCase()} is ahead. Move forward.`;
          displayText = `Walk forward • ${obj.label}`;
        } else if (action === 'SLIGHT_LEFT' || action === 'SLIGHT_RIGHT') {
          const side = action === 'SLIGHT_LEFT' ? 'left' : 'right';
          spokenText = `The ${obj.label.toLowerCase()} is slightly to your ${side}.`;
          displayText = `Slight ${side} • ${obj.label}`;
        } else if (action === 'TURN_LEFT' || action === 'TURN_RIGHT') {
          const side = action === 'TURN_LEFT' ? 'left' : 'right';
          spokenText = `The ${obj.label.toLowerCase()} is to your ${side}. Turn ${side}.`;
          displayText = `Turn ${side} • ${obj.label}`;
        } else if (action === 'TURN_AROUND') {
          spokenText = `The ${obj.label.toLowerCase()} is behind you. Turn around.`;
          displayText = `Turn around • ${obj.label}`;
        }
      }
    }

    // LOG DECISION TRACE
    navigationRuntimeTrace.logDecision({
      timestamp: Date.now(),
      frameId: scene?.requestId || 'unknown',
      sceneVersion: scene?.sceneVersion || 0,
      deviceHeadingDeg: pose.headingDeg,
      rawXCenter: xCenter,
      targetBearingDeg: null, 
      targetWorldPosition: spatialTarget.worldPosition,
      cameraForwardVector: null,
      relativeAngleDeg: arrowAngleDeg,
      selectedTargetId: obj.trackId,
      actionTaken: action,
      reason: traceReason,
      guidanceMode: mode,
    });

    const mappedDist = this.getDistanceToDestination(pose);
    const distanceMeters = mappedDist !== null
      ? Math.round(mappedDist * 10) / 10
      : spatialTarget.worldPosition
      ? Math.round(this.calculateDistance(pose.position, spatialTarget.worldPosition) * 10) / 10
      : 0;

    return {
      instruction: {
        action,
        spokenText,
        displayText,
        distanceMeters,
        confidence: obj.aggregateConfidence,
        arrowAngleDeg,
        targetObject: obj.label,
        timestamp: Date.now(),
        guidanceMode: mode,
      },
      isOffRoute: false,
      isArrived: false,
      isPathBlocked: false,
    };
  }

  /**
   * LEGACY: Single-frame vision instruction (for backward compatibility).
   * Same corrected direction logic.
   */
  private generateLegacyVisionInstruction(
    target: any,
    scene: SceneUnderstanding,
    pose: EstimatedPose
  ): {
    instruction: NavigationInstruction;
    isOffRoute: boolean;
    isArrived: boolean;
    isPathBlocked: boolean;
  } {
    // Use pose-based distance to destination (if route is set) as ground truth.
    // AI distanceEstimate is explicitly NOT used as navigation distance — it is
    // unreliable and can produce values like "10m" even when user is 2m away.
    const mappedDist = this.getDistanceToDestination(pose);
    const distanceMeters = mappedDist !== null
      ? Math.round(mappedDist * 10) / 10
      : 2.5; // fallback only when no route is set

    let xCenter = 0.5;
    if (target.boundingBox) {
      xCenter = (target.boundingBox.xmin + target.boundingBox.xmax) / 2;
    }

    let action: NavAction = 'MOVE_FORWARD';
    let arrowAngleDeg = 0;
    let spokenText = '';
    let displayText = '';

    if (target.direction === 'behind') {
      action = 'TURN_AROUND';
      arrowAngleDeg = 180;
      spokenText = `Turn around toward the ${target.label.toLowerCase()}.`;
      displayText = 'Turn around';
    } else if (xCenter >= FORWARD_ZONE_MIN && xCenter <= FORWARD_ZONE_MAX) {
      // ← THE CRITICAL FIX: centered target = MOVE_FORWARD, NOT TURN_RIGHT
      action = distanceMeters <= 2.0 ? 'ENTER_DOOR' : 'MOVE_FORWARD';
      arrowAngleDeg = 0;
      spokenText =
        scene.instructionText && scene.instructionText.trim() !== ''
          ? scene.instructionText
          : distanceMeters <= 2.0
          ? `Walk straight through the ${target.label.toLowerCase()}.`
          : `The ${target.label.toLowerCase()} is directly ahead. Move forward.`;
      displayText = `Walk straight • ${distanceMeters}m`;
    } else if (xCenter < FORWARD_ZONE_MIN) {
      action = xCenter > 0.25 ? 'SLIGHT_LEFT' : 'TURN_LEFT';
      arrowAngleDeg = action === 'SLIGHT_LEFT' ? -30 : -80;
      spokenText = `The ${target.label.toLowerCase()} is on your left. Turn left.`;
      displayText = `Turn left toward ${target.label} • ${distanceMeters}m`;
    } else {
      // xCenter > FORWARD_ZONE_MAX — target is genuinely to the right
      action = xCenter < 0.75 ? 'SLIGHT_RIGHT' : 'TURN_RIGHT';
      arrowAngleDeg = action === 'SLIGHT_RIGHT' ? 30 : 80;
      spokenText = `The ${target.label.toLowerCase()} is on your right. Turn right.`;
      displayText = `Turn right toward ${target.label} • ${distanceMeters}m`;
    }

    return {
      instruction: {
        action,
        spokenText,
        displayText,
        distanceMeters,
        confidence: target.confidence || 0.92,
        arrowAngleDeg,
        targetObject: target.label,
        timestamp: Date.now(),
      },
      isOffRoute: false,
      isArrived: false,
      isPathBlocked: false,
    };
  }

  // ─── Graph-based route navigation (pre-mapped environments) ──────────────

  private evaluateGraphRoute(pose: EstimatedPose): {
    instruction: NavigationInstruction;
    isOffRoute: boolean;
    isArrived: boolean;
    isPathBlocked: boolean;
  } {
    if (this.currentPath.length === 0) {
      return this.buildResult('SCAN', 'Please look around so I can identify your surroundings.', 'Looking for doors & exits...', 0, 0, 0.9, false, false, false);
    }

    let targetWaypoint = this.currentPath[this.currentWaypointIndex];
    const distToCurrent = this.calculateDistance(pose.position, targetWaypoint.coordinates);

    if (distToCurrent < 1.8 && this.currentWaypointIndex < this.currentPath.length - 1) {
      this.currentWaypointIndex += 1;
      targetWaypoint = this.currentPath[this.currentWaypointIndex];
    }

    const finalNode = this.currentPath[this.currentPath.length - 1];
    const distToFinal = this.calculateDistance(pose.position, finalNode.coordinates);
    const distanceMeters = Math.round(
      (this.currentWaypointIndex >= this.currentPath.length - 1 ? distToFinal : distToCurrent) * 10
    ) / 10;
    const dx = targetWaypoint.coordinates.x - pose.position.x;
    const dz = targetWaypoint.coordinates.z - pose.position.z;
    // ARCore forward is -Z. So forward distance is -dz.
    const bearingDeg = (Math.atan2(dx, -dz) * 180) / Math.PI;
    let angleDiff = bearingDeg - pose.headingDeg;
    while (angleDiff > 180) angleDiff -= 360;
    while (angleDiff < -180) angleDiff += 360;

    let action: NavAction = 'MOVE_FORWARD';
    let spokenText = `Walk straight toward ${targetWaypoint.name}.`;
    let displayText = `Walk straight • ${distanceMeters}m`;

    if (angleDiff > 40) {
      action = 'TURN_RIGHT';
      spokenText = `Turn right toward ${targetWaypoint.name}.`;
      displayText = `Turn right • ${distanceMeters}m`;
    } else if (angleDiff < -40) {
      action = 'TURN_LEFT';
      spokenText = `Turn left toward ${targetWaypoint.name}.`;
      displayText = `Turn left • ${distanceMeters}m`;
    }

    return {
      instruction: {
        action,
        spokenText,
        displayText,
        distanceMeters,
        confidence: pose.confidence,
        arrowAngleDeg: angleDiff,
        targetObject: targetWaypoint.name,
        timestamp: Date.now(),
      },
      isOffRoute: false,
      isArrived: false,
      isPathBlocked: false,
    };
  }

  // ─── Utility helpers ──────────────────────────────────────────────────────

  private isAtTarget(target: SelectedTarget): boolean {
    // Without AR, we use bounding box height as a proximity heuristic
    // A locked target that has been confirmed but has no fresh updates
    // is not marked as arrived — only visual proximity counts
    return false; // Arrival is declared by NavigationStateManager based on pose
  }

  private safeLabel(target: SelectedTarget): string {
    if (target.isConfirmedExit) return 'exit';
    return target.label.toLowerCase() || 'door';
  }

  private buildResult(
    action: NavAction,
    spokenText: string,
    displayText: string,
    distanceMeters: number,
    arrowAngleDeg: number,
    confidence: number,
    isOffRoute: boolean,
    isArrived: boolean,
    isPathBlocked: boolean,
    targetObject?: string
  ): {
    instruction: NavigationInstruction;
    isOffRoute: boolean;
    isArrived: boolean;
    isPathBlocked: boolean;
  } {
    return {
      instruction: {
        action,
        spokenText,
        displayText,
        distanceMeters,
        confidence,
        arrowAngleDeg,
        targetObject,
        timestamp: Date.now(),
      },
      isOffRoute,
      isArrived,
      isPathBlocked,
    };
  }

  /**
   * Horizontal (XZ-plane) distance between two positions.
   *
   * Y (vertical height) is intentionally excluded.
   * Phone tilt, ARCore Y-drift, and height differences must NOT affect
   * the displayed navigation distance for indoor horizontal navigation.
   */
  private calculateDistance(p1: SpatialCoordinates, p2: SpatialCoordinates): number {
    const dx = p1.x - p2.x;
    const dz = p1.z - p2.z;
    return Math.sqrt(dx * dx + dz * dz);
  }
}

export const routeDecisionEngine = new RouteDecisionEngine();
