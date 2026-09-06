// ─────────────────────────────────────────────────────────────────────────────
// TemporalSceneMemory — Multi-frame object tracking and confidence accumulation
//
// PROBLEM SOLVED: The old system used every single Gemini frame directly to
// issue navigation commands. One blurry/misidentified frame → wrong direction.
//
// SOLUTION: Objects must be observed across multiple frames before they can
// influence navigation decisions. Confidence builds over time.
// ─────────────────────────────────────────────────────────────────────────────

import {
  DetectedNavObject,
  TrackedObject,
  TemporalObservation,
  ObjectConfirmationStatus,
  DoorSubtype,
} from './types';

// A tracked object is confirmed after this many observations
const CONFIRMATION_THRESHOLD = 2;
// Observations older than this are considered stale (ms)
const OBSERVATION_TTL_MS = 12_000;
// Max observations to keep per object
const MAX_OBSERVATIONS_PER_OBJECT = 8;
// Minimum confidence for an observation to count
const MIN_OBSERVATION_CONFIDENCE = 0.45;
// EMA alpha for smoothing xCenter (lower = more stable, slower)
const XCENTER_EMA_ALPHA = 0.35;

export class TemporalSceneMemory {
  private trackedObjects: Map<string, TrackedObject> = new Map();
  private frameCount: number = 0;

  /**
   * Ingest a batch of raw detections from a single Gemini frame.
   * Merges with existing tracked objects rather than replacing.
   */
  public ingestFrame(detections: DetectedNavObject[]): void {
    this.frameCount += 1;
    const now = Date.now();

    // Age out stale objects before ingesting new ones
    this.pruneStaleObjects(now);

    for (const det of detections) {
      if (det.confidence < MIN_OBSERVATION_CONFIDENCE) continue;

      const xCenter = det.boundingBox
        ? (det.boundingBox.xmin + det.boundingBox.xmax) / 2
        : 0.5;

      const observation: TemporalObservation = {
        timestamp: now,
        confidence: det.confidence,
        direction: det.direction,
        boundingBox: det.boundingBox,
        xCenter,
      };

      // Try to match to existing tracked object by id or semantic similarity
      const existing = this.findMatchingTrack(det);

      if (existing) {
        this.updateTrack(existing, det, observation, now);
      } else {
        this.createTrack(det, observation, now);
      }
    }
  }

  /**
   * Returns only CONFIRMED objects — objects seen in ≥ CONFIRMATION_THRESHOLD frames.
   * These are the ONLY objects that may influence navigation decisions.
   */
  public getConfirmedObjects(): TrackedObject[] {
    const now = Date.now();
    return Array.from(this.trackedObjects.values()).filter(
      (t) =>
        t.confirmationStatus === 'CONFIRMED' &&
        now - t.lastSeen < OBSERVATION_TTL_MS
    );
  }

  /**
   * Returns confirmed objects of a specific type.
   */
  public getConfirmedByType(type: DetectedNavObject['type']): TrackedObject[] {
    return this.getConfirmedObjects().filter((t) => t.type === type);
  }

  /**
   * Returns all tracked objects (for debug/display purposes only — not for navigation).
   */
  public getAllTracked(): TrackedObject[] {
    return Array.from(this.trackedObjects.values());
  }

  /**
   * Get a specific tracked object by its trackId.
   */
  public getTrack(trackId: string): TrackedObject | null {
    return this.trackedObjects.get(trackId) || null;
  }

  /**
   * Force-confirm an object (used when a visual anchor matches a known node).
   */
  public forceConfirm(trackId: string): void {
    const track = this.trackedObjects.get(trackId);
    if (track) {
      track.confirmationStatus = 'CONFIRMED';
    }
  }

  /**
   * Clear all tracked objects — call on new session or tracking loss.
   */
  public reset(): void {
    this.trackedObjects.clear();
    this.frameCount = 0;
  }

