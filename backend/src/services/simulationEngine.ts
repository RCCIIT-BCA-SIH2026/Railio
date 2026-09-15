import { Server as SocketIOServer } from 'socket.io';
import { db, Train } from '../models/dataStore';
import { aiGateway } from './aiServiceGateway';

// Polyline coordinates for track geometry along Sealdah - Dankuni Corridor
const UP_TRACK_PATH: [number, number][] = [
  [22.5674, 88.3712], // SDAH (Sealdah)
  [22.5805, 88.3775],
  [22.5938, 88.3842], // BNXR (Bidhannagar Road)
  [22.6085, 88.3822],
  [22.6221, 88.3773], // DDJ (Dum Dum Jn)
  [22.6345, 88.3752],
  [22.6455, 88.3735], // BARN (Baranagar Road)
  [22.6508, 88.3698],
  [22.6548, 88.3662], // DAKE (Dakshineswar)
  [22.6534, 88.3620], // BLYG (Bally Ghat)
  [22.6575, 88.3585], // BLYH (Bally Halt)
  [22.6680, 88.3310], // RCD (Rajchandrapur)
  [22.6842, 88.3005]  // DKAE (Dankuni Jn)
];

const DOWN_TRACK_PATH: [number, number][] = UP_TRACK_PATH.slice().reverse().map(([lat, lng]) => [
  lat - 0.0007,
  lng + 0.0007
]);

function parseTimeToMinutes(timeStr?: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map(Number);
  return (parts[0] || 0) * 60 + (parts[1] || 0);
}

function getCurrentISTMinutes(): number {
  const now = new Date();
  const istStr = now.toLocaleTimeString('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  const [h, m, s] = istStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0) + (s || 0) / 60;
}

function interpolatePath(path: [number, number][], progress: number): [number, number] {
  const p = Math.max(0, Math.min(1, progress));
  const totalSegments = path.length - 1;
  const rawIdx = p * totalSegments;
  const idx = Math.min(Math.floor(rawIdx), totalSegments - 1);
  const segProgress = rawIdx - idx;

  const [lat1, lng1] = path[idx];
  const [lat2, lng2] = path[idx + 1];

  const lat = lat1 + (lat2 - lat1) * segProgress;
  const lng = lng1 + (lng2 - lng1) * segProgress;
  return [Number(lat.toFixed(4)), Number(lng.toFixed(4))];
}

export class SimulationEngine {
  private io: SocketIOServer | null = null;
  private intervalId: NodeJS.Timeout | null = null;
  private tickCount: number = 0;
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

    // Immediate initial tick
    this.tick();

    this.intervalId = setInterval(() => {
      this.tick();
    }, 3000);
  }

  private getRealtimeActiveTrains(): { train: Train; progress: number; isRunning: boolean; isDwelling: boolean }[] {
    const nowMin = getCurrentISTMinutes();
    const activeList: { train: Train; progress: number; isRunning: boolean; isDwelling: boolean }[] = [];

    db.trains.forEach((train: Train) => {
      const depMin = parseTimeToMinutes(train.departureTime || '00:00');
      const arrMin = parseTimeToMinutes(train.arrivalTime || '00:00');

      let duration = arrMin - depMin;
      if (duration <= 0) duration += 1440;

      let elapsed = nowMin - depMin;
      if (elapsed < 0) elapsed += 1440;

      if (elapsed >= 0 && elapsed <= duration) {
        const progress = Math.min(1.0, Math.max(0.0, elapsed / duration));
        activeList.push({
          train,
          progress,
          isRunning: true,
          isDwelling: false
        });
      }
    });

    if (activeList.length === 0) {
      return db.trains.slice(0, 10).map((train) => ({
        train,
        progress: 0.5,
        isRunning: true,
        isDwelling: false
      }));
    }

    return activeList;
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
