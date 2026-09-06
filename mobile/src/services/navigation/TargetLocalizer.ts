import { SpatialTarget, TrackedObject } from './types';
import { spatialTrackingProvider } from './SpatialTrackingProvider';

export class TargetLocalizer {
  public localizeTarget(obj: TrackedObject): SpatialTarget {
    const trackingState = spatialTrackingProvider.getTrackingState();

    // 1. Convert screen center to a screen point (for raycasting)
    const screenPoint = {
      x: obj.stableXCenter,
      y: 0.5 // We assume standard vertical center if not provided by Gemini bounding box
    };

    // 2. Perform native AR raycast (Rule 6)
    // If no native spatial tracking is available (e.g., standard Expo Camera),
    // this will correctly return null (Rule 3).
    const worldPosition = spatialTrackingProvider.raycast(screenPoint);
    
    // 3. Determine confidence based on depth availability (Rule 7)
    let confidence = 0.0;
    if (worldPosition) {
      confidence = 0.95; // Real spatial geometry
    }

    return {
      id: obj.trackId,
      semanticType: obj.type,
      screenX: obj.stableXCenter,
      screenY: screenPoint.y,
      worldPosition,
      worldPositionConfidence: confidence,
      trackingState,
      lastSeen: Date.now(),
      source: 'LOCALIZER'
    };
  }
}

export const targetLocalizer = new TargetLocalizer();
