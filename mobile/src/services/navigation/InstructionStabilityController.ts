// ─────────────────────────────────────────────────────────────────────────────
// InstructionStabilityController — Prevents oscillating instructions
//
// PROBLEM SOLVED: Without this, every sensor tick (10 Hz) can produce a new
// voice instruction. Instructions flip between "Turn left" and "Turn right"
// every second. A single noisy frame changes direction.
//
// SOLUTION: An instruction must be consistently recommended across multiple
// consecutive evaluations before it becomes active. And it must be held
// consistently different before it is replaced (hysteresis).
// ─────────────────────────────────────────────────────────────────────────────

import { NavAction, NavigationInstruction } from './types';

// Consecutive frames the same action must appear before becoming stable
const STABILITY_WINDOW = 2;
// Consecutive frames a new action must appear before overriding stable instruction
const HYSTERESIS_WINDOW = 2;
// Minimum confidence required to switch instruction
const MIN_SWITCH_CONFIDENCE = 0.60;
// Minimum ms between voice announcements for same instruction (non-priority)
const VOICE_COOLDOWN_MS = 8000;
// Minimum ms between any instruction switch
const MIN_SWITCH_INTERVAL_MS = 2500;

interface CandidateEntry {
  action: NavAction;
  count: number;
  lastSeen: number;
  confidence: number;
}

export class InstructionStabilityController {
  private stableInstruction: NavigationInstruction | null = null;
  private candidateQueue: CandidateEntry[] = [];
  private lastVoiceTime: number = 0;
  private lastSwitchTime: number = 0;
  private lastSpokenText: string = '';

  /**
   * Propose a new instruction candidate. Returns the STABLE instruction
   * (which may be different from what was proposed, due to hysteresis).
   *
   * Returns null if the stable instruction has not changed and voice cooldown
   * has not elapsed (caller should not speak).
   */
  public propose(
    candidate: NavigationInstruction
  ): { instruction: NavigationInstruction; shouldSpeak: boolean } | null {
    const now = Date.now();

    this.updateCandidateQueue(candidate, now);

    // Determine if the candidate is stable enough to become the new instruction
    const newStable = this.resolveStable(candidate, now);

    if (!newStable) {
      // No stable instruction yet — return current stable without voice
      if (this.stableInstruction) {
        return { instruction: this.stableInstruction, shouldSpeak: false };
      }
      return null;
    }

    const isSameAction = this.stableInstruction?.action === newStable.action;
    const isSameText = this.stableInstruction?.spokenText === newStable.spokenText;

    // Check if we can switch to the new instruction
    if (!isSameAction) {
      if (now - this.lastSwitchTime < MIN_SWITCH_INTERVAL_MS) {
        // Too soon to switch — hold current
        if (this.stableInstruction) {
          return { instruction: this.stableInstruction, shouldSpeak: false };
        }
        return null;
      }
      if (newStable.confidence < MIN_SWITCH_CONFIDENCE) {
        // Not confident enough to switch — hold current
        if (this.stableInstruction) {
          return { instruction: this.stableInstruction, shouldSpeak: false };
        }
        return null;
      }
    }

    this.stableInstruction = newStable;
    if (!isSameAction) {
      this.lastSwitchTime = now;
    }

    // Determine if we should announce the instruction via voice
    const shouldSpeak = this.evaluateShouldSpeak(newStable.spokenText, now);
    if (shouldSpeak) {
      this.lastVoiceTime = now;
      this.lastSpokenText = newStable.spokenText;
    }

    return { instruction: newStable, shouldSpeak };
  }

  /**
   * Force-emit a priority instruction immediately, bypassing all stability windows.
   * Use for emergencies, off-route events, tracking loss, arrival.
   */
  public forcePriority(instruction: NavigationInstruction): {
    instruction: NavigationInstruction;
    shouldSpeak: boolean;
  } {
    this.stableInstruction = instruction;
    this.candidateQueue = [];
    this.lastVoiceTime = Date.now();
    this.lastSpokenText = instruction.spokenText;
    this.lastSwitchTime = Date.now();
    return { instruction, shouldSpeak: true };
  }

  /**
   * Get the currently stable instruction without proposing a new one.
   */
  public getStable(): NavigationInstruction | null {
    return this.stableInstruction;
  }

  /**
   * Reset all state — call on new session or tracking loss.
   */
  public reset(): void {
    this.stableInstruction = null;
    this.candidateQueue = [];
    this.lastVoiceTime = 0;
    this.lastSwitchTime = 0;
    this.lastSpokenText = '';
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private updateCandidateQueue(candidate: NavigationInstruction, now: number): void {
    const existing = this.candidateQueue.find((c) => c.action === candidate.action);
    if (existing) {
      existing.count += 1;
      existing.lastSeen = now;
      existing.confidence = Math.max(existing.confidence, candidate.confidence);
    } else {
      // Prune old candidates when adding a new one
      this.candidateQueue = this.candidateQueue.filter(
        (c) => now - c.lastSeen < 5000
      );
      this.candidateQueue.push({
        action: candidate.action,
        count: 1,
        lastSeen: now,
        confidence: candidate.confidence,
      });
    }
  }

  private resolveStable(
    candidate: NavigationInstruction,
    now: number
  ): NavigationInstruction | null {
    const currentAction = this.stableInstruction?.action;
    const proposedAction = candidate.action;

    // Priority actions are always immediately stable
    if (
      proposedAction === 'ARRIVED' ||
      proposedAction === 'PATH_BLOCKED' ||
      proposedAction === 'RELOCALIZE'
    ) {
      return candidate;
    }

    if (!currentAction) {
      // No stable yet — require STABILITY_WINDOW confirmations before committing
      const entry = this.candidateQueue.find((c) => c.action === proposedAction);
      if (entry && entry.count >= STABILITY_WINDOW) {
        return candidate;
      }
      return null;
    }

    if (proposedAction === currentAction) {
      // Same action — keep it stable, update the instruction details
      return candidate;
    }

    // Different action — require HYSTERESIS_WINDOW consecutive observations before switching
    const entry = this.candidateQueue.find((c) => c.action === proposedAction);
    if (entry && entry.count >= HYSTERESIS_WINDOW && now - entry.lastSeen < 4000) {
      return candidate;
    }

    // Not stable enough — return current stable instruction
    return this.stableInstruction;
  }

  private evaluateShouldSpeak(text: string, now: number): boolean {
    if (text !== this.lastSpokenText) return true;
    return now - this.lastVoiceTime >= VOICE_COOLDOWN_MS;
  }
}

export const instructionStabilityController = new InstructionStabilityController();
