// ─────────────────────────────────────────────────────────────────────────────
// NavigationStateManager — Central navigation orchestrator
//
// KEY CHANGES FROM OLD VERSION:
//
// 1. Removed: setInterval every 3.5s → replaced with event-driven FrameAnalysisScheduler
// 2. Added: sceneVersion counter (increment on meaningful pose/scene change)
// 3. Added: SceneVersionGuard — stale AI responses are discarded
// 4. Fixed: Voice calls only fire on instruction change, not every pose update
// 5. Added: TemporalSceneMemory integration — confirmed-only objects enter navigation
// 6. Added: TargetSelectionEngine integration — best target locked, not first found
// 7. Added: InstructionStabilityController — instructions stabilize before speaking
// ─────────────────────────────────────────────────────────────────────────────

import {
  NavigationState,
  NavAction,
  NavigationInstruction,
  EstimatedPose,
  SceneUnderstanding,
  DestinationIntent,
  NavigationSessionSummary,
} from './types';
import { positionEstimator } from './PositionEstimator';
import { localSpatialMap } from './LocalSpatialMap';
import { routeDecisionEngine } from './RouteDecisionEngine';
import { voiceNavigationService } from './VoiceNavigationService';
import { hapticFeedbackService } from './HapticFeedbackService';
import { spatialTrackingProvider } from './SpatialTrackingProvider';
import { visionModelProvider } from './VisionModelProvider';
import { temporalSceneMemory } from './TemporalSceneMemory';
import { targetSelectionEngine } from './TargetSelectionEngine';
import { instructionStabilityController } from './InstructionStabilityController';
import { frameAnalysisScheduler, AnalysisRequest } from './FrameAnalysisScheduler';
import { ArrivalConfirmationController } from './ArrivalConfirmationController';
import {
  ARRIVAL_CONFIRMATION_FRAMES,
  ARRIVAL_THRESHOLD_METERS,
  GUIDANCE_NAV_STATES,
  POSE_STALE_MS,
  STABLE_CONFIDENCE_THRESHOLD,
  MOVEMENT_DETECTION_THRESHOLD_M,
} from './navigationConstants';
import { DoorState, VisualVerification } from './types';
import { geminiLiveNavService, NavCue } from './GeminiLiveNavService';

const DEBUG_AR_NAV = true;

// Minimum heading change (degrees) to trigger a new vision analysis
const HEADING_CHANGE_THRESHOLD_DEG = 25;
// Minimum distance (meters) walked to trigger a new vision analysis
const DISTANCE_CHANGE_THRESHOLD_M = 3.0;
// Min confidence to issue navigation instruction (vs. scan)
const MIN_NAV_CONFIDENCE = 0.55;

export class NavigationStateManager {
  private state: NavigationState = 'IDLE';
  private currentInstruction: NavigationInstruction | null = null;
  private currentScene: SceneUnderstanding | null = null;
  private currentDestination: DestinationIntent | null = null;

  private sessionId: string = '';
  private sessionStartTime: number = 0;
  private recalculationsCount: number = 0;

  // Scene versioning — increments on meaningful changes
  private sceneVersion: number = 0;

  private scanTimer: any = null;
  private geminiFrameTimer: any = null;
  private frameProvider: (() => Promise<string | null>) | null = null;

  // Last known pose snapshot for change-detection
  private lastAnalysisHeading: number = 0;
  private lastAnalysisDistance: number = 0;

  // UI Listeners
  private onStateChangeListeners: Array<(state: NavigationState) => void> = [];
  private onInstructionListeners: Array<(instruction: NavigationInstruction) => void> = [];
  private onPoseListeners: Array<(pose: EstimatedPose) => void> = [];
  private onSceneListeners: Array<(scene: SceneUnderstanding) => void> = [];
  private onArrivalListeners: Array<(summary: NavigationSessionSummary) => void> = [];
  private arrivalConfirmation = new ArrivalConfirmationController();
  private lastLoggedState: NavigationState | null = null;

  // ─── Translation / Rotation Tracking ────────────────────────────────────
  /** Position snapshot from the previous handlePoseUpdate call. */
  private lastPosePosition: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
  /** Raw translation delta (meters) computed each pose update. */
  private lastTranslationDeltaM: number = 0;

  // ─── Log Rate Limiting ────────────────────────────────────────────────────
  private lastNavLogTimestamp: number = 0;
  private lastLoggedDistance: number = -1;
  private readonly NAV_LOG_INTERVAL_MS = 2000;
  private readonly NAV_LOG_DISTANCE_CHANGE_M = 0.15;
  
  // ─── Gemini Live ──────────────────────────────────────────────────────────
  private lastNavCueTime: number = 0;
  private readonly CUE_DEBOUNCE_MS = 500;

  // Whether Gemini has ever produced a real visual cue in this session
  private geminiHasProducedCue: boolean = false;
  private lastGeminiCue: NavCue | null = null;

