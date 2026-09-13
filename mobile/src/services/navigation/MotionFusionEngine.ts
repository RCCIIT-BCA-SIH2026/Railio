import { matchToRailwayCorridor, getBearingDifference, haversineDistanceMeters } from '../../utils/RailwayMatcher';

export type MovementMode = 'TRAIN' | 'TRAIN_STOPPED' | 'WALKING' | 'RUNNING' | 'VEHICLE' | 'STATIONARY' | 'UNKNOWN' | 'TRANSITION';

export interface MotionObservation {
  timestamp: number;
  latitude?: number;
  longitude?: number;
  gpsSpeedMps?: number;
  gpsAccuracyMeters?: number;
  bearingDegrees?: number;
  accelerometer?: { x: number; y: number; z: number };
  currentJourneyMode?: 'TRAIN' | 'WALKING' | 'VEHICLE' | 'UNKNOWN';
}

export interface MotionState {
  mode: MovementMode;
  confidence: {
    train: number;
    walking: number;
    vehicle: number;
    stationary: number;
  };
  speedKmh: number;
  derivedSpeedKmh: number;
  bearingDegrees?: number;
  gpsAccuracyMeters?: number;
  railwayDistanceMeters?: number;
  routeBearingDifferenceDegrees?: number;
  isActuallyMoving: boolean;
  lastStableUpdate: number;
  rawSpeedKmh: number;
}

export class MotionFusionEngine {
  private history: MotionObservation[] = [];
  private readonly MAX_HISTORY = 30;
  private walkingConsecutiveCount = 0;
  
  private currentState: MotionState = {
    mode: 'UNKNOWN',
    confidence: { train: 0, walking: 0, vehicle: 0, stationary: 0 },
    speedKmh: 0,
    derivedSpeedKmh: 0,
    rawSpeedKmh: 0,
    isActuallyMoving: false,
    lastStableUpdate: 0,
  };

  public addObservation(obs: MotionObservation) {
    this.history.push(obs);
    if (this.history.length > this.MAX_HISTORY) {
      this.history.shift();
    }
    this.evaluateState();
  }

  public getState(): MotionState {
    return this.currentState;
  }

