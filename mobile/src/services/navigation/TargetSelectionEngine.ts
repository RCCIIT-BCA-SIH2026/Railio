// ─────────────────────────────────────────────────────────────────────────────
// TargetSelectionEngine — Selects and locks the best navigation target
//
// PROBLEM SOLVED: The old system used the first detected object as the target.
// A door with exit sign and open corridor behind it scored the same as a
// closed closet door.
//
// SOLUTION: Evaluate all confirmed candidate objects using a scoring model.
// Once a target is locked, it remains locked unless explicitly invalidated.
// Doors are NOT automatically exits — they need evidence.
// ─────────────────────────────────────────────────────────────────────────────

import { TrackedObject, DestinationIntent, DoorSubtype } from './types';

export interface SelectedTarget {
  trackId: string;
  label: string;
  type: TrackedObject['type'];
  doorSubtype?: DoorSubtype;
  score: number;
  isConfirmedExit: boolean;      // true only if there is evidence (exit sign, corridor, etc.)
  stableXCenter: number;
  stableDirection: TrackedObject['stableDirection'];
  aggregateConfidence: number;
  hasExitSign: boolean;
  hasVisibleCorridor: boolean;
  isOpenDoor: boolean;
  lockedAt: number;
}

// A locked target is only replaced if a new candidate scores this much higher
const LOCK_OVERRIDE_MARGIN = 0.25;
// Minimum score to become a navigation target
const MIN_TARGET_SCORE = 0.40;
// Minimum aggregate confidence for door to be considered
const MIN_DOOR_CONFIDENCE = 0.55;

export class TargetSelectionEngine {
  private lockedTarget: SelectedTarget | null = null;

  /**
   * Evaluate candidates and return best target for given destination intent.
   * Respects existing lock unless evidence strongly favors a different target.
   */
  public selectTarget(
    candidates: TrackedObject[],
    intent: DestinationIntent | null
  ): SelectedTarget | null {
    const scoredCandidates = candidates
      .filter((c) => c.aggregateConfidence >= MIN_DOOR_CONFIDENCE)
      .map((c) => ({ candidate: c, score: this.score(c, intent) }))
      .filter((s) => s.score >= MIN_TARGET_SCORE)
      .sort((a, b) => b.score - a.score);

    if (scoredCandidates.length === 0) {
      // No valid candidates — maintain existing lock if still valid
      return this.lockedTarget;
    }

    const best = scoredCandidates[0];
    const bestTarget = this.buildTarget(best.candidate, best.score);

    // If we already have a locked target, only override with strong evidence
    if (this.lockedTarget) {
      const improvement = best.score - this.lockedTarget.score;
      if (improvement < LOCK_OVERRIDE_MARGIN) {
        // Update position/confidence of locked target but keep the same object
        const existingCandidate = candidates.find(
          (c) => c.trackId === this.lockedTarget!.trackId
        );
        if (existingCandidate) {
          // Refresh the locked target's live data
          this.lockedTarget = this.buildTarget(
            existingCandidate,
            this.score(existingCandidate, intent)
          );
        }
        return this.lockedTarget;
      }
    }

    // Lock the new best target
    this.lockedTarget = bestTarget;
    return this.lockedTarget;
  }

  /**
   * Get the currently locked target without re-evaluating.
   */
  public getLockedTarget(): SelectedTarget | null {
    return this.lockedTarget;
  }

  /**
   * Force-invalidate the locked target (e.g. target lost, path blocked, destination changed).
   */
  public clearLock(): void {
    this.lockedTarget = null;
  }

  /**
   * Mark target as arrived — clears lock.
   */
  public markArrived(): void {
    this.lockedTarget = null;
  }

  /**
   * Check if there is an active locked target.
   */
  public hasLockedTarget(): boolean {
    return this.lockedTarget !== null;
  }

  // ─── Private scoring model ────────────────────────────────────────────────