  // Prevent overlapping frame captures
  private isSendingFrame: boolean = false;

  // Gemini status listeners
  private onGeminiCueListeners: Array<(cue: NavCue) => void> = [];
  private onGeminiConnectedListeners: Array<() => void> = [];
  private onGeminiDisconnectedListeners: Array<() => void> = [];

  // ─── Visual Verification ─────────────────────────────────────────────────
  /** Most recent structured door-state result from Gemini visual inspection. */
  private lastVisualVerification: VisualVerification | null = null;

  // ─── Public API ─────────────────────────────────────────────────────────

  public getState(): NavigationState { return this.state; }
  public getCurrentInstruction(): NavigationInstruction | null { return this.currentInstruction; }
  public getCurrentScene(): SceneUnderstanding | null { return this.currentScene; }
  public getSessionId(): string { return this.sessionId; }

  /** True if Gemini has produced at least one real visual navigation cue this session. */
  public hasGeminiCue(): boolean { return this.geminiHasProducedCue; }
  public getLastGeminiCue(): NavCue | null { return this.lastGeminiCue; }

  public subscribeGeminiCue(listener: (cue: NavCue) => void): () => void {
    this.onGeminiCueListeners.push(listener);
    return () => { this.onGeminiCueListeners = this.onGeminiCueListeners.filter(l => l !== listener); };
  }

  public subscribeGeminiConnected(listener: () => void): () => void {
    this.onGeminiConnectedListeners.push(listener);
    return () => { this.onGeminiConnectedListeners = this.onGeminiConnectedListeners.filter(l => l !== listener); };
  }

  public subscribeGeminiDisconnected(listener: () => void): () => void {
    this.onGeminiDisconnectedListeners.push(listener);
    return () => { this.onGeminiDisconnectedListeners = this.onGeminiDisconnectedListeners.filter(l => l !== listener); };
  }

  public setFrameProvider(provider: () => Promise<string | null>): void {
    this.frameProvider = provider;
  }

  /**
   * Initialize a navigation session.
   */
  public async startSession(
    destinationQuery?: string,
    frameProvider?: () => Promise<string | null>,
    language: string = 'English'
  ): Promise<void> {
    if (frameProvider) this.frameProvider = frameProvider;

    this.sessionId = `nav_${Date.now()}`;
    this.sessionStartTime = Date.now();
    this.recalculationsCount = 0;
    this.sceneVersion = 1;
    this.geminiHasProducedCue = false;
    this.lastGeminiCue = null;
    this.isSendingFrame = false;

    // Reset all sub-systems
    temporalSceneMemory.reset();
    targetSelectionEngine.clearLock();
    instructionStabilityController.reset();
    frameAnalysisScheduler.reset();
    this.arrivalConfirmation.reset();
    this.currentInstruction = null;
    positionEstimator.reset({ x: 0, y: 0, z: 0 });

    this.setState('SCANNING');
    await voiceNavigationService.speak('Slowly look around so I can understand your surroundings.', true);

    await positionEstimator.startTracking(
      (pose) => this.handlePoseUpdate(pose),
      (status) => {
        if (this.state === 'ARRIVED') return;
        if (status === 'LOST' && this.isActiveNavState()) {
          if (DEBUG_AR_NAV) console.log('[AR NAV] LOW_CONFIDENCE - arrival confirmation reset');
          this.arrivalConfirmation.reset();
          this.handleTrackingLost();
        }
      }
    );
    // Removed duplicate spatialTrackingProvider.start() since PositionEstimator handles it

    // Gemini Live Integration
    geminiLiveNavService.removeAllListeners('nav_cue');
    geminiLiveNavService.removeAllListeners('connected');
    geminiLiveNavService.removeAllListeners('disconnected');
    geminiLiveNavService.on('nav_cue', this.handleGeminiNavCue);
    geminiLiveNavService.on('connected', () => {
      this.onGeminiConnectedListeners.forEach(l => l());
    });
    geminiLiveNavService.on('disconnected', () => {
      this.onGeminiDisconnectedListeners.forEach(l => l());
    });
    geminiLiveNavService.startSession(language);

    // Camera frame timer — 1 fps to Gemini Live
    this.geminiFrameTimer = setInterval(async () => {
      if (this.state === 'IDLE' || this.state === 'ARRIVED') return;
      if (!this.frameProvider) return;
      if (this.isSendingFrame) return; // Prevent overlapping captures

      this.isSendingFrame = true;
      try {
        const base64Jpeg = await this.frameProvider();
        if (base64Jpeg) {
          geminiLiveNavService.sendVideoFrame(base64Jpeg);
        }
      } catch (e) {
        console.warn('[GeminiLiveNav] Frame capture failed:', e);
      } finally {
        this.isSendingFrame = false;
      }
    }, 1000); // 1 fps

    // Initial scan: analyze after 2.8s so user has time to look around
    this.scanTimer = setTimeout(async () => {
      await this.completeInitialScan(destinationQuery || 'nearest exit');
    }, 2800);
  }

