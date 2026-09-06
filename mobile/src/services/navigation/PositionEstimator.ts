// ─────────────────────────────────────────────────────────────────────────────
// PositionEstimator — Stable Navigation Origin + XZ-Plane Position Tracking
//
// ARCHITECTURE:
//
//   ARCore emits pose.position = { x:tx, y:ty, z:tz } in world space.
//   On first valid pose, we capture:
//     originARPose = { x, y, z }    ← LOCKED ONCE per session, never reset
//
//   All subsequent navigation uses:
//     relativePosition = {
//       x: currentPose.x - origin.x,
//       y: 0,                          ← height ignored for indoor navigation
//       z: currentPose.z - origin.z,   ← negative ARCore Z = forward motion
//     }
//
//   This ensures:
//     ✅ Rotation in place does NOT change relativePosition (heading only)
//     ✅ Walking toward destination decreases distance
//     ✅ ARCore world-space origin ≠ LocalSpatialMap origin is handled correctly
//
// PHYSICAL RULES:
//   1. Distance uses XZ-plane only — phone tilt does NOT change distance
//   2. rotationDeltaDeg > ROTATION_SPIKE_THRESHOLD_DEG AND horizontalDelta < threshold
//      → mark as ROTATING, freeze position accumulator
//   3. horizontalDelta > MAX_SINGLE_STEP_TRANSLATION_M → reject as spike
//
// ─────────────────────────────────────────────────────────────────────────────

import { EstimatedPose, SpatialCoordinates } from './types';
import { getPlatformOS } from './platformHelper';
import { spatialTrackingProvider } from './SpatialTrackingProvider';
import {
  ROTATION_SPIKE_THRESHOLD_DEG,
  STATIONARY_TRANSLATION_MAX_M,
  MAX_SINGLE_STEP_TRANSLATION_M,
  POSITION_EMA_ALPHA,
  TRANSLATION_DELTA_EMA_ALPHA,
  LOG_RATE_LIMIT_MS,
  LOG_MOVEMENT_THRESHOLD_M,
} from './navigationConstants';

// Conditionally import expo-sensors for non-AR fallback devices
let Accelerometer: any = null;
let Magnetometer: any = null;

try {
  const Sensors = require('expo-sensors');
  Accelerometer = Sensors.Accelerometer;
  Magnetometer = Sensors.Magnetometer;
} catch (e) {
  // Graceful fallback for test runners
}

export class PositionEstimator {
  private currentPose: EstimatedPose = {
    position: { x: 0, y: 0, z: 0 },
    headingDeg: 0,
    distanceWalkedMeters: 0,
    stepCount: 0,
    confidence: 0.95,
    trackingStatus: 'NORMAL',
    lastUpdated: Date.now(),
  };

  private accelSubscription: any = null;
  private magSubscription: any = null;
  private arPoseUnsubscribe: (() => void) | null = null;
  private onPoseChangeCallback: ((pose: EstimatedPose) => void) | null = null;
  private onTrackingStatusCallback: ((status: 'NORMAL' | 'DEGRADED' | 'LOST') => void) | null = null;

  // ─── Navigation Origin State ────────────────────────────────────────────────
  /**
   * The ARCore world-space pose captured at the first valid tracking frame.
   * All relative positions are computed as: currentARPose - originARPose.
   * Set ONCE per session, never reset during active navigation.
   */
  private originARPose: SpatialCoordinates | null = null;

  /**
   * Smoothed relative position (XZ-plane only) used for all navigation distance calculations.
   * Y is always 0 — vertical height does not affect indoor navigation distance.
   */
  private smoothedRelativePosition: SpatialCoordinates = { x: 0, y: 0, z: 0 };

  // ─── Translation / Rotation Separation State ────────────────────────────────
  private lastARPosition: SpatialCoordinates = { x: 0, y: 0, z: 0 };
  private lastHeadingDeg: number = 0;

