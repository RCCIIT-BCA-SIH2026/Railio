import { Platform, NativeModules, NativeEventEmitter } from 'react-native';
import { ARTrackingState, EstimatedPose, Vector3 } from './types';
import { LOG_RATE_LIMIT_MS, LOG_MOVEMENT_THRESHOLD_M } from './navigationConstants';

export interface SpatialTrackingProvider {
  start(): Promise<void>;
  stop(): void;
  getTrackingState(): ARTrackingState;
  getCameraPose(): EstimatedPose | null;
  raycast(screenPoint: { x: number; y: number }): Vector3 | null;
  getDepthIfAvailable(): number | null;
  trackAnchor(worldPosition: Vector3): string | null;
  resetSession(): void;
  onPoseUpdate(callback: (pose: EstimatedPose) => void): () => void;
}

/**
 * Fallback provider when no native AR library is available.
 */
export class FallbackSpatialTrackingProvider implements SpatialTrackingProvider {
  public async start(): Promise<void> {}
  public stop(): void {}
  public getTrackingState(): ARTrackingState { return 'NOT_AVAILABLE'; }
  public getCameraPose(): EstimatedPose | null { return null; }
  public raycast(_screenPoint: { x: number; y: number }): Vector3 | null { return null; }
  public getDepthIfAvailable(): number | null { return null; }
  public trackAnchor(_worldPosition: Vector3): string | null { return null; }
  public resetSession(): void {}
  public onPoseUpdate(_callback: (pose: EstimatedPose) => void): () => void { return () => {}; }
}

// ─── Native ARCore Bridge ───────────────────────────────────────────────────

const { ARCoreModule } = NativeModules;
const arEmitter = ARCoreModule ? new NativeEventEmitter(ARCoreModule) : null;

export class NativeARCoreProvider implements SpatialTrackingProvider {
  private trackingState: ARTrackingState = 'INITIALIZING';
  private currentPose: EstimatedPose | null = null;
  private poseListener: any = null;
  private stateListener: any = null;
  private subscribers: Array<(pose: EstimatedPose) => void> = [];

  // Log rate-limiting state
  private lastLogTimestamp: number = 0;
  private lastLoggedPositionX: number = 0;
  private lastLoggedPositionZ: number = 0;

  public async start(): Promise<void> {
    if (!ARCoreModule) {
      console.warn('[NativeARCoreProvider] ARCoreModule is undefined in NativeModules');
      return;
    }
    
    // GUARD: Prevent duplicate native listeners
    if (this.poseListener) return;

    try {
      await ARCoreModule.startSession();

      this.stateListener = arEmitter?.addListener('onTrackingStateChange', (event: { state: ARTrackingState }) => {
        this.trackingState = event.state;
      });

      this.poseListener = arEmitter?.addListener('onPoseUpdate', (rawPose: any) => {
        const parsedPose: EstimatedPose = {
          ...rawPose,
          viewMatrix: rawPose.viewMatrix,
          projectionMatrix: rawPose.projectionMatrix,
        };
        
        this.currentPose = parsedPose;

        // ── Rate-limited diagnostic log ────────────────────────────────────
        // Log only when meaningfully moved (> threshold) OR interval elapsed.
        // This prevents logcat from being flooded at 10Hz.
        const now = Date.now();
        const dx = parsedPose.position.x - this.lastLoggedPositionX;
        const dz = parsedPose.position.z - this.lastLoggedPositionZ;
        const horizontalDelta = Math.sqrt(dx * dx + dz * dz);
        const shouldLog =
          (now - this.lastLogTimestamp > LOG_RATE_LIMIT_MS) ||
          (horizontalDelta > LOG_MOVEMENT_THRESHOLD_M) ||
          (rawPose.isOriginPose === true);

        if (shouldLog) {
          this.lastLogTimestamp = now;
          this.lastLoggedPositionX = parsedPose.position.x;
          this.lastLoggedPositionZ = parsedPose.position.z;
          console.log(
            `[AR PROVIDER] pos=(${parsedPose.position.x.toFixed(3)}, ${parsedPose.position.y.toFixed(3)}, ${parsedPose.position.z.toFixed(3)})` +
            ` heading=${parsedPose.headingDeg.toFixed(1)}°` +
            ` isOrigin=${rawPose.isOriginPose ?? false}` +
            ` hDelta=${horizontalDelta.toFixed(3)}m`
          );
        }

        this.subscribers.forEach((cb) => cb(parsedPose));
      });
    } catch (e) {
      console.error('[NativeARCoreProvider] Failed to start native ARCore session', e);
    }
  }

  public stop(): void {
    if (!ARCoreModule) return;
    this.poseListener?.remove();
    this.stateListener?.remove();
    this.poseListener = null;
    this.stateListener = null;
    ARCoreModule.stopSession().catch(() => {});
  }

  public getTrackingState(): ARTrackingState { return this.trackingState; }
  public getCameraPose(): EstimatedPose | null { return this.currentPose; }

  public onPoseUpdate(callback: (pose: EstimatedPose) => void): () => void {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter((s) => s !== callback);
    };
  }

  public raycast(screenPoint: { x: number; y: number }): Vector3 | null {
    if (!ARCoreModule) return null;
    return ARCoreModule.raycastSync ? ARCoreModule.raycastSync(screenPoint.x, screenPoint.y) : null;
  }

  public getDepthIfAvailable(): number | null {
    if (!ARCoreModule) return null;
    return ARCoreModule.getCenterDepthSync ? ARCoreModule.getCenterDepthSync() : null;
  }

  public trackAnchor(worldPosition: Vector3): string | null {
    if (!ARCoreModule) return null;
    return ARCoreModule.addAnchorSync ? ARCoreModule.addAnchorSync(worldPosition.x, worldPosition.y, worldPosition.z) : null;
  }

  public resetSession(): void {
    if (!ARCoreModule) return;
    ARCoreModule.resetSession().catch(() => {});
    this.trackingState = 'INITIALIZING';
    this.currentPose = null;
    this.lastLogTimestamp = 0;
  }
}

export const spatialTrackingProvider =
  Platform.OS === 'android' && ARCoreModule
    ? new NativeARCoreProvider()
    : new FallbackSpatialTrackingProvider();