  private async completeInitialScan(destinationQuery: string): Promise<void> {
    this.setState('LOCALIZING');
    this.currentDestination = this.parseDestination(destinationQuery);

    // First vision analysis — INITIAL_SCAN trigger
    await this.scheduleAnalysis('INITIAL_SCAN');

    // ── Local graph route setup ───────────────────────────────────────────
    // IMPORTANT: Do NOT set a fake relative destination here.
    // The old code called setDestinationRelative(0, 3.0, ...) which created a
    // ghost node 3m ahead, causing the RouteDecisionEngine to immediately
    // emit 'TURN RIGHT · 3m · Main Exit' before Gemini saw a single frame.
    //
    // Instead, we only set up a graph route if the local spatial map has
    // real pre-mapped nodes for the target (station concourse, etc.).
    // If not, the UI shows 'Analyzing surroundings...' until Gemini responds.

    const startNode = localSpatialMap.findNearestNode(positionEstimator.getPose().position) || localSpatialMap.getAllNodes()[0];
    const targetNode = localSpatialMap.findTargetNode(
      this.currentDestination.targetLabel,
      this.currentDestination.preferences
    );
    if (startNode && targetNode && startNode.id !== targetNode.id) {
      const path = localSpatialMap.calculatePath(startNode.id, targetNode.id, this.currentDestination.preferences);
      routeDecisionEngine.setRoute(path);
    }

    this.setState('NAVIGATING');
    // Do NOT call evaluateNavigationStep() here — no Gemini cue yet,
    // so any instruction produced would be speculative (local graph only).
    // The UI will show the neutral 'Analyzing surroundings...' state.
  }

  /**
   * Evaluate the current navigation state and produce an instruction.
   * Called on pose updates — but VOICE only fires on instruction change.
   */
  public evaluateNavigationStep(): void {
    if (this.state === 'ARRIVED') return;
    if (!this.isActiveNavState()) return;

    const pose = positionEstimator.getPose();
    const confirmedObjects = temporalSceneMemory.getConfirmedObjects();
    const distToFinal = routeDecisionEngine.getDistanceToDestination(pose);
    const visualTarget = this.lastVisualVerification;

    // ── Periodic diagnostic log (rate-limited) ──────────────────────────────
    if (DEBUG_AR_NAV) {
      const now = Date.now();
      const distToFinalForLog = routeDecisionEngine.getDistanceToDestination(pose);
      const distChanged = distToFinalForLog !== null &&
        Math.abs(distToFinalForLog - this.lastLoggedDistance) > this.NAV_LOG_DISTANCE_CHANGE_M;
      if ((now - this.lastNavLogTimestamp > this.NAV_LOG_INTERVAL_MS) || distChanged) {
        this.lastNavLogTimestamp = now;
        this.lastLoggedDistance = distToFinalForLog ?? -1;
        console.log(
          `[NAV DISTANCE] distance=${distToFinalForLog !== null ? distToFinalForLog.toFixed(2) + 'm' : 'n/a'}` +
          ` pos=(${pose.position.x.toFixed(3)},${pose.position.z.toFixed(3)})` +
          ` heading=${pose.headingDeg.toFixed(1)}°` +
          ` rotating=${positionEstimator.isRotating}` +
          ` confidence=${pose.confidence.toFixed(2)}`
        );
        if (this.state !== this.lastLoggedState) {
          console.log(`[NAV STATE] ${this.lastLoggedState} → ${this.state}`);
          this.lastLoggedState = this.state;
        }
      }
    }

    if (pose.confidence < STABLE_CONFIDENCE_THRESHOLD || pose.trackingStatus === 'LOST') {
      if (DEBUG_AR_NAV) console.log('[AR NAV] LOW_CONFIDENCE - arrival confirmation reset');
      this.arrivalConfirmation.reset();
      this.handleLowConfidence();
      return;
    }

    if (this.state === 'LOW_CONFIDENCE' || this.state === 'TRACKING_LOST') {
      this.setState('LOCALIZING');
      this.setState('NAVIGATING');
    }

    // Run target selection with confirmed objects
    if (confirmedObjects.length > 0) {
      targetSelectionEngine.selectTarget(confirmedObjects, this.currentDestination);
    }

    const result = routeDecisionEngine.evaluateWithConfirmedObjects(
      pose,
      confirmedObjects,
      targetSelectionEngine.getLockedTarget(),
      this.currentScene
    );

    const isNearDestination = distToFinal !== null && distToFinal <= ARRIVAL_THRESHOLD_METERS;

    if (
      isNearDestination &&
      pose.confidence >= STABLE_CONFIDENCE_THRESHOLD
    ) {
      if (this.state !== 'ARRIVAL_CANDIDATE') {
        if (DEBUG_AR_NAV) console.log('[AR NAV] ARRIVAL_CANDIDATE');
        this.setState('ARRIVAL_CANDIDATE');
      }

      const tickResult = this.arrivalConfirmation.evaluate({
        isNearDestination,
        isTrackingStable: true,
        isPoseFresh: this.arrivalConfirmation.isPoseFresh(pose),
        isDestinationConfirmed: true,
        distanceMeters: distToFinal,
        confidence: pose.confidence,
      });

      if (tickResult === 'confirmed') {
        if (DEBUG_AR_NAV) console.log('[AR NAV] ARRIVED_CONFIRMED');
        this.currentInstruction = {
          ...result.instruction,
          action: 'ARRIVED',
          confidence: pose.confidence,
          spokenText: 'You have arrived at your destination.',
          displayText: '🎯 You have arrived!',
        };
        this.handleArrival();
        return;
      }
    } else {
      this.arrivalConfirmation.reset();
      if (this.state === 'ARRIVAL_CANDIDATE') {
        this.setState('NAVIGATING');
      }
    }

    // 2. Off-route
    if (result.isOffRoute && this.state !== 'OFF_ROUTE') {
      this.handleOffRoute();
      return;
    }

    // 3. Path blocked
    if (result.isPathBlocked && this.state !== 'REROUTING') {
      this.handlePathBlocked();
      return;
    }

    // Normal navigation — route through stability controller
    const stabilityResult = instructionStabilityController.propose(result.instruction);
    if (!stabilityResult) return;

    const { instruction, shouldSpeak } = stabilityResult;
    this.currentInstruction = instruction;
    this.notifyInstructionListeners(instruction);

    if (shouldSpeak) {
      if (instruction.action === 'TURN_LEFT') {
        this.setState('TURNING');
        hapticFeedbackService.triggerTurnLeft();
      } else if (instruction.action === 'TURN_RIGHT') {
        this.setState('TURNING');
        hapticFeedbackService.triggerTurnRight();
      } else if (instruction.action === 'TURN_AROUND') {
        this.setState('TURNING');
      } else if (instruction.distanceMeters <= 2.0 && instruction.distanceMeters > 0) {
        if (this.state !== 'APPROACHING_TARGET') {
          this.setState('APPROACHING_TARGET');
          // Schedule door-state inspection when we first enter the approach zone
          this.scheduleTargetInspection();
        }
      } else if (this.state !== 'ARRIVAL_CANDIDATE') {
        this.setState('NAVIGATING');
      }
      voiceNavigationService.speak(instruction.spokenText);
    }
  }