  /**
   * Get observation count (for debugging).
   */
  public getFrameCount(): number {
    return this.frameCount;
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private findMatchingTrack(det: DetectedNavObject): TrackedObject | null {
    // Exact ID match first
    if (this.trackedObjects.has(det.id)) {
      return this.trackedObjects.get(det.id)!;
    }

    // Semantic match: same type + similar x position (within ±0.2)
    const xCenter = det.boundingBox
      ? (det.boundingBox.xmin + det.boundingBox.xmax) / 2
      : 0.5;

    for (const track of this.trackedObjects.values()) {
      if (
        track.type === det.type &&
        Math.abs(track.stableXCenter - xCenter) < 0.22 &&
        track.confirmationStatus !== 'LOST'
      ) {
        return track;
      }
    }

    return null;
  }

  private createTrack(
    det: DetectedNavObject,
    observation: TemporalObservation,
    now: number
  ): void {
    const xCenter = observation.xCenter;
    const trackId = `${det.type}_${this.trackedObjects.size + 1}`;

    const track: TrackedObject = {
      trackId,
      type: det.type,
      doorSubtype: this.inferDoorSubtype(det),
      label: det.label,
      observations: [observation],
      confirmationStatus: 'CANDIDATE',
      aggregateConfidence: det.confidence,
      stableXCenter: xCenter,
      stableDirection: det.direction,
      isOpenDoor: det.isOpenDoor ?? false,
      hasExitSign: det.hasExitSign ?? false,
      hasVisibleCorridor: det.hasVisibleCorridor ?? false,
      firstSeen: now,
      lastSeen: now,
    };

    this.trackedObjects.set(trackId, track);
  }

  private updateTrack(
    track: TrackedObject,
    det: DetectedNavObject,
    observation: TemporalObservation,
    now: number
  ): void {
    // Add new observation, capping at max
    track.observations.push(observation);
    if (track.observations.length > MAX_OBSERVATIONS_PER_OBJECT) {
      track.observations.shift();
    }

    track.lastSeen = now;

    // Update semantic properties with latest detection (OR-accumulate booleans)
    track.isOpenDoor = track.isOpenDoor || (det.isOpenDoor ?? false);
    track.hasExitSign = track.hasExitSign || (det.hasExitSign ?? false);
    track.hasVisibleCorridor = track.hasVisibleCorridor || (det.hasVisibleCorridor ?? false);
    if (det.doorSubtype && det.doorSubtype !== 'UNKNOWN') {
      track.doorSubtype = det.doorSubtype;
    }

    // Smooth xCenter with EMA to prevent jitter
    track.stableXCenter =
      XCENTER_EMA_ALPHA * observation.xCenter +
      (1 - XCENTER_EMA_ALPHA) * track.stableXCenter;

    // Use most common direction from recent observations
    track.stableDirection = this.computeDominantDirection(track.observations);

    // Recalculate aggregate confidence (time-weighted average)
    track.aggregateConfidence = this.computeWeightedConfidence(track.observations, now);

    // Update confirmation status
    track.confirmationStatus = this.computeConfirmationStatus(track, now);
  }

  private computeWeightedConfidence(observations: TemporalObservation[], now: number): number {
    if (observations.length === 0) return 0;
    let weightedSum = 0;
    let totalWeight = 0;
    for (const obs of observations) {
      const ageMs = now - obs.timestamp;
      // More recent observations get higher weight
      const weight = Math.exp(-ageMs / 8000); // half-life ~8s
      weightedSum += obs.confidence * weight;
      totalWeight += weight;
    }
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  private computeConfirmationStatus(
    track: TrackedObject,
    now: number
  ): ObjectConfirmationStatus {
    const recentObs = track.observations.filter(
      (o) => now - o.timestamp < OBSERVATION_TTL_MS
    );

    if (recentObs.length === 0) return 'LOST';
    if (now - track.lastSeen > OBSERVATION_TTL_MS) return 'STALE';
    if (recentObs.length >= CONFIRMATION_THRESHOLD) return 'CONFIRMED';
    if (recentObs.length >= 1) return 'PROBABLE';
    return 'CANDIDATE';
  }

  private computeDominantDirection(
    observations: TemporalObservation[]
  ): DetectedNavObject['direction'] {
    const counts: Partial<Record<DetectedNavObject['direction'], number>> = {};
    for (const obs of observations.slice(-5)) {
      counts[obs.direction] = (counts[obs.direction] || 0) + 1;
    }
    let best: DetectedNavObject['direction'] = 'straight';
    let max = 0;
    for (const [dir, count] of Object.entries(counts)) {
      if (count! > max) {
        max = count!;
        best = dir as DetectedNavObject['direction'];
      }
    }
    return best;
  }

  private pruneStaleObjects(now: number): void {
    for (const [id, track] of this.trackedObjects.entries()) {
      if (now - track.lastSeen > OBSERVATION_TTL_MS * 2) {
        this.trackedObjects.delete(id);
      }
    }
  }

  private inferDoorSubtype(det: DetectedNavObject): DoorSubtype {
    if (det.doorSubtype) return det.doorSubtype;
    if (det.type === 'emergency_exit') return 'EMERGENCY_EXIT';
    if (det.type === 'exit') return 'EXIT_DOOR';
    if (det.hasExitSign) return 'EXIT_DOOR';
    return 'UNKNOWN';
  }
}

export const temporalSceneMemory = new TemporalSceneMemory();
