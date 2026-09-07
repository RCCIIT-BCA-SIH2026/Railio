// ─────────────────────────────────────────────────────────────────────────────
// AI Camera Indoor Navigation — Core Types
// ─────────────────────────────────────────────────────────────────────────────

export type NavigationState =
  | 'IDLE'
  | 'REQUESTING_PERMISSION'
  | 'SCANNING'
  | 'LOCALIZING'
  | 'READY'
  | 'NAVIGATING'
  | 'TURNING'
  | 'APPROACHING_TARGET'
  | 'LOW_CONFIDENCE'
  | 'TRACKING_LOST'
  | 'TARGET_LOCKED'
  | 'OFF_ROUTE'
  | 'REROUTING'
  | 'RECOVERY'
  | 'ARRIVAL_CANDIDATE'
  | 'ARRIVED'
  | 'ERROR';

export type NavAction =
  | 'MOVE_FORWARD'
  | 'TURN_LEFT'
  | 'TURN_RIGHT'
  | 'SLIGHT_LEFT'
  | 'SLIGHT_RIGHT'
  | 'TURN_AROUND'
  | 'SCAN_LEFT'
  | 'SCAN_RIGHT'
  | 'SCAN_FULL'
  | 'STOP'
  | 'ENTER_DOOR'
  | 'TAKE_STAIRS'
  | 'TAKE_ELEVATOR'
  | 'WAIT'
  | 'RELOCALIZE'
  | 'REROUTE'
  | 'SCAN'
  | 'ARRIVED'
  | 'PATH_BLOCKED'
  | 'ORIENT';

export type GuidanceMode = 'VISUAL' | 'SPATIAL';

// Relative direction from the user's perspective (not image coordinates)
export type RelativeDirection =
  | 'FORWARD'
  | 'BACK'
  | 'LEFT'
  | 'RIGHT'
  | 'FORWARD_LEFT'
  | 'FORWARD_RIGHT'
  | 'BACK_LEFT'
  | 'BACK_RIGHT'
  | 'UNKNOWN';

export type ObjectConfirmationStatus = 'CANDIDATE' | 'PROBABLE' | 'CONFIRMED' | 'STALE' | 'LOST';

export type DoorSubtype =
  | 'DOOR'
  | 'ROOM_DOOR'
  | 'CLOSET_DOOR'
  | 'BATHROOM_DOOR'
  | 'EXIT_DOOR'
  | 'EMERGENCY_EXIT'
  | 'OPENING'
  | 'UNKNOWN';

export interface SpatialCoordinates {
  x: number; // meters relative to session origin (East-West)
  y: number; // meters relative to session origin (North-South)
  z: number; // floor level / elevation
}

export interface EstimatedPose {
  position: SpatialCoordinates;
  headingDeg: number;           // 0 to 360 degrees (magnetic north = 0)
  distanceWalkedMeters: number;
  stepCount: number;
  confidence: number;           // 0.0 to 1.0
  trackingStatus: 'NORMAL' | 'DEGRADED' | 'LOST' | 'LIMITED' | 'INITIALIZING';
  lastUpdated: number;

  // ARCore specific fields for 3D projection
  viewMatrix?: number[];
  projectionMatrix?: number[];

  // Raw AR / Sensor Telemetry
  rawTranslation?: { x: number; y: number; z: number };
  rawQuaternion?: { x: number; y: number; z: number; w: number };
  yaw?: number;
  pitch?: number;
  roll?: number;
}

// ─── Raw Detection (single frame, unconfirmed) ───────────────────────────────
export interface DetectedNavObject {
  id: string;
  type: 'door' | 'exit' | 'emergency_exit' | 'corridor' | 'stairs' | 'elevator' | 'platform' | 'sign' | 'obstacle' | 'landmark' | 'counter' | 'window' | 'cabinet';
  doorSubtype?: DoorSubtype;
  label: string;
  direction: 'left' | 'right' | 'straight' | 'slight_left' | 'slight_right' | 'behind';
  distanceEstimate: number;
  confidence: number;
  isOpenDoor?: boolean;
  hasExitSign?: boolean;
  hasVisibleCorridor?: boolean;
  boundingBox?: {
    ymin: number;
    xmin: number;
    ymax: number;
    xmax: number;
  };
}