  /**
   * Public: update the visual verification from an external async inspection.
   * Called by scheduleTargetInspection after Gemini responds.
   */
  public updateVisualVerification(result: VisualVerification): void {
    this.lastVisualVerification = result;

    if (DEBUG_AR_NAV) {
      console.log('[AR DEBUG] visualVerification', JSON.stringify({
        targetVisible: result.targetVisible,
        doorState: result.doorState,
        confidence: result.confidence,
        evidence: result.evidence,
      }));
    }

    // Issue door-state voice instruction — NEVER triggers ARRIVED
    if (result.targetVisible && result.confidence >= 0.6) {
      if (result.doorState === 'CLOSED') {
        const label = result.label || this.currentDestination?.targetLabel || 'destination';
        voiceNavigationService.speak(`${label} is ahead. Please open the door.`);
      } else if (result.doorState === 'OPEN') {
        voiceNavigationService.speak('Door is open. Continue ahead.');
      }
    }
  }

  /**
   * Schedule a one-off visual target inspection via Gemini.
   * Runs asynchronously. Result is fed into updateVisualVerification().
   * Rate-limited: only fires if a frame is available.
   */
  private scheduleTargetInspection(): void {
    if (!this.frameProvider || !this.currentDestination) return;

    this.frameProvider().then((imageBase64) => {
      if (!imageBase64) return;
      visionModelProvider.inspectTargetVisibility({
        imageBase64,
        destinationLabel: this.currentDestination!.targetLabel,
      }).then((result) => {
        this.updateVisualVerification(result);
      }).catch(() => {/* network failure — ignore */});
    }).catch(() => {});
  }