  private evaluateState() {
    if (this.history.length === 0) return;

    // Filter history to isolate valid GPS observations
    const gpsHistory = this.history.filter(
      h => h.latitude !== undefined && h.longitude !== undefined && Number.isFinite(h.latitude) && Number.isFinite(h.longitude)
    );

    const latestObs = this.history[this.history.length - 1];
    const latestGps = gpsHistory.length > 0 ? gpsHistory[gpsHistory.length - 1] : null;

    // 1. Calculate Native & Noise-Filtered Derived Speed
    let derivedSpeedMps: number | null = null;
    let nativeSpeedMps: number | null = null;
    const currentAccuracy = latestGps?.gpsAccuracyMeters ?? 15;

    if (gpsHistory.length >= 2) {
      const g1 = gpsHistory[gpsHistory.length - 1];
      const g2 = gpsHistory[gpsHistory.length - 2];
      const dt = (g1.timestamp - g2.timestamp) / 1000;

      if (dt > 0.1 && dt < 180) {
        const dist = haversineDistanceMeters(g2.latitude!, g2.longitude!, g1.latitude!, g1.longitude!);
        
        // GPS Noise Thresholding: If displacement is smaller than 75% of GPS accuracy, treat as 0 noise
        const noiseThreshold = currentAccuracy * 0.75;
        if (dist >= noiseThreshold) {
          const rawDerived = dist / dt;
          // Outlier Rejection: Ignore derived spikes > 15 km/h if accuracy is poor and native speed is low
          const nativeObs = g1.gpsSpeedMps ?? 0;
          if (rawDerived * 3.6 > 15 && nativeObs * 3.6 < 4 && currentAccuracy > 15) {
            derivedSpeedMps = nativeObs;
          } else {
            derivedSpeedMps = rawDerived;
          }
        } else {
          derivedSpeedMps = 0;
        }
      }
    }

    if (latestGps && latestGps.gpsSpeedMps !== undefined && latestGps.gpsSpeedMps >= 0 && Number.isFinite(latestGps.gpsSpeedMps)) {
      nativeSpeedMps = latestGps.gpsSpeedMps;
    }

    // Determine raw speed (giving priority to native GPS hardware speed)
    let rawSpeedMps = 0;
    if (nativeSpeedMps !== null && nativeSpeedMps >= 0) {
      rawSpeedMps = nativeSpeedMps;
    } else if (derivedSpeedMps !== null) {
      rawSpeedMps = derivedSpeedMps;
    }

    // Exponential Moving Average (EMA) speed smoothing
    let smoothedSpeedMps = rawSpeedMps;
    const prevSpeedMps = this.currentState.speedKmh / 3.6;
    if (this.history.length > 1) {
      smoothedSpeedMps = prevSpeedMps * 0.7 + rawSpeedMps * 0.3;
    }

    const speedKmh = Math.round(smoothedSpeedMps * 3.6 * 10) / 10;
    const rawKmh = Math.round(rawSpeedMps * 3.6 * 10) / 10;
    const derivedKmh = Math.round((derivedSpeedMps ?? 0) * 3.6 * 10) / 10;

    // 2. Railway Track Corridor Matching
    let railwayDist = Infinity;
    let bearingDiff = Infinity;

    if (latestGps?.latitude && latestGps?.longitude) {
      const match = matchToRailwayCorridor({ latitude: latestGps.latitude, longitude: latestGps.longitude });
      if (match) {
        railwayDist = match.distanceMeters;
        if (latestGps.bearingDegrees !== undefined && match.expectedBearing > 0) {
          const d1 = getBearingDifference(latestGps.bearingDegrees, match.expectedBearing);
          const d2 = getBearingDifference(latestGps.bearingDegrees, (match.expectedBearing + 180) % 360);
          bearingDiff = Math.min(d1, d2);
        }
      }
    }

    // 3. Accelerometer & Physical Motion Step Variance
    let accelVariance = 0;
    const mags = this.history.filter(h => h.accelerometer).map(h => 
      Math.sqrt(h.accelerometer!.x**2 + h.accelerometer!.y**2 + h.accelerometer!.z**2)
    );
    if (mags.length > 1) {
      const mean = mags.reduce((a,b) => a+b,0) / mags.length;
      accelVariance = mags.reduce((a,b) => a + Math.pow(b - mean, 2), 0) / mags.length;
    }

    const isActuallyMoving = speedKmh > 0.8 || rawKmh > 0.8 || (accelVariance >= 0.003);

    // 4. Motion Pattern Classification & Confidence Scoring
    let confTrain = 0;
    let confWalk = 0;
    let confStationary = 0;
    let nextMode: MovementMode = 'UNKNOWN';

    const isExplicitTrainContext = latestObs.currentJourneyMode === 'TRAIN';
    const isExplicitWalkContext = latestObs.currentJourneyMode === 'WALKING';

    // TIER 1: High speed travel (Train or Fast vehicle movement)
    if (speedKmh >= 12.0 || (isExplicitTrainContext && speedKmh >= 5.0)) {
      nextMode = 'TRAIN';
      confTrain = 0.95;
    } 
    // TIER 2: Running (Speed >= 7.5 km/h or high step variance >= 0.10 with speed >= 5.5 km/h)
    else if (speedKmh >= 7.5 || (accelVariance >= 0.10 && speedKmh >= 5.5)) {
      nextMode = 'RUNNING';
      confWalk = 0.95;
    } 
    // TIER 3: Walking (Pedestrian step variance >= 0.003 or moderate walking speed 0.8-7.5 km/h or explicit walk)
    else if ((speedKmh >= 0.8 && speedKmh < 12.0) || accelVariance >= 0.003 || isExplicitWalkContext) {
      nextMode = 'WALKING';
      confWalk = 0.90;
    } 
    // TIER 4: Train Stopped at station platform (Near track < 150m or explicit train context, low speed, NO walking step variance)
    else if (isExplicitTrainContext || (railwayDist < 150 && accelVariance <= 0.0025)) {
      nextMode = 'TRAIN_STOPPED';
      confTrain = 0.85;
      confStationary = 0.5;
    } 
    // TIER 5: Stationary (Low speed and minimal accelerometer variance)
    else {
      nextMode = 'STATIONARY';
      confStationary = 0.85;
    }

    confTrain = Math.max(0, Math.min(1, confTrain));
    confWalk = Math.max(0, Math.min(1, confWalk));
    confStationary = Math.max(0, Math.min(1, confStationary));

    this.currentState = {
      mode: nextMode,
      confidence: { train: confTrain, walking: confWalk, vehicle: 0, stationary: confStationary },
      speedKmh,
      derivedSpeedKmh: derivedKmh,
      rawSpeedKmh: rawKmh,
      bearingDegrees: latestGps?.bearingDegrees,
      gpsAccuracyMeters: latestGps?.gpsAccuracyMeters,
      railwayDistanceMeters: railwayDist !== Infinity ? Math.round(railwayDist) : undefined,
      routeBearingDifferenceDegrees: bearingDiff !== Infinity ? Math.round(bearingDiff) : undefined,
      isActuallyMoving,
      lastStableUpdate: Date.now()
    };
  }
}