// ─── Temporal Tracked Object (accumulated across multiple frames) ─────────────
export interface TemporalObservation {
  timestamp: number;
  confidence: number;
  direction: DetectedNavObject['direction'];
  boundingBox?: DetectedNavObject['boundingBox'];
  xCenter: number; // normalized 0-1 horizontal center in frame
}

export interface TrackedObject {
  trackId: string;              // persistent identity, e.g. 'door_01'
  type: DetectedNavObject['type'];
  doorSubtype?: DoorSubtype;
  label: string;
  observations: TemporalObservation[];
  confirmationStatus: ObjectConfirmationStatus;
  aggregateConfidence: number;  // weighted confidence across observations
  stableXCenter: number;        // smoothed normalized x position
  stableDirection: DetectedNavObject['direction'];
  isOpenDoor: boolean;
  hasExitSign: boolean;
  hasVisibleCorridor: boolean;
  firstSeen: number;
  lastSeen: number;
}

// ─── Structured Scene Understanding (AI output) ───────────────────────────────
export interface WalkablePath {
  direction: 'left' | 'right' | 'straight' | 'slight_left' | 'slight_right';
  walkable: boolean;
  clearDistanceMeters: number;
  confidence: number;
}

export interface DetectedSign {
  text: string;
  type: 'EXIT' | 'PLATFORM' | 'GATE' | 'ROOM' | 'STAIRS' | 'LIFT' | 'WAY_OUT' | 'EMERGENCY';
  direction?: 'left' | 'right' | 'straight' | 'up' | 'down';
  confidence: number;
}

export interface SceneUnderstanding {
  scene: string;
  objects: DetectedNavObject[];
  paths: WalkablePath[];
  signs: DetectedSign[];
  recommendedAction: NavAction;
  confidence: number;
  instructionText: string;
  timestamp: string;
  // ─── Scene versioning for stale-response protection ───
  sceneVersion?: number;        // must match current session sceneVersion to be accepted
  requestId?: string;           // unique per AI request for dedup
  sessionId?: string;           // navigation session id
}

// ─── Structured Navigation Decision (output of NavigationDecisionEngine) ─────
export interface NavigationDecision {
  action: NavAction;
  targetId: string | null;      // e.g. 'door_01'
  targetLabel: string;
  confidence: number;
  reason: string;               // human-readable decision rationale
  relativeDirection: RelativeDirection;
  estimatedDistanceMeters: number;
  isArrival: boolean;
  isRecovery: boolean;
  sceneVersion: number;
  timestamp: number;
}

// ─── Spatial Geometry ───────────────────────────────────────────────────────



export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export type ARTrackingState = 'NOT_AVAILABLE' | 'INITIALIZING' | 'LIMITED' | 'NORMAL' | 'LOST';

export interface SpatialTarget {
  id: string;
  semanticType: TrackedObject['type'];
  screenX: number;
  screenY: number;
  worldPosition: Vector3 | null;
  worldPositionConfidence: number;
  trackingState: ARTrackingState;
  lastSeen: number;
  source: 'GEMINI_VISION' | 'AR_TRACKER' | 'LOCALIZER';
}

// ─── Spatial Map ─────────────────────────────────────────────────────────────
export interface SpatialMapNode {
  id: string;
  type: 'room' | 'door' | 'corridor' | 'junction' | 'stairs' | 'elevator' | 'platform' | 'exit' | 'emergency_exit';
  name: string;
  coordinates: SpatialCoordinates;
  visualAnchors?: string[];
  isEmergency?: boolean;
  isStairs?: boolean;
  isLift?: boolean;
}

export interface SpatialMapEdge {
  from: string;
  to: string;
  distance: number;
  walkable: boolean;
  isStairs?: boolean;
  isLift?: boolean;
  isEmergency?: boolean;
}

export interface StructuredEnvironment {
  environmentId: string;
  name: string;
  nodes: SpatialMapNode[];
  edges: SpatialMapEdge[];
}