  /**
   * Handle incoming pose update from PositionEstimator.
   *
   * KEY CHANGE: Translation and rotation are now separated.
   * - Only re-evaluate navigation if the user has actually MOVED
   *   (translationDelta > MOVEMENT_DETECTION_THRESHOLD_M)
   *   OR if a minimum time has elapsed (to allow heading-driven arrow updates).
   * - Rotation-only updates update the arrow heading but do NOT advance
   *   waypoint index, distance-to-destination, or arrival confirmation.
   */
  private handlePoseUpdate(pose: EstimatedPose): void {
    this.notifyPoseListeners(pose);

    if (!this.isActiveNavState()) return;

    // Compute horizontal (XZ-plane) translation delta from last known position.
    // Y (vertical height) is intentionally excluded — phone tilt must not
    // influence whether we classify a frame as movement or rotation.
    const dp = this.lastPosePosition;
    const dx = pose.position.x - dp.x;
    const dz = pose.position.z - dp.z;
    const translationDeltaM = Math.sqrt(dx * dx + dz * dz);
    this.lastTranslationDeltaM = translationDeltaM;

    // ── Rotation-only frame guard ──────────────────────────────────────────
    // A frame is rotation-only if:
    //   - positionEstimator classified it as rotating (rotDelta > 5° AND hDelta < 0.03m)
    //   - AND the computed position change is below the movement threshold
    // Skip full nav re-evaluation on rotation-only frames to prevent
    // heading changes from altering the displayed distance.
    const isRotationOnlyFrame =
      positionEstimator.isRotating && translationDeltaM < MOVEMENT_DETECTION_THRESHOLD_M;

    if (!isRotationOnlyFrame) {
      // Real movement detected — update position snapshot and re-evaluate
      this.lastPosePosition = { ...pose.position };
      this.evaluateNavigationStep();
    }
    // NOTE: even on rotation-only frames, pose listeners receive the update
    // so the AR arrow direction indicator rotates correctly with heading.

    // Trigger new vision analysis if user has rotated OR moved significantly
    const headingDelta = Math.abs(pose.headingDeg - this.lastAnalysisHeading);
    const normalizedDelta = Math.min(headingDelta, 360 - headingDelta);
    const distanceDelta = pose.distanceWalkedMeters - this.lastAnalysisDistance;

    if (normalizedDelta > HEADING_CHANGE_THRESHOLD_DEG || distanceDelta > DISTANCE_CHANGE_THRESHOLD_M) {
      this.lastAnalysisHeading = pose.headingDeg;
      this.lastAnalysisDistance = pose.distanceWalkedMeters;
      this.sceneVersion += 1;
      this.scheduleAnalysis('SCENE_CHANGED');
    }
  }

  // ─── Vision Analysis ──────────────────────────────────────────────────────

  /**
   * Schedule an AI vision analysis via the FrameAnalysisScheduler.
   * Returns immediately — analysis runs asynchronously.
   */
  public async scheduleAnalysis(trigger: import('./FrameAnalysisScheduler').AnalysisTrigger): Promise<void> {
    if (!this.frameProvider) return;

    const capturedVersion = this.sceneVersion;
    const capturedSessionId = this.sessionId;

    await frameAnalysisScheduler.scheduleAnalysis(
      {
        trigger,
        sceneVersion: capturedVersion,
        sessionId: capturedSessionId,
        frameProvider: this.frameProvider,
        onComplete: (scene: SceneUnderstanding, request: AnalysisRequest) => {
          this.handleSceneResult(scene, request);
        },
        onError: (_error: Error, request: AnalysisRequest) => {
          // Network error — analysis failed, do nothing (keep current state)
        },
      },
      async (imageBase64: string | undefined, request: AnalysisRequest) => {
        return visionModelProvider.analyzeScene({
          imageBase64,
          destination: this.currentDestination?.targetLabel,
          currentPose: positionEstimator.getPose(),
          request,
        });
      }
    );
  }

  /**
   * Handle a completed scene analysis result.
   * Validates scene version to discard stale responses.
   */
  private handleSceneResult(scene: SceneUnderstanding, request: AnalysisRequest): void {
    // SCENE VERSION GUARD — discard if stale or from different session
    if (scene.sessionId && scene.sessionId !== this.sessionId) return;
    if (scene.sceneVersion !== undefined && scene.sceneVersion !== this.sceneVersion) {
      // Stale response — the scene has changed since this was requested
      return;
    }

    this.currentScene = scene;
    this.notifySceneListeners(scene);

    // Feed raw detections into TemporalSceneMemory for multi-frame confirmation
    if (scene.objects && scene.objects.length > 0) {
      temporalSceneMemory.ingestFrame(scene.objects);
    }

    // Register spatial landmarks for position correction
    if (scene.objects) {
      scene.objects.forEach((obj) => localSpatialMap.registerObservedLandmark(obj));
    }

    // Re-evaluate navigation with the updated confirmed object set
    if (this.isActiveNavState()) {
      // 1. Handle Relocalization
      if (request.trigger === 'RELOCALIZE') {
        let snapped = false;
        
        for (const obj of scene.objects || []) {
          const matchedNode = localSpatialMap.getAllNodes().find(node => {
            if (node.name.toLowerCase() === obj.label.toLowerCase()) return true;
            if (node.visualAnchors && node.visualAnchors.some(a => a.toLowerCase() === obj.label.toLowerCase())) return true;
            return false;
          });
          
          if (matchedNode) {
            positionEstimator.updateWithVisualAnchor(matchedNode.coordinates, obj.confidence);
            snapped = true;
            if (DEBUG_AR_NAV) console.log(`[AR NAV] Relocalized to ${matchedNode.name}`);
            voiceNavigationService.speak(`Position recovered at ${matchedNode.name}. Resuming navigation.`);
            break;
          }
        }
        
        if (snapped) {
          this.setState('NAVIGATING');
        } else {
          voiceNavigationService.speak('Still looking for landmarks. Keep turning slowly.');
        }
      }

      this.evaluateNavigationStep();

      // If we're in a scan/low-confidence state and found something, transition
      if (
        (this.state === 'SCANNING' || this.state === 'LOW_CONFIDENCE' || this.state === 'RECOVERY') &&
        temporalSceneMemory.getConfirmedObjects().length > 0
      ) {
        this.setState('NAVIGATING');
      }
    }
  }

