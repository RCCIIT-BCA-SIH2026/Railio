import { MotionFusionEngine, MotionObservation } from './MotionFusionEngine';

describe('MotionFusionEngine', () => {
  let engine: MotionFusionEngine;

  beforeEach(() => {
    engine = new MotionFusionEngine();
  });

  const generateScenario = (
    baseSpeed: number, 
    bearing: number, 
    variance: number, 
    latBase: number,
    lngBase: number,
    count: number,
    isTrainContext: boolean
  ) => {
    let t = Date.now();
    for (let i = 0; i < count; i++) {
      engine.addObservation({
        timestamp: t + i * 2000,
        gpsSpeedMps: (baseSpeed + (Math.random() * variance - variance / 2)) / 3.6,
        gpsAccuracyMeters: 5,
        bearingDegrees: bearing,
        accelerometer: { x: 0, y: isTrainContext ? 0.01 : Math.random() * 0.1, z: 1.0 },
        latitude: latBase + i * 0.0001,
        longitude: lngBase,
        currentJourneyMode: isTrainContext ? 'TRAIN' : 'UNKNOWN'
      });
    }
  };

  it('Test 1: Fast Train (60 km/h) -> Should be TRAIN', () => {
    generateScenario(60, 10, 2, 22.5675, 88.3712, 5, true);
    expect(engine.getState().mode).toBe('TRAIN');
  });

  it('Test 2: Medium Train (25 km/h) -> Should be TRAIN', () => {
    generateScenario(25, 10, 2, 22.5675, 88.3712, 5, true);
    expect(engine.getState().mode).toBe('TRAIN');
  });

  it('Test 3: Slow Train (10 km/h) -> Should be TRAIN', () => {
    generateScenario(10, 10, 2, 22.5675, 88.3712, 5, true);
    expect(engine.getState().mode).toBe('TRAIN');
  });

  it('Test 4: Stopped Train (0 km/h) -> Should be TRAIN_STOPPED or TRAIN', () => {
    generateScenario(40, 10, 0, 22.5675, 88.3712, 3, true);
    
    // Stop at station
    for (let i = 0; i < 5; i++) {
      engine.addObservation({
        timestamp: Date.now() + i * 2000,
        gpsSpeedMps: 0,
        gpsAccuracyMeters: 5,
        bearingDegrees: 10,
        accelerometer: { x: 0, y: 0, z: 1.0 },
        latitude: 22.5675,
        longitude: 88.3712,
        currentJourneyMode: 'TRAIN'
      });
    }
    const state = engine.getState();
    expect(['TRAIN', 'TRAIN_STOPPED', 'STATIONARY']).toContain(state.mode);
  });

  it('Test 5: GPS Noise Rejection (Native 0.9 km/h, Derived 11.5 km/h spike with 28m accuracy)', () => {
    const t = Date.now();
    engine.addObservation({
      timestamp: t,
      latitude: 22.7103,
      longitude: 88.3866,
      gpsSpeedMps: 0.25, // 0.9 km/h native
      gpsAccuracyMeters: 28,
      currentJourneyMode: 'TRAIN'
    });

    // Add noisy fix 1.5 seconds later (6 meters jitter)
    engine.addObservation({
      timestamp: t + 1500,
      latitude: 22.71035, // 5.5m position jump
      longitude: 88.38665,
      gpsSpeedMps: 0.25, // 0.9 km/h native
      gpsAccuracyMeters: 28,
      currentJourneyMode: 'TRAIN'
    });

    const state = engine.getState();
    // Raw native speed should be prioritized over 11+ km/h derived jitter
    expect(state.rawSpeedKmh).toBeLessThan(4);
    expect(state.speedKmh).toBeLessThan(4);
  });

  it('Test 6: Walking -> Should be WALKING', () => {
    generateScenario(5, 90, 1, 10.0, 10.0, 5, false);
    for (let i = 0; i < 5; i++) {
      engine.addObservation({
        timestamp: Date.now() + i * 2000,
        gpsSpeedMps: 1.5,
        gpsAccuracyMeters: 5,
        accelerometer: { x: Math.random()*2, y: Math.random()*2, z: Math.random()*2 },
        latitude: 10.0,
        longitude: 10.0,
        currentJourneyMode: 'WALKING'
      });
    }
    expect(engine.getState().mode).toBe('WALKING');
  });

  it('Test 7: Train -> Walking Transition Sequence', () => {
    generateScenario(40, 10, 0, 22.5675, 88.3712, 5, true);
    expect(engine.getState().mode).toBe('TRAIN');

    // Walk away from corridor - step 1
    engine.addObservation({
      timestamp: Date.now() + 2000,
      gpsSpeedMps: 1.4,
      gpsAccuracyMeters: 5,
      accelerometer: { x: 2, y: 2, z: 2 },
      latitude: 23.0,
      longitude: 88.0,
      currentJourneyMode: 'WALKING'
    });

    // Should transition smoothly
    expect(['TRAIN', 'TRANSITION', 'WALKING', 'RUNNING']).toContain(engine.getState().mode);
  });
});

