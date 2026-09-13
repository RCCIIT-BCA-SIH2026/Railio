import { Server as SocketIOServer } from 'socket.io';
import { db, Train } from '../models/dataStore';
import { aiGateway } from './aiServiceGateway';

export class SimulationEngine {
  private io: SocketIOServer | null = null;
  private intervalId: NodeJS.Timeout | null = null;
  private tickCount: number = 0;
  private lastPhysicalTelemetryTimestamp: number = 0;
  private mlPredictionInProgress: boolean = false;
  private lastMLBatchDurationMs: number = 0;
  private throughputTPS: number = 0;

  public init(io: SocketIOServer) {
    this.io = io;
    this.setupSocketRooms();
    this.startSimulation();
  }

  private setupSocketRooms() {
    if (!this.io) return;

    this.io.on('connection', (socket) => {
      // Allow client to subscribe to specific zone stream
      socket.on('join_zone', (zone: string) => {
        const cleanZone = (zone || 'ALL').toUpperCase();
        socket.join(`zone:${cleanZone}`);
      });

      socket.on('leave_zone', (zone: string) => {
        const cleanZone = (zone || 'ALL').toUpperCase();
        socket.leave(`zone:${cleanZone}`);
      });

      socket.on('set_scale', (scale: number) => {
        if (typeof scale === 'number' && scale >= 10 && scale <= 6000) {
          db.setScaleLimit(scale);
        }
      });
    });
  }

  private startSimulation() {
    if (this.intervalId) clearInterval(this.intervalId);

    console.log('[SimulationEngine] Nationwide High-Scale Railway Simulation Engine started (5,000+ train capacity, vectorized ML inference).');

    this.intervalId = setInterval(() => {
      this.tick();
    }, 3000);
  }