// ─── Navigation Instruction (final output to UI & voice) ─────────────────────
export interface NavigationInstruction {
  action: NavAction;
  spokenText: string;
  displayText: string;
  distanceMeters: number;
  targetObject?: string;
  confidence: number;
  arrowAngleDeg: number;  // 0 = straight, 90 = right, -90 = left, 180 = behind
  timestamp: number;
  guidanceMode?: GuidanceMode;
  geminiDistance?: string; // Distance estimate provided directly by Gemini visual reasoning
}

// ─── Destination Intent ───────────────────────────────────────────────────────
export interface DestinationIntent {
  rawQuery: string;
  intent: 'NAVIGATE' | 'EXPLORE' | 'EMERGENCY';
  targetType: 'exit' | 'platform' | 'elevator' | 'stairs' | 'restroom' | 'ticket_counter' | 'waiting_hall' | 'custom';
  targetLabel: string;
  targetNodeId?: string;
  preferences: {
    preferLift: boolean;
    avoidStairs: boolean;
    isEmergency: boolean;
  };
}

// ─── Session Summary ──────────────────────────────────────────────────────────
export interface NavigationSessionSummary {
  sessionId: string;
  destination: string;
  startTime: number;
  endTime: number;
  durationSeconds: number;
  distanceMeters: number;
  stepsTaken: number;
  recalculationsCount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Diagnostics & Tracing
// ─────────────────────────────────────────────────────────────────────────────

export interface DiagnosticDecisionLog {
  timestamp: number;
  frameId: string;
  sceneVersion: number;
  deviceHeadingDeg: number;
  rawXCenter: number | null;
  targetBearingDeg: number | null;
  targetWorldPosition?: Vector3 | null;
  cameraForwardVector?: Vector3 | null;
  relativeAngleDeg?: number;
  selectedTargetId: string | null;
  actionTaken: NavAction;
  reason: string;
  guidanceMode?: GuidanceMode;
}

// ─────────────────────────────────────────────────────────────────────────────
// Visual Verification — Structured Gemini Door / Target Inspection
//
// Gemini is used ONLY as the visual evidence layer.
// It must NOT assign coordinates, distances, or trigger navigation state.
// The navigation engine validates this evidence against AR tracking + route.
// ─────────────────────────────────────────────────────────────────────────────

export type DoorState = 'OPEN' | 'CLOSED' | 'UNKNOWN';

export type VisualTargetType =
  | 'DOOR'
  | 'EXIT'
  | 'SIGN'
  | 'LIFT'
  | 'STAIR'
  | 'LANDMARK'
  | 'UNKNOWN';

/**
 * Structured response from Gemini's visual door/target inspection.
 * Corresponds exactly to the schema defined in the user requirements.
 *
 * IMPORTANT: `targetVisible = true` alone NEVER triggers ARRIVED.
 * This is visual *evidence*, validated by ARCore proximity + temporal confirmation.
 */
export interface VisualVerification {
  /** Was the requested target visually identified in this frame? */
  targetVisible: boolean;
  /** What type of target was visually detected? */
  targetType: VisualTargetType;
  /** Is the door open, closed, or unknown? */
  doorState: DoorState;
  /** Human-readable label of what was detected (e.g. "Main Exit") */
  label: string;
  /** Visual confidence of this detection (0.0 – 1.0). NEVER faked. */
  confidence: number;
  /** Bounding box in raw pixel coordinates (0–1000 scale from Gemini) */
  boundingBox: {
    ymin: number;
    xmin: number;
    ymax: number;
    xmax: number;
  } | null;
  /** Human-readable evidence list (e.g. ["green EXIT sign", "double glass door"]) */
  evidence: string[];
  /** Timestamp of this inspection */
  timestamp: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// AR Debug Frame — Full diagnostics per navigation evaluation frame
// ─────────────────────────────────────────────────────────────────────────────

export interface ARDebugFrame {
  state: string;
  trackingStatus: string;
  arConfidence: number;
  position: { x: number; y: number; z: number };
  translationDeltaM: number;
  rotationDeltaDeg: number;
  smoothedTranslationDeltaM: number;
  distanceToDestinationM: number | null;
  arrivalCandidate: boolean;
  arrivalFrames: number;
  visualTarget: string | null;
  visualConfidence: number;
  doorState: DoorState;
}
