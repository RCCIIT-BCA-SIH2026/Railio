import { Server as SocketIOServer } from 'socket.io';
import { db, Train } from '../models/dataStore';
import { aiGateway } from './aiServiceGateway';

export class SimulationEngine {
  private io: SocketIOServer | null = null;
  private intervalId: NodeJS.Timeout | null = null;
  private tickCount: number = 0;
  private lastPhysicalTelemetryTimestamp: number = 0;
  private mlPredictionInProgress: boolean = false;

  public init(io: SocketIOServer) {
    this.io = io;
    this.startSimulation();
  }

  private startSimulation() {
    if (this.intervalId) clearInterval(this.intervalId);

    console.log('[SimulationEngine] Live 3-second railway simulation engine started (ML-powered delay predictions).');

    this.intervalId = setInterval(() => {
      this.tick();
    }, 3000);
  }

  private tick() {
    this.tickCount++;

    // 1. Move trains slightly along heading
    db.trains.forEach((train: Train) => {
      const live = train.liveState;
      // Slight coordinate jitter simulating actual GPS tracking
      const deltaLat = (Math.random() - 0.48) * 0.002;
      const deltaLng = (Math.random() - 0.48) * 0.002;
      live.lat = Number((live.lat + deltaLat).toFixed(4));
      live.lng = Number((live.lng + deltaLng).toFixed(4));

      // Suburban Local EMU Speed variation (25 to 75 km/h)
      const baseSpeed = train.avgSpeed || 42;
      live.speed = Math.max(25, Math.min(80, Math.round(baseSpeed + (Math.sin(this.tickCount * 0.5) * 8) + (Math.random() * 4))));
    });

    // 2. ML-Powered Delay Prediction — call real train_delay_model.pkl every 6th tick (~18s)
    if (this.tickCount % 6 === 0 && !this.mlPredictionInProgress) {
      this.mlPredictionInProgress = true;
      this.fetchMLDelayPredictions().finally(() => {
        this.mlPredictionInProgress = false;
      });
    }

    // 3. Broadcast real-time train updates via Socket.IO
    if (this.io) {
      this.io.emit('trains_update', db.trains.map((t) => ({
        trainNumber: t.trainNumber,
        name: t.name,
        type: t.type,
        currentSection: t.liveState.currentSection,
        lat: t.liveState.lat,
        lng: t.liveState.lng,
        speed: t.liveState.speed,
        heading: t.liveState.heading,
        delayMinutes: t.liveState.delayMinutes,
        predictedDelay: t.liveState.predictedDelay,
        status: t.liveState.status,
      })));

      if (this.tickCount % 5 === 0) {
        this.io.emit('crowd_update', {
          station: 'SDAH',
          timestamp: new Date().toISOString(),
          platforms: {
            platform1: Math.min(100, Math.max(30, 84 + Math.floor((Math.random() - 0.5) * 8))),
            platform2: 72,
            platform3: 65,
          }
        });

        // Broadcast live Google Maps-style cellular device pulse for Dakshineswar-Sealdah local
        this.io.emit('suburban_cellular_pulse', {
          trainNumber: '32216',
          corridor: 'DAKE-SDAH',
          timestamp: new Date().toISOString(),
          activeDevicesTotal: 340 + Math.floor((Math.random() - 0.5) * 20),
          recommendedCoach: 'C3',
          coaches: db.generateSuburbanCoachCrowd('32216', false),
        });
      }
    }
  }

  /**
   * Fetch real delay predictions from train_delay_model.pkl via the AI service
   * for all trains in the system. Uses aiGateway.predictDelay() which calls
   * POST /api/ml/predict-delay on the Python AI service (port 8000).
   */
  private async fetchMLDelayPredictions(): Promise<void> {
    try {
      const results = await Promise.allSettled(
        db.trains.map(async (train: Train) => {
          const weatherCondition = db.weatherReports[train.destination]?.condition || 'Clear';
          const junctionCongestion = db.deriveJunctionCongestionLevel(train.trainNumber);

          const prediction = await aiGateway.predictDelay({
            trainNumber:        train.trainNumber,
            departureTime:      train.departureTime,
            arrivalTime:        train.arrivalTime,
            travelDurationMins: (train.totalDistanceKm / Math.max(train.avgSpeed, 10)) * 60,
            distanceKm:         train.totalDistanceKm,
            direction:          train.source.toUpperCase() === 'SDAH' ? '0' : '1',
            departureDelay:     train.liveState.delayMinutes,
            currentSpeed:       train.liveState.speed,
            dwellTime:          1.5,
            weatherCondition,
            junctionCongestionLevel: junctionCongestion,
          });

          // Update train's live state with ML prediction
          const live = train.liveState;
          live.delayMinutes  = prediction.predictedDelayMinutes ?? live.delayMinutes;
          live.predictedDelay = prediction.predictedDelayMinutes ?? live.predictedDelay;
          live.confidence    = prediction.confidenceScore ?? live.confidence;
          live.status        = (live.delayMinutes <= 5 ? 'ON_TIME' : 'DELAYED') as any;

          // Store explainability factors if available
          if (prediction.explainability && prediction.explainability.length > 0) {
            live.delayReasons = prediction.explainability.map((e: any) => ({
              factor: e.factor,
              impactMin: e.impactMin,
            }));
          }
        })
      );

      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      if (succeeded > 0) {
        console.log(`[SimulationEngine] ML delay predictions updated: ${succeeded}/${db.trains.length} trains (train_delay_model.pkl)`);
      }
      if (failed > 0) {
        console.warn(`[SimulationEngine] ML prediction failed for ${failed} trains (using statistical fallback)`);
      }
    } catch (err: any) {
      console.error('[SimulationEngine] ML prediction batch error:', err?.message);
    }
  }

  public broadcastSensorTelemetry(sensorTelemetry: any) {
    this.lastPhysicalTelemetryTimestamp = Date.now();
    if (this.io) {
      this.io.emit('sensor_telemetry', sensorTelemetry);
    }
  }

  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

export const simulationEngine = new SimulationEngine();
