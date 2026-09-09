import { Server as SocketIOServer } from 'socket.io';
import { db, Train } from '../models/dataStore';

export class SimulationEngine {
  private io: SocketIOServer | null = null;
  private intervalId: NodeJS.Timeout | null = null;
  private tickCount: number = 0;
  private lastPhysicalTelemetryTimestamp: number = 0;

  public init(io: SocketIOServer) {
    this.io = io;
    this.startSimulation();
  }

  private startSimulation() {
    if (this.intervalId) clearInterval(this.intervalId);

    console.log('[SimulationEngine] Live 3-second railway simulation engine started.');

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

      // Delay variation occasionally
      if (this.tickCount % 6 === 0) {
        const delayJitter = (Math.random() > 0.7 ? 1 : 0);
        live.delayMinutes = Math.max(0, live.delayMinutes + delayJitter);
        live.predictedDelay = live.delayMinutes + (live.delayMinutes > 5 ? 2 : 0);
      }
    });

    // Broadcast real-time train updates via Socket.IO
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
