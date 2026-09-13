import { liveNavigationService, isValidCoordinate, isValidLocation } from '../LiveNavigationService';
import { haversineDistanceMeters } from '../../../utils/RailwayMatcher';

function assert(condition: boolean, title: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${title}`);
  } else {
    console.error(`  ❌ FAIL: ${title} ${detail ? `(${detail})` : ''}`);
    throw new Error(`Test failed: ${title}`);
  }
}

export function runLiveNavigationDataFlowTests() {
  console.log('====================================================');
  console.log('🧪 LIVE NAVIGATION PIPELINE & DATA FLOW TEST SUITE');
  console.log('====================================================\n');

  // Test 1: Valid destination + valid GPS fix produces distance > 0
  liveNavigationService.stopNavigation();
  liveNavigationService.startNavigation(
    { latitude: 20.0076, longitude: 73.7431, name: 'Satpur' },
    'walking'
  );

  const stateBefore = liveNavigationService.getState();
  assert(stateBefore.remainingDistanceMeters === null, 'Initial state before GPS has remainingDistanceMeters === null');
  assert(stateBefore.status === 'waiting_for_gps', 'Initial status is waiting_for_gps');

  liveNavigationService.handleLocationUpdate({
    coords: { latitude: 19.9970, longitude: 73.7400, accuracy: 5, speed: 1.4, heading: 45 },
    timestamp: Date.now(),
  });

  const stateAfter = liveNavigationService.getState();
  assert(stateAfter.remainingDistanceMeters !== null && stateAfter.remainingDistanceMeters > 0, 'GPS fix updates remainingDistanceMeters > 0', `Got ${stateAfter.remainingDistanceMeters}`);
  assert(stateAfter.status === 'navigating', 'Status updates to navigating');

  // Test 2: 1.2 km separation produces distance approx 1200m
  liveNavigationService.stopNavigation();
  const destLat = 20.0076;
  const destLng = 73.7431;
  const userLat = 19.9970;
  const userLng = 73.7400;

  liveNavigationService.startNavigation({ latitude: destLat, longitude: destLng, name: 'Satpur' }, 'walking');
  const expectedDist = haversineDistanceMeters(userLat, userLng, destLat, destLng);
  assert(expectedDist > 1100 && expectedDist < 1300, `Haversine distance calculation is approx 1.2 km (got ${Math.round(expectedDist)}m)`);

  liveNavigationService.handleLocationUpdate({
    coords: { latitude: userLat, longitude: userLng, accuracy: 8, speed: 1.2 },
    timestamp: Date.now(),
  });

  const distState = liveNavigationService.getState();
  assert(distState.remainingDistanceMeters === Math.round(expectedDist), `Service state remainingDistanceMeters matches Haversine distance (${distState.remainingDistanceMeters}m)`);

  // Test 3: Walking updates produce speed > 0 and ETA > 0
  liveNavigationService.stopNavigation();
  liveNavigationService.startNavigation({ latitude: destLat, longitude: destLng, name: 'Satpur' }, 'walking');
  const now = Date.now();

  liveNavigationService.handleLocationUpdate({
    coords: { latitude: userLat, longitude: userLng, accuracy: 5, speed: 1.3 },
    timestamp: now,
  });

  liveNavigationService.handleLocationUpdate({
    coords: { latitude: userLat + 0.0001, longitude: userLng + 0.0001, accuracy: 5, speed: 1.5 },
    timestamp: now + 3000,
  });

  const walkState = liveNavigationService.getState();
  assert(walkState.speedKmh !== null && walkState.speedKmh > 0, `Walking produces valid speedKmh > 0 (got ${walkState.speedKmh} km/h)`);
  assert(walkState.etaSeconds !== null && walkState.etaSeconds > 0, `Walking produces valid etaSeconds > 0 (got ${walkState.etaSeconds} s)`);

  // Test 4: No GPS fix returns distance = null and status = waiting_for_gps (NOT 0)
  liveNavigationService.stopNavigation();
  liveNavigationService.startNavigation({ latitude: 22.5675, longitude: 88.3712, name: 'Sealdah' }, 'walking');
  const noGpsState = liveNavigationService.getState();
  assert(noGpsState.remainingDistanceMeters === null, 'No GPS fix leaves distance as null (not 0)');
  assert(noGpsState.status === 'waiting_for_gps', 'No GPS fix leaves status as waiting_for_gps');

  // Test 5: Invalid destination sets status = destination_unavailable
  liveNavigationService.stopNavigation();
  liveNavigationService.startNavigation({ latitude: NaN, longitude: 88.3712, name: 'Invalid' }, 'walking');
  const invalidState = liveNavigationService.getState();
  assert(invalidState.status === 'destination_unavailable', 'Invalid coordinates trigger status = destination_unavailable');
  assert(invalidState.remainingDistanceMeters === null, 'Invalid coordinates leave distance as null');

  // Test 6: RailwayMatcher unavailable does not block generic GPS distance
  liveNavigationService.stopNavigation();
  liveNavigationService.startNavigation({ latitude: 20.0076, longitude: 73.7431, name: 'Satpur' }, 'walking');
  liveNavigationService.handleLocationUpdate({
    coords: { latitude: 19.9970, longitude: 73.7400, accuracy: 10 },
    timestamp: Date.now(),
  });
  const genericNavState = liveNavigationService.getState();
  assert(genericNavState.remainingDistanceMeters !== null && genericNavState.remainingDistanceMeters > 1000, 'Basic GPS distance works when far from railway corridor');

  // Test 7: Helper function validations
  assert(isValidCoordinate(22.5675, 88.3712) === true, 'isValidCoordinate(22.5675, 88.3712) === true');
  assert(isValidCoordinate(0, 0) === false, 'isValidCoordinate(0, 0) === false');
  assert(isValidLocation({ coords: { latitude: 22.5675, longitude: 88.3712 }, timestamp: Date.now() }) === true, 'isValidLocation with valid fix === true');
  assert(isValidLocation({ coords: { latitude: 0, longitude: 0 }, timestamp: Date.now() }) === false, 'isValidLocation with (0,0) === false');

  console.log('\n====================================================');
  console.log('🎉 ALL LIVE NAVIGATION DATA FLOW TESTS PASSED!');
  console.log('====================================================\n');
}

runLiveNavigationDataFlowTests();