  // ─── State transitions ────────────────────────────────────────────────────

  private handleArrival(): void {
    this.setState('ARRIVED');
    hapticFeedbackService.triggerArrival();
    targetSelectionEngine.markArrived();
    instructionStabilityController.reset();

    const targetName = routeDecisionEngine.getTargetNode()?.name || 'your destination';
    voiceNavigationService.speak(`You have arrived at ${targetName}.`, true);

    const pose = positionEstimator.getPose();
    const summary: NavigationSessionSummary = {
      sessionId: this.sessionId,
      destination: this.currentDestination?.targetLabel || targetName,
      startTime: this.sessionStartTime,
      endTime: Date.now(),
      durationSeconds: Math.round((Date.now() - this.sessionStartTime) / 1000),
      distanceMeters: Math.round(pose.distanceWalkedMeters * 10) / 10,
      stepsTaken: pose.stepCount,
      recalculationsCount: this.recalculationsCount,
    };
    this.notifyArrivalListeners(summary);
  }

  private handleOffRoute(): void {
    this.setState('OFF_ROUTE');
    this.recalculationsCount += 1;
    hapticFeedbackService.triggerOffRoute();
    this.sceneVersion += 1;

    const priority = instructionStabilityController.forcePriority({
      action: 'REROUTE',
      spokenText: 'You moved away from the route. Recalculating.',
      displayText: '↻ Recalculating...',
      distanceMeters: 0,
      confidence: 0.95,
      arrowAngleDeg: 0,
      timestamp: Date.now(),
    });
    voiceNavigationService.speak(priority.instruction.spokenText, true);

    setTimeout(() => { this.recalculateRoute(); }, 1400);
  }

  private handlePathBlocked(): void {
    this.setState('REROUTING');
    this.recalculationsCount += 1;
    hapticFeedbackService.triggerOffRoute();
    this.sceneVersion += 1;

    const priority = instructionStabilityController.forcePriority({
      action: 'PATH_BLOCKED',
      spokenText: 'The path ahead is blocked. Recalculating alternative path.',
      displayText: '⚠️ Path Blocked',
      distanceMeters: 0,
      confidence: 0.95,
      arrowAngleDeg: 0,
      timestamp: Date.now(),
    });
    voiceNavigationService.speak(priority.instruction.spokenText, true);

    setTimeout(() => { this.recalculateRoute(); }, 1200);
  }

  private handleTrackingLost(): void {
    this.setState('TRACKING_LOST');
    this.sceneVersion += 1;
    temporalSceneMemory.reset();
    targetSelectionEngine.clearLock();
    instructionStabilityController.reset();

    const priority = instructionStabilityController.forcePriority({
      action: 'RELOCALIZE',
      spokenText: 'I lost the visual position. Please slowly look around.',
      displayText: '🧭 Please look around',
      distanceMeters: 0,
      confidence: 0.5,
      arrowAngleDeg: 0,
      timestamp: Date.now(),
    });
    voiceNavigationService.speak(priority.instruction.spokenText, true);
    this.notifyInstructionListeners(priority.instruction);

    // Trigger relocalization analysis
    setTimeout(() => { this.scheduleAnalysis('RELOCALIZE'); }, 1000);
  }

  private handleLowConfidence(): void {
    if (this.state === 'LOW_CONFIDENCE' || this.state === 'TRACKING_LOST') return;
    this.setState('LOW_CONFIDENCE');

    const priority = instructionStabilityController.forcePriority({
      action: 'SCAN',
      spokenText: 'Please slowly turn the camera so I can relocate you.',
      displayText: '🧭 Please look around',
      distanceMeters: 0,
      confidence: 0.5,
      arrowAngleDeg: 0,
      timestamp: Date.now(),
    });
    voiceNavigationService.speak(priority.instruction.spokenText);
    this.notifyInstructionListeners(priority.instruction);

    this.scheduleAnalysis('LOW_CONFIDENCE');
  }