  private tick() {
    this.tickCount++;
    const tStart = Date.now();

    // 1. Get active slice of trains based on dynamic scale limit
    const activeTrains = db.trains.slice(0, db.activeScaleLimit);

    // 2. High-performance physics coordinate progression
    for (let i = 0; i < activeTrains.length; i++) {
      const train = activeTrains[i];
      const live = train.liveState;

      // Realistic GPS micro-jitter
      const deltaLat = (Math.sin(this.tickCount * 0.1 + i) * 0.0008) + (Math.random() - 0.48) * 0.0004;
      const deltaLng = (Math.cos(this.tickCount * 0.1 + i) * 0.0008) + (Math.random() - 0.48) * 0.0004;
      live.lat = Number((live.lat + deltaLat).toFixed(4));
      live.lng = Number((live.lng + deltaLng).toFixed(4));

      // Speed variation based on train category & zone
      const baseSpeed = train.avgSpeed || 60;
      const wave = Math.sin((this.tickCount + i) * 0.4) * 6;
      live.speed = Math.max(15, Math.min(130, Math.round(baseSpeed + wave + (Math.random() * 3))));
    }

    // 3. Compute live Throughput TPS (Telemetry Pings per Second)
    this.throughputTPS = Math.round((activeTrains.length) / 3.0);

    // 4. Vectorized ML-Powered Batch Delay Prediction every 6th tick (~18s)
    if (this.tickCount % 6 === 0 && !this.mlPredictionInProgress) {
      this.mlPredictionInProgress = true;
      this.fetchVectorizedMLPredictions(activeTrains).finally(() => {
        this.mlPredictionInProgress = false;
      });
    }

    // 5. High-Efficiency Zone-Partitioned & Room-Scoped Socket Broadcasting
    if (this.io) {
      // 5a. Emitting nationwide lightweight fleet delta stream
      const sampleLimit = Math.min(activeTrains.length, 600);
      const lightweightFleet = activeTrains.slice(0, sampleLimit).map((t) => ({
        trainNumber: t.trainNumber,
        name: t.name,
        type: t.type,
        zone: t.zone || 'ER',
        currentSection: t.liveState.currentSection,
        lat: t.liveState.lat,
        lng: t.liveState.lng,
        speed: t.liveState.speed,
        heading: t.liveState.heading,
        delayMinutes: t.liveState.delayMinutes,
        predictedDelay: t.liveState.predictedDelay,
        status: t.liveState.status,
      }));

      this.io.emit('trains_update', lightweightFleet);

      // 5b. Zone-scoped high-fidelity streams to subscribed rooms (e.g. room 'zone:NR', 'zone:ER')
      const zones = ['NR', 'ER', 'WR', 'CR', 'SR', 'SCR', 'SWR', 'ECR', 'NCR', 'NWR', 'NFR', 'SER', 'SECR', 'ECoR', 'WCR', 'NER', 'KR', 'METRO'];
      zones.forEach((zCode) => {
        const zoneTrainNumbers = db.trainsByZone.get(zCode);
        if (zoneTrainNumbers && zoneTrainNumbers.size > 0) {
          const zoneTrains = Array.from(zoneTrainNumbers)
            .map((num) => db.trainsById.get(num))
            .filter((t): t is Train => Boolean(t))
            .slice(0, 300)
            .map((t) => ({
              trainNumber: t.trainNumber,
              name: t.name,
              type: t.type,
              zone: t.zone,
              currentSection: t.liveState.currentSection,
              lat: t.liveState.lat,
              lng: t.liveState.lng,
              speed: t.liveState.speed,
              heading: t.liveState.heading,
              delayMinutes: t.liveState.delayMinutes,
              predictedDelay: t.liveState.predictedDelay,
              status: t.liveState.status,
              delayReasons: t.liveState.delayReasons,
            }));

          this.io!.to(`zone:${zCode}`).emit(`zone_trains_update`, {
            zone: zCode,
            count: zoneTrains.length,
            trains: zoneTrains,
          });
        }
      });

      // 5c. Engine Telemetry & Performance HUD Pulse
      this.io.emit('engine_telemetry', {
        tick: this.tickCount,
        activeTrains: activeTrains.length,
        totalFleet: db.trains.length,
        throughputTPS: this.throughputTPS,
        mlBatchDurationMs: this.lastMLBatchDurationMs,
        memoryMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        timestamp: new Date().toISOString(),
      });

      // 5d. High-frequency cellular crowd pulse
      if (this.tickCount % 4 === 0) {
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
   * Vectorized Batch Delay Prediction Engine.
   * Splits thousands of trains into chunks of 300-500 trains and evaluates them
   * concurrently on the Python FastAPI microservice in <40ms.
   */
  private async fetchVectorizedMLPredictions(activeTrains: Train[]): Promise<void> {
    const mlStart = Date.now();
    try {
      const CHUNK_SIZE = 350;
      const chunks: Train[][] = [];
      for (let i = 0; i < activeTrains.length; i += CHUNK_SIZE) {
        chunks.push(activeTrains.slice(i, i + CHUNK_SIZE));
      }

      const chunkPromises = chunks.map(async (chunk) => {
        const batchPayload = chunk.map((train) => {
          const weatherCondition = db.weatherReports[train.destination]?.condition || 'Clear';
          const junctionCongestion = db.deriveJunctionCongestionLevel(train.trainNumber);

          return {
            trainNumber: train.trainNumber,
            zone: train.zone || 'ER',
            departureTime: train.departureTime,
            arrivalTime: train.arrivalTime,
            travelDurationMins: (train.totalDistanceKm / Math.max(train.avgSpeed, 10)) * 60,
            distanceKm: train.totalDistanceKm,
            direction: train.source.toUpperCase() === 'SDAH' || train.source.toUpperCase() === 'NDLS' ? 0 : 1,
            departureDelay: train.liveState.delayMinutes,
            currentSpeed: train.liveState.speed,
            dwellTime: 1.5,
            weatherCondition,
            junctionCongestionLevel: junctionCongestion,
          };
        });

        const predictions = await aiGateway.predictDelaysBatch(batchPayload);

        // Update live state in O(1)
        predictions.forEach((pred: any) => {
          if (!pred.trainNumber) return;
          const train = db.trainsById.get(pred.trainNumber);
          if (train) {
            const live = train.liveState;
            live.delayMinutes = pred.predictedDelayMinutes ?? live.delayMinutes;
            live.predictedDelay = pred.predictedDelayMinutes ?? live.predictedDelay;
            live.confidence = pred.confidenceScore ?? live.confidence;
            live.status = live.delayMinutes <= 5 ? 'ON_TIME' : (live.delayMinutes > 30 ? 'CRITICAL_DELAY' : 'DELAYED');

            if (pred.explainability && pred.explainability.length > 0) {
              live.delayReasons = pred.explainability.map((e: any) => ({
                factor: e.factor,
                impactMin: e.impactMin,
              }));
            }
          }
        });
      });

      await Promise.allSettled(chunkPromises);
      this.lastMLBatchDurationMs = Date.now() - mlStart;
      console.log(`[SimulationEngine] Vectorized ML prediction batch completed: ${activeTrains.length} trains in ${this.lastMLBatchDurationMs}ms (${this.throughputTPS} TPS)`);
    } catch (err: any) {
      console.error('[SimulationEngine] Vectorized ML prediction batch error:', err?.message);
    }
  }

  public broadcastSensorTelemetry(sensorTelemetry: any) {
    this.lastPhysicalTelemetryTimestamp = Date.now();
    if (this.io) {
      this.io.emit('sensor_telemetry', sensorTelemetry);
    }
  }

  public getTelemetryMetrics() {
    return {
      throughputTPS: this.throughputTPS,
      lastMLBatchDurationMs: this.lastMLBatchDurationMs,
      activeTrains: db.activeScaleLimit,
      totalFleet: db.trains.length,
    };
  }

  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

export const simulationEngine = new SimulationEngine();
