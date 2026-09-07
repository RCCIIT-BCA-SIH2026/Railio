// ─────────────────────────────────────────────────────────────────────────────
// navigationConstants.ts — Thresholds for ARCore Indoor Navigation
//
// PHYSICAL RULE ENFORCED:
//   "Rotating in place MUST NOT create translational distance."
//
// Key changes:
//   - MAX_SINGLE_STEP_TRANSLATION_M: 1.5m → 0.5m  (aggressive spike rejection)
//   - ROTATION_SPIKE_THRESHOLD_DEG:  12°  → 5°    (classify rotation earlier)
//   - POSITION_EMA_ALPHA: new — smooths absolute position, not just deltas
//   - HORIZONTAL_ONLY_DISTANCE: enforce XZ-plane distance (ignore Y/height)
// ─────────────────────────────────────────────────────────────────────────────

/** Must be closer than this (meters) before arrival confirmation can start. */
export const ARRIVAL_THRESHOLD_METERS = 0.8;

/** Consecutive pose samples that must remain valid before ARRIVED. */
export const ARRIVAL_CONFIRMATION_FRAMES = 15;

/** Pose / localization confidence required to treat tracking as stable. */
export const STABLE_CONFIDENCE_THRESHOLD = 0.75;

/** Pose samples older than this are treated as stale (ms). */
export const POSE_STALE_MS = 2500;

export const GUIDANCE_NAV_STATES = [
  'NAVIGATING',
  'TURNING',
  'APPROACHING_TARGET',
  'TARGET_LOCKED',
  'ARRIVAL_CANDIDATE',
] as const;

// ─── Translation / Rotation Separation ───────────────────────────────────────
// These constants enforce the physical rule:
//   "Rotating in place must NOT create translational distance."

/**
 * If a heading change exceeds this value (degrees) in one pose tick,
 * the frame is classified as a ROTATION frame. The position accumulator
 * and step-count/distance are NOT advanced.
 *
 * Lowered from 12° → 5° so that gentle phone rotations are caught early
 * before their quaternion-coupled translation noise reaches the navigator.
 */
export const ROTATION_SPIKE_THRESHOLD_DEG = 5;

/**
 * Maximum horizontal (XZ-plane) translation (meters) allowed in a single
 * pose frame when the rotation delta is above ROTATION_SPIKE_THRESHOLD_DEG.
 * Steps above this during rotation are discarded as vibration artifacts.
 */
export const STATIONARY_TRANSLATION_MAX_M = 0.03;

/**
 * A single pose frame cannot produce more than this many meters of horizontal
 * displacement. Anything above is an impossible spike and is rejected.
 *
 * Lowered from 1.5m → 0.5m for more aggressive spike rejection.
 */
export const MAX_SINGLE_STEP_TRANSLATION_M = 0.5;

/**
 * Minimum horizontal translation delta (meters) between two consecutive pose
 * snapshots that counts as "the user actually moved".
 * Below this, navigation re-evaluation is skipped to avoid churn from jitter.
 */
export const MOVEMENT_DETECTION_THRESHOLD_M = 0.05;

// ─── Position Smoothing ───────────────────────────────────────────────────────

/**
 * EMA alpha for smoothing the absolute position reported to navigators.
 * Higher = more responsive, lower = smoother.
 * Applied to the relative position vector, not raw ARCore pose.
 */
export const POSITION_EMA_ALPHA = 0.3;

/**
 * EMA alpha for smoothing per-frame translation deltas.
 * Separate from position smoothing.
 */
export const TRANSLATION_DELTA_EMA_ALPHA = 0.25;

// ─── Distance Calculation ─────────────────────────────────────────────────────

/**
 * When true, navigation distance is computed only on the horizontal XZ plane,
 * ignoring the Y (vertical height) axis.
 *
 * This is CRITICAL for indoor navigation: phone tilt or ARCore Y-axis drift
 * must NOT change the reported distance to the destination.
 */
export const HORIZONTAL_ONLY_DISTANCE = true;

// ─── Log Rate Limiting ────────────────────────────────────────────────────────

/**
 * Minimum interval (ms) between periodic position/nav diagnostic logs.
 * Per-frame logging is disabled; only log when meaningfully changed or
 * this interval has elapsed.
 */
export const LOG_RATE_LIMIT_MS = 2000;

/**
 * Minimum horizontal translation (meters) that triggers an immediate
 * position log (even if LOG_RATE_LIMIT_MS has not elapsed).
 */
export const LOG_MOVEMENT_THRESHOLD_M = 0.1;
