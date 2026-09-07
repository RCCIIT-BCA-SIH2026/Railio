import {
  ARRIVAL_CONFIRMATION_FRAMES,
  ARRIVAL_THRESHOLD_METERS,
  STABLE_CONFIDENCE_THRESHOLD,
} from './navigationConstants';
import { EstimatedPose } from './types';

export interface ArrivalEligibility {
  isNearDestination: boolean;
  isTrackingStable: boolean;
  isPoseFresh: boolean;
  isDestinationConfirmed: boolean;
  distanceMeters: number | null;
  confidence: number;
}

export type ArrivalTickResult = 'idle' | 'candidate' | 'confirmed' | 'reset';

/**
 * Multi-sample arrival gate. Distance alone never confirms arrival.
 */
export class ArrivalConfirmationController {
  private frames = 0;
  private candidateActive = false;

  public evaluate(eligibility: ArrivalEligibility): ArrivalTickResult {
    const eligible =
      eligibility.isNearDestination &&
      eligibility.isTrackingStable &&
      eligibility.isPoseFresh &&
      eligibility.isDestinationConfirmed &&
      eligibility.distanceMeters !== null &&
      eligibility.distanceMeters <= ARRIVAL_THRESHOLD_METERS &&
      eligibility.confidence >= STABLE_CONFIDENCE_THRESHOLD;

    if (!eligible) {
      if (this.candidateActive || this.frames > 0) {
        this.reset();
        return 'reset';
      }
      return 'idle';
    }

    this.candidateActive = true;
    this.frames += 1;

    if (this.frames >= ARRIVAL_CONFIRMATION_FRAMES) {
      return 'confirmed';
    }
    return 'candidate';
  }

  public reset(): void {
    this.frames = 0;
    this.candidateActive = false;
  }

  public getFrames(): number {
    return this.frames;
  }

  public isCandidate(): boolean {
    return this.candidateActive && this.frames > 0 && this.frames < ARRIVAL_CONFIRMATION_FRAMES;
  }

  public isPoseFresh(pose: EstimatedPose, now: number = Date.now()): boolean {
    if (!pose.lastUpdated) return false;
    return now - pose.lastUpdated <= 2500;
  }
}

export const arrivalConfirmationController = new ArrivalConfirmationController();
