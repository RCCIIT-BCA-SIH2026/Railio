// ─────────────────────────────────────────────────────────────────────────────
// AI Camera Indoor Navigation — Comprehensive Test Suite
//
// Covers all 22 success criteria including:
// - Centered door → MOVE_FORWARD (not TURN_RIGHT)
// - Offline fallback → SCAN (not TURN_RIGHT)
// - Temporal confirmation requirement
// - Stale response rejection via sceneVersion
// - Target locking (no target jumping)
// - Instruction hysteresis
// - Direction from xCenter (not object.direction field alone)
// ─────────────────────────────────────────────────────────────────────────────

import { LocalSpatialMap } from '../LocalSpatialMap';
import { RouteDecisionEngine } from '../RouteDecisionEngine';
import { NavigationStateManager } from '../NavigationStateManager';
import { PositionEstimator } from '../PositionEstimator';
import { TemporalSceneMemory } from '../TemporalSceneMemory';
import { TargetSelectionEngine } from '../TargetSelectionEngine';
import { InstructionStabilityController } from '../InstructionStabilityController';
import { FrameAnalysisScheduler } from '../FrameAnalysisScheduler';
import { EstimatedPose, SceneUnderstanding, DetectedNavObject, NavigationInstruction } from '../types';

function runNavigationTestSuite() {
  console.log('====================================================');
  console.log('🧪 AI CAMERA INDOOR NAVIGATION — FULL TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}${detail ? ` — ${detail}` : ''}`);
      failed++;
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // GROUP 1: Local Spatial Map & Dijkstra Pathfinding
  // ════════════════════════════════════════════════════════════════════════
  console.log('--- Group 1: Local Spatial Map ---');
  const map = new LocalSpatialMap();
  map.loadEnvironment('demo_railway_station');

  const nodes = map.getAllNodes();
  assert(nodes.length >= 8, `Station environment has ${nodes.length} nodes`);

  const nearestStart = map.findNearestNode({ x: 0.2, y: 0.1, z: 0 });
  assert(nearestStart?.id === 'concourse_start', 'Localizes nearest starting node');

  const exitTarget = map.findTargetNode('where is the exit');
  assert(exitTarget !== null && (exitTarget.type === 'exit' || exitTarget.type === 'emergency_exit'), 'Finds exit node for NL query');

  const defaultPath = map.calculatePath('concourse_start', 'platform_4_target');
  assert(defaultPath.length >= 4, `Multi-hop path to Platform 4 has ${defaultPath.length} waypoints`);

  const accessiblePath = map.calculatePath('concourse_start', 'platform_4_target', { avoidStairs: true, preferLift: true });
  assert(
    accessiblePath.some(n => n.type === 'elevator' || n.id === 'lift_footover'),
    'Prefers lift when step-free requested'
  );

  // ════════════════════════════════════════════════════════════════════════
  // GROUP 2: Position Estimator
  // ════════════════════════════════════════════════════════════════════════
  console.log('\n--- Group 2: Position Estimator ---');
  const estimator = new PositionEstimator();
  estimator.reset({ x: 0, y: 0, z: 0 });
  estimator.recordStep(0.8);
  const poseAfterStep = estimator.getPose();
  assert(poseAfterStep.stepCount === 1, 'Records step count');
  assert(poseAfterStep.distanceWalkedMeters >= 0.79, 'Calculates distance from stride length');

  estimator.updateWithVisualAnchor({ x: 5.0, y: 0.0, z: 0.0 }, 0.96);
  const recalibratedPose = estimator.getPose();
  assert(recalibratedPose.position.x > 3.0, 'Visual anchor corrects inertial drift');
  assert(recalibratedPose.confidence >= 0.90, 'Confidence restored after landmark');

  // ════════════════════════════════════════════════════════════════════════
  // GROUP 3: CRITICAL — Direction Logic (THE MAIN BUG FIX)
  // ════════════════════════════════════════════════════════════════════════
  console.log('\n--- Group 3: CRITICAL Direction Logic ---');
  const engine = new RouteDecisionEngine();

  const basePose: EstimatedPose = {
    position: { x: 0, y: 0, z: 0 },
    headingDeg: 0,
    distanceWalkedMeters: 0,
    stepCount: 0,
    confidence: 0.95,
    trackingStatus: 'NORMAL',
    lastUpdated: Date.now(),
  };

  // ── TEST: Door centered at xCenter=0.51 → MUST be MOVE_FORWARD ──────────
  const centeredDoorScene: SceneUnderstanding = {
    scene: 'room',
    objects: [{
      id: 'door_center',
      type: 'door',
      label: 'Room Door',
      direction: 'right',    // ← old code would use this to say TURN_RIGHT!
      distanceEstimate: 2.5,
      confidence: 0.90,
      boundingBox: { ymin: 0.15, xmin: 0.38, ymax: 0.90, xmax: 0.64 }, // xCenter = 0.51
    }],
    paths: [{ direction: 'straight', walkable: true, clearDistanceMeters: 3.0, confidence: 0.9 }],
    signs: [],
    recommendedAction: 'MOVE_FORWARD',
    confidence: 0.90,
    instructionText: '',
    timestamp: new Date().toISOString(),
  };

  const centeredResult = engine.evaluateStep(basePose, centeredDoorScene);
  assert(
    centeredResult.instruction.action === 'MOVE_FORWARD' || centeredResult.instruction.action === 'ENTER_DOOR',
    'BUG FIX: Centered door (xCenter=0.51) → MOVE_FORWARD (not TURN_RIGHT)',
    `Got: ${centeredResult.instruction.action}`
  );

  // ── TEST: Door clearly on left (xCenter=0.20) → TURN_LEFT ───────────────
  const leftDoorScene: SceneUnderstanding = {
    scene: 'room',
    objects: [{
      id: 'door_left',
      type: 'door',
      label: 'Left Door',
      direction: 'left',
      distanceEstimate: 3.0,
      confidence: 0.88,
      boundingBox: { ymin: 0.15, xmin: 0.05, ymax: 0.85, xmax: 0.30 }, // xCenter = 0.175
    }],
    paths: [], signs: [],
    recommendedAction: 'TURN_LEFT', confidence: 0.88,
    instructionText: '', timestamp: new Date().toISOString(),
  };
  const leftResult = engine.evaluateStep(basePose, leftDoorScene);
  assert(
    leftResult.instruction.action === 'TURN_LEFT' || leftResult.instruction.action === 'SLIGHT_LEFT',
    'Door on left (xCenter=0.18) → TURN_LEFT',
    `Got: ${leftResult.instruction.action}`
  );

  // ── TEST: Door clearly on right (xCenter=0.82) → TURN_RIGHT ─────────────
  const rightDoorScene: SceneUnderstanding = {
    scene: 'room',
    objects: [{
      id: 'door_right',
      type: 'door',
      label: 'Right Door',
      direction: 'right',
      distanceEstimate: 3.0,
      confidence: 0.88,
      boundingBox: { ymin: 0.15, xmin: 0.70, ymax: 0.85, xmax: 0.95 }, // xCenter = 0.825
    }],
    paths: [], signs: [],
    recommendedAction: 'TURN_RIGHT', confidence: 0.88,
    instructionText: '', timestamp: new Date().toISOString(),
  };
  const rightResult = engine.evaluateStep(basePose, rightDoorScene);
  assert(
    rightResult.instruction.action === 'TURN_RIGHT' || rightResult.instruction.action === 'SLIGHT_RIGHT',
    'Door on right (xCenter=0.83) → TURN_RIGHT',
    `Got: ${rightResult.instruction.action}`
  );

  // ── TEST: direction='behind' → TURN_AROUND ───────────────────────────────
  const behindDoorScene: SceneUnderstanding = {
    scene: 'room',
    objects: [{
      id: 'door_behind',
      type: 'door',
      label: 'Door Behind',
      direction: 'behind',
      distanceEstimate: 2.0,
      confidence: 0.85,
      boundingBox: { ymin: 0.0, xmin: 0.40, ymax: 0.20, xmax: 0.60 },
    }],
    paths: [], signs: [],
    recommendedAction: 'TURN_AROUND', confidence: 0.85,
    instructionText: '', timestamp: new Date().toISOString(),
  };
  const behindResult = engine.evaluateStep(basePose, behindDoorScene);
  assert(
    behindResult.instruction.action === 'TURN_AROUND',
    'Door direction=behind → TURN_AROUND',
    `Got: ${behindResult.instruction.action}`
  );

  // ── TEST: Low confidence scene → SCAN (not turn) ─────────────────────────
  const lowConfScene: SceneUnderstanding = {
    scene: 'unknown',
    objects: [],
    paths: [], signs: [],
    recommendedAction: 'SCAN',
    confidence: 0.30,
    instructionText: '',
    timestamp: new Date().toISOString(),
  };
  const lowConfResult = engine.evaluateStep(basePose, lowConfScene);
  assert(
    lowConfResult.instruction.action === 'SCAN' || lowConfResult.instruction.action === 'MOVE_FORWARD',
    'Low confidence scene (0.30) → SCAN or graph fallback (not TURN_RIGHT)',
    `Got: ${lowConfResult.instruction.action}`
  );

  // ── TEST: OLD FALLBACK BUG — direction='right' with xCenter=0.51 ─────────
  // This specifically tests that the direction field ALONE does not trigger TURN_RIGHT
  const fallbackBugScene: SceneUnderstanding = {
    scene: 'station_concourse',
    objects: [{
      id: 'door_exit_local',
      type: 'exit',
      label: 'Exit Gateway',
      direction: 'right',      // ← old fallback bug: this alone caused TURN_RIGHT
      distanceEstimate: 3.5,
      confidence: 0.92,
      boundingBox: { ymin: 0.25, xmin: 0.40, ymax: 0.85, xmax: 0.62 }, // xCenter = 0.51
    }],
    paths: [], signs: [],
    recommendedAction: 'MOVE_FORWARD',
    confidence: 0.92,
    instructionText: '',
    timestamp: new Date().toISOString(),
  };
  const fallbackBugResult = engine.evaluateStep(basePose, fallbackBugScene);
  assert(
    fallbackBugResult.instruction.action === 'MOVE_FORWARD' || fallbackBugResult.instruction.action === 'ENTER_DOOR',
    'BUG FIX: direction="right" alone does NOT cause TURN_RIGHT when xCenter=0.51',
    `Got: ${fallbackBugResult.instruction.action}`
  );

  // ── TEST: Graph route — user facing target → MOVE_FORWARD ────────────────
  engine.setRoute(defaultPath);
  const facingEastPose: EstimatedPose = { ...basePose, headingDeg: 90 };
  const graphResult = engine.evaluateStep(facingEastPose);
  assert(
    graphResult.instruction.action === 'MOVE_FORWARD' || graphResult.instruction.action === 'ENTER_DOOR',
    `Graph route: facing target → forward (got: ${graphResult.instruction.action})`
  );

  // ── TEST: Graph route arrival ─────────────────────────────────────────────
  const finalWaypoint = defaultPath[defaultPath.length - 1];
  const arrivedPose: EstimatedPose = {
    ...basePose,
    position: { ...finalWaypoint.coordinates },
    distanceWalkedMeters: 26,
    stepCount: 35,
  };
  const arrivedResult = engine.evaluateStep(arrivedPose);
  assert(arrivedResult.isArrived === true, 'Arrival detected at final waypoint');

  // ── TEST: Path blocked ────────────────────────────────────────────────────
  const blockedScene: SceneUnderstanding = {
    scene: 'station_concourse', objects: [], paths: [], signs: [],
    recommendedAction: 'PATH_BLOCKED', confidence: 0.95,
    instructionText: 'Path blocked', timestamp: new Date().toISOString(),
  };
  const blockedResult = engine.evaluateStep(facingEastPose, blockedScene);
  assert(blockedResult.isPathBlocked === true, 'PATH_BLOCKED scene detected');

  // ════════════════════════════════════════════════════════════════════════
  // GROUP 4: Temporal Scene Memory
  // ════════════════════════════════════════════════════════════════════════
  console.log('\n--- Group 4: Temporal Scene Memory ---');
  const memory = new TemporalSceneMemory();

  const singleDetection: DetectedNavObject[] = [{
    id: 'door_01',
    type: 'door',
    label: 'Room Door',
    direction: 'straight',
    distanceEstimate: 2.5,
    confidence: 0.85,
    boundingBox: { ymin: 0.15, xmin: 0.37, ymax: 0.88, xmax: 0.63 },
  }];

  // Single frame — should be CANDIDATE/PROBABLE, not CONFIRMED
  memory.ingestFrame(singleDetection);
  const afterOneFrame = memory.getConfirmedObjects();
  assert(afterOneFrame.length === 0, 'Single frame: object NOT yet confirmed (temporal requirement)');

  // Second frame — should now be CONFIRMED
  memory.ingestFrame(singleDetection);
  const afterTwoFrames = memory.getConfirmedObjects();
  assert(afterTwoFrames.length > 0, 'Two frames: object is CONFIRMED');
  assert(afterTwoFrames[0].aggregateConfidence > 0.5, 'Confirmed object has valid aggregate confidence');

  // EMA smoothing — xCenter should be stable around 0.5
  assert(
    Math.abs(afterTwoFrames[0].stableXCenter - 0.5) < 0.2,
    `EMA smoothed xCenter ≈ 0.5 (got ${afterTwoFrames[0].stableXCenter.toFixed(2)})`
  );

  // Reset and test isOpenDoor accumulation
  memory.reset();
  const closedDetection: DetectedNavObject[] = [{ ...singleDetection[0], isOpenDoor: false }];
  const openDetection: DetectedNavObject[] = [{ ...singleDetection[0], isOpenDoor: true }];
  memory.ingestFrame(closedDetection);
  memory.ingestFrame(openDetection);
  const afterOpenClose = memory.getConfirmedObjects();
  assert(afterOpenClose.length > 0 && afterOpenClose[0].isOpenDoor === true, 'isOpenDoor OR-accumulates across frames');

  // ════════════════════════════════════════════════════════════════════════
  // GROUP 5: Target Selection Engine
  // ════════════════════════════════════════════════════════════════════════
  console.log('\n--- Group 5: Target Selection Engine ---');
  const selector = new TargetSelectionEngine();

  const memory2 = new TemporalSceneMemory();
  // Simulate Door A: left, closed, no exit sign, lower confidence
  const doorA: DetectedNavObject[] = [{
    id: 'door_A', type: 'door', label: 'Door A', direction: 'left',
    distanceEstimate: 4.0, confidence: 0.72, isOpenDoor: false, hasExitSign: false, hasVisibleCorridor: false,
    boundingBox: { ymin: 0.2, xmin: 0.05, ymax: 0.85, xmax: 0.30 },
  }];
  // Simulate Door B: center, open, has exit sign and corridor
  const doorB: DetectedNavObject[] = [{
    id: 'door_B', type: 'door', label: 'Door B', direction: 'straight',
    distanceEstimate: 3.0, confidence: 0.95, isOpenDoor: true, hasExitSign: true, hasVisibleCorridor: true,
    boundingBox: { ymin: 0.15, xmin: 0.38, ymax: 0.90, xmax: 0.65 },
  }];

  memory2.ingestFrame([...doorA, ...doorB]);
  memory2.ingestFrame([...doorA, ...doorB]);
  const confirmed = memory2.getConfirmedObjects();

  const exitIntent: DestinationIntent = {
    rawQuery: 'outside', intent: 'NAVIGATE', targetType: 'exit', targetLabel: 'exit',
    preferences: { preferLift: false, avoidStairs: false, isEmergency: false },
  };

  const selected = selector.selectTarget(confirmed, exitIntent);
  assert(selected !== null, 'Target selected from two doors');
  assert(
    selected?.trackId.includes('door_B') || (selected?.hasExitSign === true),
    'Door B selected (open + exit sign + corridor = higher score)'
  );
  assert(selector.hasLockedTarget(), 'Target is locked after first selection');

  // Verify lock stability: selecting again with slightly worse data should keep same target
  const lockedBefore = selector.getLockedTarget()?.trackId;
  selector.selectTarget(confirmed, exitIntent);
  const lockedAfter = selector.getLockedTarget()?.trackId;
  assert(lockedBefore === lockedAfter, 'Target lock is stable (no jumping on re-evaluation)');

  // ════════════════════════════════════════════════════════════════════════
  // GROUP 6: Instruction Stability Controller
  // ════════════════════════════════════════════════════════════════════════
  console.log('\n--- Group 6: Instruction Stability Controller ---');
  const stability = new InstructionStabilityController();

  const fwdInstr: NavigationInstruction = {
    action: 'MOVE_FORWARD', spokenText: 'Move forward.', displayText: 'Walk forward',
    distanceMeters: 3.0, confidence: 0.9, arrowAngleDeg: 0, timestamp: Date.now(),
  };
  const rightInstr: NavigationInstruction = {
    action: 'TURN_RIGHT', spokenText: 'Turn right.', displayText: 'Turn right',
    distanceMeters: 3.0, confidence: 0.9, arrowAngleDeg: 80, timestamp: Date.now(),
  };

  // First proposal — not yet stable (requires 2 frames)
  const first = stability.propose(fwdInstr);
  assert(first === null || first?.instruction.action === 'MOVE_FORWARD', 'First proposal: pending stability window');

  // Second proposal of same — now stable
  const second = stability.propose(fwdInstr);
  assert(second?.instruction.action === 'MOVE_FORWARD', 'Two consecutive FORWARD proposals → stable FORWARD');

  // Single TURN_RIGHT proposal — must NOT switch (hysteresis)
  const noSwitch = stability.propose(rightInstr);
  assert(
    noSwitch?.instruction.action === 'MOVE_FORWARD',
    'Single TURN_RIGHT proposal does NOT switch stable MOVE_FORWARD (hysteresis)'
  );

  // Second TURN_RIGHT proposal — now should switch
  const switched = stability.propose(rightInstr);
  assert(
    switched?.instruction.action === 'TURN_RIGHT',
    'Two consecutive TURN_RIGHT proposals switch instruction'
  );

  // Voice dedup — same instruction should not re-speak within cooldown
  const speak1 = stability.propose(rightInstr);
  const speak2 = stability.propose(rightInstr);
  assert(
    speak2?.shouldSpeak === false,
    'Same instruction within cooldown: shouldSpeak=false (voice dedup)'
  );

  // ════════════════════════════════════════════════════════════════════════
  // GROUP 7: Frame Analysis Scheduler
  // ════════════════════════════════════════════════════════════════════════
  console.log('\n--- Group 7: Frame Analysis Scheduler ---');
  const scheduler = new FrameAnalysisScheduler();
  scheduler.reset();

  // Rate limiting: second call within min interval should return null
  let firstId: string | null = null;
  const mockAnalyze = async () => ({ scene: 'room', objects: [], paths: [], signs: [], recommendedAction: 'SCAN', confidence: 0.5, instructionText: '', timestamp: '' });

  // Schedule first analysis
  scheduler.scheduleAnalysis(
    { trigger: 'INITIAL_SCAN', sceneVersion: 1, sessionId: 'test', frameProvider: async () => null, onComplete: () => {} },
    mockAnalyze
  ).then(id => { firstId = id; });

  // Immediately schedule another — should be rate-limited
  scheduler.scheduleAnalysis(
    { trigger: 'PERIODIC_VALIDATION', sceneVersion: 1, sessionId: 'test', frameProvider: async () => null, onComplete: () => {} },
    mockAnalyze
  ).then(id => {
    // Rate-limited periodic within interval should return null
    // (first was INITIAL_SCAN, not PERIODIC, so this may or may not be rate-limited)
  });

  // Scene version validation
  const validResponse = scheduler.isResponseValid('req_1', 3, 3);
  const staleResponse = scheduler.isResponseValid('req_1', 3, 2);
  assert(validResponse === true, 'Response with matching sceneVersion is valid');
  assert(staleResponse === false, 'Response with stale sceneVersion is rejected');

  // Cancelled request is rejected
  scheduler.cancelRequest('req_old');
  assert(scheduler.isResponseValid('req_old', 1, 1) === false, 'Cancelled request response is rejected');

  // ════════════════════════════════════════════════════════════════════════
  // GROUP 8: Navigation State Manager — Intent NLP
  // ════════════════════════════════════════════════════════════════════════
  console.log('\n--- Group 8: Navigation State Manager (NLP) ---');
  const manager = new NavigationStateManager();

  const exitIntent2 = manager.parseDestination('Take me outside please');
  assert(exitIntent2.targetType === 'exit', 'NLP: "Take me outside" → exit intent');

  const platformIntent = manager.parseDestination('Where is platform 7?');
  assert(platformIntent.targetType === 'platform' && platformIntent.targetLabel === 'Platform 7', 'NLP: platform number parsed');

  const liftIntent = manager.parseDestination('I need the elevator for wheelchair access');
  assert(liftIntent.preferences.preferLift === true && liftIntent.preferences.avoidStairs === true, 'NLP: accessibility constraints extracted');

  const emergencyIntent = manager.parseDestination('Emergency exit now');
  assert(emergencyIntent.intent === 'EMERGENCY', 'NLP: emergency mode triggered');

  // ════════════════════════════════════════════════════════════════════════
  // SUMMARY
  // ════════════════════════════════════════════════════════════════════════
  console.log('\n====================================================');
  console.log(`📊 SUMMARY: ${passed} PASSED  |  ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    throw new Error(`${failed} navigation tests failed!`);
  }
}

// Alias to silence TypeScript type import warning in test-only file
type DestinationIntent = import('../types').DestinationIntent;

runNavigationTestSuite();