  /**
   * Score a candidate target (higher = better exit candidate).
   * Score range: 0.0 to 1.0
   */
  private score(candidate: TrackedObject, intent: DestinationIntent | null): number {
    let score = 0;

    // Base: aggregate temporal confidence (0.0-0.35)
    score += candidate.aggregateConfidence * 0.35;

    // Open door bonus (0.15)
    if (candidate.isOpenDoor) score += 0.15;

    // Exit sign bonus (0.20 — strong evidence this is a real exit)
    if (candidate.hasExitSign) score += 0.20;

    // Visible corridor beyond door bonus (0.15)
    if (candidate.hasVisibleCorridor) score += 0.15;

    // Type scoring (0.10)
    if (candidate.type === 'emergency_exit') score += 0.10;
    else if (candidate.type === 'exit') score += 0.09;
    else if (candidate.type === 'door') score += 0.04;
    else if (candidate.type === 'corridor') score += 0.06;
    else if (candidate.type === 'stairs') score += 0.03;
    else if (candidate.type === 'elevator') score += 0.03;

    // Door subtype scoring (0.05)
    if (candidate.doorSubtype === 'EXIT_DOOR') score += 0.05;
    else if (candidate.doorSubtype === 'EMERGENCY_EXIT') score += 0.05;
    else if (candidate.doorSubtype === 'CLOSET_DOOR') score -= 0.10; // penalty
    else if (candidate.doorSubtype === 'BATHROOM_DOOR') score -= 0.05; // penalty

    // Intent alignment bonus (0.10)
    if (intent) {
      const label = candidate.label.toLowerCase();
      const q = (intent.targetLabel || '').toLowerCase();
      if (intent.targetType === 'exit' && (candidate.type === 'exit' || candidate.hasExitSign)) {
        score += 0.10;
      } else if (intent.targetType === 'elevator' && candidate.type === 'elevator') {
        score += 0.10;
      } else if (intent.targetType === 'stairs' && candidate.type === 'stairs') {
        score += 0.10;
      } else if (label.includes(q) || q.includes(label)) {
        score += 0.05;
      }

      // Emergency preference
      if (intent.preferences.isEmergency && candidate.type === 'emergency_exit') {
        score += 0.10;
      }
      // Prefer lift if requested
      if (intent.preferences.preferLift && candidate.type === 'elevator') {
        score += 0.08;
      }
      // Avoid stairs if requested
      if (intent.preferences.avoidStairs && candidate.type === 'stairs') {
        score -= 0.15;
      }
    }

    // Penalize center-blocked positions (xCenter very close to 0 or 1 = near edge = harder to navigate)
    // Slight bonus for centered targets (easier MOVE_FORWARD)
    const centerBonus = 1.0 - Math.abs(candidate.stableXCenter - 0.5) * 0.4;
    score *= centerBonus;

    return Math.max(0, Math.min(1, score));
  }

  private buildTarget(candidate: TrackedObject, score: number): SelectedTarget {
    // An exit is only confirmed if there is actual evidence (not just the type name)
    const isConfirmedExit =
      candidate.type === 'emergency_exit' ||
      candidate.type === 'exit' ||
      (candidate.type === 'door' && (candidate.hasExitSign || candidate.hasVisibleCorridor)) ||
      candidate.doorSubtype === 'EXIT_DOOR' ||
      candidate.doorSubtype === 'EMERGENCY_EXIT';

    return {
      trackId: candidate.trackId,
      label: candidate.label,
      type: candidate.type,
      doorSubtype: candidate.doorSubtype,
      score,
      isConfirmedExit,
      stableXCenter: candidate.stableXCenter,
      stableDirection: candidate.stableDirection,
      aggregateConfidence: candidate.aggregateConfidence,
      hasExitSign: candidate.hasExitSign,
      hasVisibleCorridor: candidate.hasVisibleCorridor,
      isOpenDoor: candidate.isOpenDoor,
      lockedAt: Date.now(),
    };
  }
}

export const targetSelectionEngine = new TargetSelectionEngine();
