import { Server as SocketIOServer } from 'socket.io';
import { db, Train } from '../models/dataStore';

export class SimulationEngine {
  private io: SocketIOServer | null = null;
  private intervalId: NodeJS.Timeout | null = null;
  private tickCount: number = 0;

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

      // Speed variation
      const baseSpeed = train.type.includes('Vande Bharat') ? 115 : 85;
      live.speed = Math.max(40, Math.min(130, Math.round(baseSpeed + (Math.sin(this.tickCount * 0.5) * 12) + (Math.random() * 6))));

      // Delay variation occasionally
      if (this.tickCount % 6 === 0) {
        const delayJitter = (Math.random() > 0.7 ? 1 : 0);
        live.delayMinutes = Math.max(0, live.delayMinutes + delayJitter);
        live.predictedDelay = live.delayMinutes + (live.delayMinutes > 5 ? 2 : 0);
      }
    });

    // 2. Generate simulated ESP32 MPU6050 vibration telemetry for track section B-17
    const baseVibration = 1.2;
    const anomalySpike = (this.tickCount % 8 === 0) ? (Math.random() * 2.2 + 1.5) : (Math.random() * 0.4);
    const totalRms = Number((baseVibration + anomalySpike).toFixed(2));
    const isAnomaly = totalRms > 2.8;

    const sensorTelemetry = {
      timestamp: new Date().toISOString(),
      sectionId: 'HWH-B17',
      trainNumber: '12301',
      accel: {
        x: Number((Math.sin(this.tickCount) * 0.4 + 0.1).toFixed(3)),
        y: Number((Math.cos(this.tickCount) * 0.3 - 0.05).toFixed(3)),
        z: Number((0.98 + (isAnomaly ? 0.6 : 0.05) * Math.random()).toFixed(3)),
      },
      gyro: {
        x: Number((Math.sin(this.tickCount * 0.8) * 1.5).toFixed(2)),
        y: Number((Math.cos(this.tickCount * 0.8) * 1.2).toFixed(2)),
        z: Number((Math.random() * 0.8).toFixed(2)),
      },
      vibrationRms: totalRms,
      isAnomaly,
      severity: isAnomaly ? 'HIGH_RISK' : 'NORMAL',
      confidence: 0.88,
    };

    // 3. Broadcast real-time payloads via Socket.IO
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

      this.io.emit('sensor_telemetry', sensorTelemetry);

      if (this.tickCount % 5 === 0) {
        this.io.emit('crowd_update', {
          station: 'HWH',
          timestamp: new Date().toISOString(),
          platforms: {
            platform1: Math.min(100, Math.max(30, 88 + Math.floor((Math.random() - 0.5) * 8))),
            platform2: 54,
            platform3: 21,
          }
        });
      }
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