  public rawTranslationDeltaM: number = 0;
  public smoothedTranslationDeltaM: number = 0;
  public rotationDeltaDeg: number = 0;
  public isRotating: boolean = false;
  private isARActive: boolean = false;
  private hasReceivedFirstPose: boolean = false;

  // Log rate-limiting
  private lastLogTimestamp: number = 0;
  private lastLoggedRelX: number = 0;
  private lastLoggedRelZ: number = 0;

  public async startTracking(
    onPoseChange?: (pose: EstimatedPose) => void,
    onTrackingStatus?: (status: 'NORMAL' | 'DEGRADED' | 'LOST') => void
  ): Promise<void> {
    this.onPoseChangeCallback = onPoseChange || null;
    this.onTrackingStatusCallback = onTrackingStatus || null;
    this.currentPose.lastUpdated = Date.now();
    this.currentPose.trackingStatus = 'NORMAL';

    // 1. Subscribe to Native ARCore Provider (Event Driven)
    await spatialTrackingProvider.start();

    // GUARD: Prevent duplicate JS subscription
    if (!this.arPoseUnsubscribe) {
      this.arPoseUnsubscribe = spatialTrackingProvider.onPoseUpdate((arPose: EstimatedPose) => {
        this.handleNativeARPose(arPose);
      });
    }

    // 2. If running on platform without native ARCore, fallback to sensors
    const os = getPlatformOS();
    if (os !== 'web' && os !== 'node' && Accelerometer && Magnetometer) {
      try {
        Magnetometer.setUpdateInterval(100);
        this.magSubscription = Magnetometer.addListener((data: { x: number; y: number; z: number }) => {
          // Only use magnetometer if ARCore is not actively tracking orientation
          if (!this.isARActive) {
            this.processMagnetometer(data);
          }
        });
      } catch (err) {
        console.log('[PositionEstimator] Native sensors unavailable');
      }
    }
  }

  public stopTracking(): void {
    if (this.arPoseUnsubscribe) {
      this.arPoseUnsubscribe();
      this.arPoseUnsubscribe = null;
    }
    spatialTrackingProvider.stop();

    if (this.accelSubscription) {
      this.accelSubscription.remove();
      this.accelSubscription = null;
    }
    if (this.magSubscription) {
      this.magSubscription.remove();
      this.magSubscription = null;
    }
  }

  /**
   * Lock the navigation origin to the given ARCore pose.
   * Called once at session start after the first valid pose arrives.
   * After this, all relative positions are computed against this origin.
   */
  public lockOrigin(arPose: SpatialCoordinates): void {
    if (this.originARPose !== null) return; // Never re-lock during a session
    this.originARPose = { ...arPose };
    this.smoothedRelativePosition = { x: 0, y: 0, z: 0 };
    this.currentPose.position = { x: 0, y: 0, z: 0 };
    console.log(`[AR POSITION] Origin locked: arX=${arPose.x.toFixed(3)} arY=${arPose.y.toFixed(3)} arZ=${arPose.z.toFixed(3)}`);
  }