  public recalculateRoute(): void {
    const pose = positionEstimator.getPose();
    const nearestNode = localSpatialMap.findNearestNode(pose.position);
    const targetNode = routeDecisionEngine.getTargetNode() ||
      localSpatialMap.findTargetNode(this.currentDestination?.targetLabel || 'exit');

    if (nearestNode && targetNode) {
      const newPath = localSpatialMap.calculatePath(nearestNode.id, targetNode.id, this.currentDestination?.preferences);
      routeDecisionEngine.setRoute(newPath);
    }

    this.setState('NAVIGATING');
    this.evaluateNavigationStep();
  }

  // ─── Public controls ──────────────────────────────────────────────────────

  public setDestination(
    query: string,
    preferences?: { avoidStairs?: boolean; preferLift?: boolean; isEmergency?: boolean }
  ): void {
    this.currentDestination = this.parseDestination(query, preferences);
    targetSelectionEngine.clearLock(); // New destination = new target
    instructionStabilityController.reset();
    this.sceneVersion += 1;

    const pose = positionEstimator.getPose();
    const startNode = localSpatialMap.findNearestNode(pose.position) || localSpatialMap.getAllNodes()[0];
    const targetNode = localSpatialMap.findTargetNode(this.currentDestination.targetLabel, this.currentDestination.preferences);

    if (startNode && targetNode) {
      const path = localSpatialMap.calculatePath(startNode.id, targetNode.id, this.currentDestination.preferences);
      routeDecisionEngine.setRoute(path);
      this.setState('NAVIGATING');
      this.evaluateNavigationStep();
    }

    // Trigger immediate re-analysis for new destination
    this.scheduleAnalysis('TARGET_SEARCH');
  }

  public triggerEmergencyExit(): void {
    this.setDestination('emergency exit', { isEmergency: true, avoidStairs: false, preferLift: false });
    voiceNavigationService.speak('Emergency exit routing activated. Follow the directional arrow to the nearest exit.', true);
  }

  /**
   * Manually trigger a vision analysis (e.g. user pressed a button).
   */
  public async triggerVisionAnalysis(): Promise<void> {
    this.sceneVersion += 1;
    await this.scheduleAnalysis('USER_REQUESTED');
  }

  public endSession(): void {
    this.setState('IDLE');
    if (this.scanTimer) clearTimeout(this.scanTimer);
    if (this.geminiFrameTimer) clearInterval(this.geminiFrameTimer);
    frameAnalysisScheduler.reset();
    temporalSceneMemory.reset();
    targetSelectionEngine.clearLock();
    instructionStabilityController.reset();
    positionEstimator.stopTracking();
    spatialTrackingProvider.stop();
    voiceNavigationService.stop();
    geminiLiveNavService.stopSession();
  }

  private handleGeminiNavCue = (cue: NavCue) => {
    const now = Date.now();
    if (now - this.lastNavCueTime < this.CUE_DEBOUNCE_MS) {
      return; // Debounce — ignore rapid duplicate cues
    }

    // Skip low-confidence Gemini cues (Gemini itself isn't sure)
    if (cue.confidence === 'low') {
      if (DEBUG_AR_NAV) console.log('[GeminiLiveNav] Skipped low-confidence cue');
      return;
    }

    this.lastNavCueTime = now;

    // Mark that Gemini has produced a real visual cue — UI transitions from
    // 'Analyzing surroundings...' to showing the Gemini direction card.
    this.geminiHasProducedCue = true;
    this.lastGeminiCue = cue;

    // Notify Gemini cue subscribers (CameraNavigationScreen)
    this.onGeminiCueListeners.forEach(l => l(cue));

    // Map Gemini direction to NavigationInstruction
    let action: NavAction = 'MOVE_FORWARD';
    let arrowAngleDeg = 0;
    if (cue.direction === 'left') {
      action = 'TURN_LEFT';
      arrowAngleDeg = -90;
    } else if (cue.direction === 'right') {
      action = 'TURN_RIGHT';
      arrowAngleDeg = 90;
    } else if (cue.direction === 'back') {
      action = 'TURN_AROUND';
      arrowAngleDeg = 180;
    } else if (cue.direction === 'stop') {
      action = 'STOP';
      arrowAngleDeg = 0;
    }

    // Use Gemini's reason text as the display/spoken text
    const displayText = cue.reason
      ? `${cue.reason}`
      : action === 'STOP' ? 'Stop' : action.replace(/_/g, ' ').toLowerCase();
    const spokenText = cue.reason ?? (action === 'STOP' ? 'Please stop' : 'Continue forward');

    const instruction: NavigationInstruction = {
      action,
      spokenText,
      displayText,
      distanceMeters: 0, // Distance comes from local spatial map, not Gemini
      confidence: cue.confidence === 'high' ? 0.9 : cue.confidence === 'medium' ? 0.7 : 0.5,
      arrowAngleDeg,
      timestamp: now,
      geminiDistance: cue.distance_estimate,
    };

    // This instruction is GEMINI-sourced — flag it so the UI shows the AI badge
    (instruction as any).isGeminiCue = true;
    (instruction as any).geminiConfidence = cue.confidence;

    this.currentInstruction = instruction;
    this.notifyInstructionListeners(instruction);
  }