  private handleNativeARPose(arPose: EstimatedPose): void {
    this.isARActive = arPose.trackingStatus === 'NORMAL' || arPose.trackingStatus === 'DEGRADED';
    const newARPos = arPose.position;

    // ── Lock origin on first pose ─────────────────────────────────────────
    if (!this.hasReceivedFirstPose) {
      this.lastARPosition = { ...newARPos };
      this.lastHeadingDeg = arPose.headingDeg;
      this.hasReceivedFirstPose = true;
      // Auto-lock origin if not already locked (e.g. not called explicitly)
      if (this.originARPose === null) {
        this.lockOrigin(newARPos);
      }
    }

    // ── Compute horizontal (XZ-plane) translation delta ──────────────────
    // XZ only — Y (vertical) does NOT contribute to horizontal navigation distance
    const prevARPos = this.lastARPosition;
    const dxAR = newARPos.x - prevARPos.x;
    const dzAR = newARPos.z - prevARPos.z;
    const horizontalDelta = Math.sqrt(dxAR * dxAR + dzAR * dzAR);

    // ── Spike rejection (ARCore coordinate system jump) ───────────────────
    if (horizontalDelta > MAX_SINGLE_STEP_TRANSLATION_M) {
      console.warn(`[AR MOVEMENT] Rejected spike: horizontalDelta=${horizontalDelta.toFixed(3)}m`);
      
      // If ARCore tracking jumped (e.g. tracking lost and recovered, or new plane found),
      // we must shift our locked origin by the exact jump amount. This ensures that
      // the relative navigation position remains perfectly stable across the jump.
      if (this.originARPose !== null) {
        this.originARPose.x += dxAR;
        this.originARPose.y += (newARPos.y - prevARPos.y);
        this.originARPose.z += dzAR;
      }
      
      this.lastARPosition = { ...newARPos };
      this.lastHeadingDeg = arPose.headingDeg;
      return;
    }

    // ── Rotation delta ────────────────────────────────────────────────────
    let rotDelta = Math.abs(arPose.headingDeg - this.lastHeadingDeg);
    if (rotDelta > 180) rotDelta = 360 - rotDelta;

    this.rotationDeltaDeg = rotDelta;

    // ── Rotation-only classification ──────────────────────────────────────
    // A frame is "rotation-only" when heading change is significant AND
    // horizontal displacement is below the noise floor.
    // This prevents quaternion-coupled translation noise from being counted.
    const isRotatingFrame =
      rotDelta > ROTATION_SPIKE_THRESHOLD_DEG &&
      horizontalDelta < STATIONARY_TRANSLATION_MAX_M;
    this.isRotating = isRotatingFrame;

    // ── EMA-smoothed translation delta ────────────────────────────────────
    const effectiveDelta = isRotatingFrame ? 0 : horizontalDelta;
    this.rawTranslationDeltaM = effectiveDelta;
    this.smoothedTranslationDeltaM =
      TRANSLATION_DELTA_EMA_ALPHA * effectiveDelta +
      (1 - TRANSLATION_DELTA_EMA_ALPHA) * this.smoothedTranslationDeltaM;

    // ── Update navigation-relative position ───────────────────────────────
    if (!isRotatingFrame && this.originARPose !== null) {
      // Relative XZ position from navigation origin
      // ARCore: negative Z = forward (camera looks toward -Z)
      // We preserve the sign as-is; distance calculation uses 2D Euclidean
      const rawRelX = newARPos.x - this.originARPose.x;
      const rawRelZ = newARPos.z - this.originARPose.z;

      // Apply EMA smoothing to position
      this.smoothedRelativePosition.x =
        POSITION_EMA_ALPHA * rawRelX + (1 - POSITION_EMA_ALPHA) * this.smoothedRelativePosition.x;
      this.smoothedRelativePosition.z =
        POSITION_EMA_ALPHA * rawRelZ + (1 - POSITION_EMA_ALPHA) * this.smoothedRelativePosition.z;
      this.smoothedRelativePosition.y = 0; // Always 0 for navigation plane

      // Accumulate real walking distance
      if (effectiveDelta > 0) {
        this.currentPose.distanceWalkedMeters += effectiveDelta;
      }
    }
    // On rotation-only frames: position stays frozen — heading updates only

    // Update state
    this.lastARPosition = { ...newARPos };
    this.lastHeadingDeg = arPose.headingDeg;

    this.currentPose = {
      ...arPose,
      // Navigation position = smoothed relative position (XZ-only, origin-relative)
      position: { ...this.smoothedRelativePosition },
      distanceWalkedMeters: this.currentPose.distanceWalkedMeters,
      stepCount: this.currentPose.stepCount,
      lastUpdated: Date.now(),
    };

    // ── Rate-limited diagnostic log ───────────────────────────────────────
    const now = Date.now();
    const logDx = this.smoothedRelativePosition.x - this.lastLoggedRelX;
    const logDz = this.smoothedRelativePosition.z - this.lastLoggedRelZ;
    const logDelta = Math.sqrt(logDx * logDx + logDz * logDz);
    const shouldLog =
      (now - this.lastLogTimestamp > LOG_RATE_LIMIT_MS) ||
      (logDelta > LOG_MOVEMENT_THRESHOLD_M);

    if (shouldLog) {
      this.lastLogTimestamp = now;
      this.lastLoggedRelX = this.smoothedRelativePosition.x;
      this.lastLoggedRelZ = this.smoothedRelativePosition.z;
      console.log(
        `[AR POSITION] rel=(${this.smoothedRelativePosition.x.toFixed(3)}, ${this.smoothedRelativePosition.z.toFixed(3)})` +
        ` heading=${arPose.headingDeg.toFixed(1)}°` +
        ` rotating=${isRotatingFrame}` +
        ` hDelta=${effectiveDelta.toFixed(3)}m`
      );
    }

    this.notifyPoseChange();
  }