  // ─── Destination intent parser ────────────────────────────────────────────

  public parseDestination(
    query: string,
    overrides?: { avoidStairs?: boolean; preferLift?: boolean; isEmergency?: boolean }
  ): DestinationIntent {
    const q = (query || '').toLowerCase();
    const isEmergency = Boolean(overrides?.isEmergency || q.includes('emergency'));
    const preferLift = Boolean(overrides?.preferLift || q.includes('lift') || q.includes('elevator') || q.includes('wheelchair'));
    const avoidStairs = Boolean(overrides?.avoidStairs || preferLift);

    let targetType: DestinationIntent['targetType'] = 'custom';
    let targetLabel = query || 'Nearest Exit';

    if (isEmergency) {
      targetType = 'exit'; targetLabel = 'Emergency Exit';
    } else if (q.includes('exit') || q.includes('outside') || q.includes('way out')) {
      targetType = 'exit'; targetLabel = 'Main Exit';
    } else if (q.includes('platform')) {
      targetType = 'platform';
      const match = q.match(/platform\s*(\d+)/i);
      targetLabel = match ? `Platform ${match[1]}` : 'Platform 4';
    } else if (q.includes('lift') || q.includes('elevator')) {
      targetType = 'elevator'; targetLabel = 'Passenger Lift';
    } else if (q.includes('stair') || q.includes('bridge')) {
      targetType = 'stairs'; targetLabel = 'Footover Bridge Stairs';
    } else if (q.includes('toilet') || q.includes('restroom') || q.includes('washroom')) {
      targetType = 'restroom'; targetLabel = 'Station Restroom';
    }

    return {
      rawQuery: query,
      intent: isEmergency ? 'EMERGENCY' : 'NAVIGATE',
      targetType,
      targetLabel,
      preferences: { preferLift, avoidStairs, isEmergency },
    };
  }

  // ─── Helper predicates ────────────────────────────────────────────────────

  private isActiveNavState(): boolean {
    return (
      this.state === 'NAVIGATING' ||
      this.state === 'TURNING' ||
      this.state === 'APPROACHING_TARGET' ||
      this.state === 'OFF_ROUTE' ||
      this.state === 'TARGET_LOCKED' ||
      this.state === 'LOW_CONFIDENCE' ||
      this.state === 'RECOVERY'
    );
  }

  // ─── State & Event Observers ──────────────────────────────────────────────

  private setState(newState: NavigationState): void {
    if (this.state === newState) return;
    this.state = newState;
    this.onStateChangeListeners.forEach((l) => l(newState));
  }

  public subscribeState(listener: (state: NavigationState) => void): () => void {
    this.onStateChangeListeners.push(listener);
    return () => { this.onStateChangeListeners = this.onStateChangeListeners.filter((l) => l !== listener); };
  }

  public subscribeInstruction(listener: (instruction: NavigationInstruction) => void): () => void {
    this.onInstructionListeners.push(listener);
    return () => { this.onInstructionListeners = this.onInstructionListeners.filter((l) => l !== listener); };
  }

  public subscribePose(listener: (pose: EstimatedPose) => void): () => void {
    this.onPoseListeners.push(listener);
    return () => { this.onPoseListeners = this.onPoseListeners.filter((l) => l !== listener); };
  }

  public subscribeScene(listener: (scene: SceneUnderstanding) => void): () => void {
    this.onSceneListeners.push(listener);
    return () => { this.onSceneListeners = this.onSceneListeners.filter((l) => l !== listener); };
  }

  public subscribeArrival(listener: (summary: NavigationSessionSummary) => void): () => void {
    this.onArrivalListeners.push(listener);
    return () => { this.onArrivalListeners = this.onArrivalListeners.filter((l) => l !== listener); };
  }

  private notifyInstructionListeners(inst: NavigationInstruction): void {
    this.onInstructionListeners.forEach((l) => l(inst));
  }
  private notifyPoseListeners(pose: EstimatedPose): void {
    this.onPoseListeners.forEach((l) => l(pose));
  }
  private notifySceneListeners(scene: SceneUnderstanding): void {
    this.onSceneListeners.forEach((l) => l(scene));
  }
  private notifyArrivalListeners(summary: NavigationSessionSummary): void {
    this.onArrivalListeners.forEach((l) => l(summary));
  }
}

export const navigationStateManager = new NavigationStateManager();