  // ─── Magnetometer Fallback (Heading Only — Zero Position Modification) ────
  private processMagnetometer(data: { x: number; y: number; z: number }): void {
    let rawAngle = Math.atan2(data.y, data.x) * (180 / Math.PI);
    if (rawAngle < 0) rawAngle += 360;
    const newHeading = Math.round(rawAngle);

    let delta = Math.abs(newHeading - this.lastHeadingDeg);
    if (delta > 180) delta = 360 - delta;
    this.rotationDeltaDeg = delta;
    this.isRotating = delta > ROTATION_SPIKE_THRESHOLD_DEG;

    // Update HEADING ONLY — NEVER touch position.x / position.y / position.z
    this.lastHeadingDeg = newHeading;
    this.currentPose.headingDeg = newHeading;
    this.currentPose.lastUpdated = Date.now();

    this.rawTranslationDeltaM = 0;
    this.smoothedTranslationDeltaM = (1 - TRANSLATION_DELTA_EMA_ALPHA) * this.smoothedTranslationDeltaM;

    this.notifyPoseChange();
  }

  /**
   * Recalibrate spatial position when vision AI identifies a stable visual anchor.
   * Uses a smooth blend to avoid violent position jumps.
   */
  public updateWithVisualAnchor(anchorCoords: SpatialCoordinates, landmarkConfidence: number = 0.95): void {
    const alpha = Math.min(0.65, landmarkConfidence * 0.7);
    this.smoothedRelativePosition.x =
      this.smoothedRelativePosition.x * (1 - alpha) + anchorCoords.x * alpha;
    this.smoothedRelativePosition.z =
      this.smoothedRelativePosition.z * (1 - alpha) + anchorCoords.z * alpha;
    this.smoothedRelativePosition.y = 0;
    this.currentPose.position = { ...this.smoothedRelativePosition };
    this.currentPose.confidence = Math.min(0.98, (this.currentPose.confidence + landmarkConfidence) / 2);
    this.currentPose.trackingStatus = 'NORMAL';
    this.currentPose.lastUpdated = Date.now();
    this.notifyPoseChange();
    console.log(`[AR POSITION] Visual anchor correction applied (confidence=${landmarkConfidence.toFixed(2)}): rel=(${this.smoothedRelativePosition.x.toFixed(3)}, ${this.smoothedRelativePosition.z.toFixed(3)})`);
  }

  /**
   * Record a discrete step (e.g. from tests or hardware pedometer)
   */
  public recordStep(strideMeters: number = 0.72): void {
    // Step in the XZ plane according to current heading
    const rad = (this.currentPose.headingDeg * Math.PI) / 180;
    this.smoothedRelativePosition.x += strideMeters * Math.sin(rad);
    this.smoothedRelativePosition.z += strideMeters * Math.cos(rad);
    this.currentPose.position = { ...this.smoothedRelativePosition };
    this.currentPose.distanceWalkedMeters += strideMeters;
    this.currentPose.stepCount += 1;
    this.currentPose.lastUpdated = Date.now();
    this.rawTranslationDeltaM = strideMeters;
    this.smoothedTranslationDeltaM = strideMeters;
    this.notifyPoseChange();
  }

  /**
   * SIMULATION ONLY — desktop/simulator test controls only.
   */
  public simulateMovement(meters: number, headingOffsetDeg: number = 0): void {
    this.currentPose.headingDeg = (this.currentPose.headingDeg + headingOffsetDeg + 360) % 360;
    const rad = (this.currentPose.headingDeg * Math.PI) / 180;
    this.smoothedRelativePosition.x += meters * Math.sin(rad);
    this.smoothedRelativePosition.z += meters * Math.cos(rad);
    this.currentPose.position = { ...this.smoothedRelativePosition };
    this.currentPose.distanceWalkedMeters += Math.abs(meters);
    this.currentPose.stepCount += Math.round(Math.abs(meters) / 0.7);
    this.currentPose.lastUpdated = Date.now();
    this.rawTranslationDeltaM = Math.abs(meters);
    this.smoothedTranslationDeltaM = Math.abs(meters);
    this.notifyPoseChange();
  }

  public getPose(): EstimatedPose {
    return { ...this.currentPose, position: { ...this.currentPose.position } };
  }

  public getOriginARPose(): SpatialCoordinates | null {
    return this.originARPose ? { ...this.originARPose } : null;
  }

  public hasOriginLocked(): boolean {
    return this.originARPose !== null;
  }

  public setTrackingStatus(status: 'NORMAL' | 'DEGRADED' | 'LOST'): void {
    if (this.currentPose.trackingStatus === status) return;
    this.currentPose.trackingStatus = status;
    if (status === 'LOST') {
      this.currentPose.confidence = Math.min(this.currentPose.confidence, 0.4);
    } else if (status === 'DEGRADED') {
      this.currentPose.confidence = Math.min(this.currentPose.confidence, 0.65);
    }
    if (this.onTrackingStatusCallback) {
      this.onTrackingStatusCallback(status);
    }
  }

  public restoreTracking(confidence: number = 0.9): void {
    this.currentPose.trackingStatus = 'NORMAL';
    this.currentPose.confidence = Math.min(0.98, Math.max(confidence, 0.75));
    this.currentPose.lastUpdated = Date.now();
  }

  public isPoseFresh(maxAgeMs: number = 2500, now: number = Date.now()): boolean {
    return now - this.currentPose.lastUpdated <= maxAgeMs;
  }

  public isTrackingStable(minConfidence: number = 0.75): boolean {
    return (
      this.currentPose.trackingStatus === 'NORMAL' &&
      this.currentPose.confidence >= minConfidence
    );
  }

  public reset(initialPosition: SpatialCoordinates = { x: 0, y: 0, z: 0 }): void {
    // Reset navigation state — origin is re-locked on next first pose
    this.originARPose = null;
    this.smoothedRelativePosition = { ...initialPosition };
    this.currentPose = {
      position: { ...initialPosition },
      headingDeg: 0,
      distanceWalkedMeters: 0,
      stepCount: 0,
      confidence: 0.95,
      trackingStatus: 'NORMAL',
      lastUpdated: Date.now(),
    };
    this.lastARPosition = { x: 0, y: 0, z: 0 };
    this.lastHeadingDeg = 0;
    this.rotationDeltaDeg = 0;
    this.rawTranslationDeltaM = 0;
    this.smoothedTranslationDeltaM = 0;
    this.isRotating = false;
    this.hasReceivedFirstPose = false;
    this.lastLogTimestamp = 0;
    this.notifyPoseChange();
  }

  private notifyPoseChange(): void {
    if (this.onPoseChangeCallback) {
      this.onPoseChangeCallback(this.getPose());
    }
  }
}

export const positionEstimator = new PositionEstimator();
