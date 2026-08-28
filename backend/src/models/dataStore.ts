import path from 'path';
import fs from 'fs';

export interface Station {
  code: string;
  name: string;
  city: string;
  state: string;
  zone: string;
  lat: number;
  lng: number;
  platforms: number;
  isJunction: boolean;
}

export interface DelayReason {
  factor: string;
  impactMin: number;
}

export interface TrainStop {
  code: string;
  sequence: number;
  arr: string;
  dep: string;
  km: number;
  platform: number;
}

export interface TrainLiveState {
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  currentSection: string;
  lastStation: string;
  nextStation: string;
  delayMinutes: number;
  predictedDelay: number;
  confidence: number;
  status: 'ON_TIME' | 'DELAYED' | 'CRITICAL_DELAY' | 'DIVERTED' | 'CANCELLED';
  delayReasons: DelayReason[];
}

export interface Train {
  trainNumber: string;
  name: string;
  type: string;
  source: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  totalDistanceKm: number;
  avgSpeed: number;
  coaches: string[];
  liveState: TrainLiveState;
  stops: TrainStop[];
}

export interface TrackSection {
  id: string;
  name: string;
  start: string;
  end: string;
  lengthKm: number;
  maxSpeed: number;
  riskLevel: 'NORMAL' | 'WARNING' | 'HIGH_RISK' | 'CRITICAL';
  healthScore: number;
  vibrationRms: number;
  deteriorationTrend: 'STABLE' | 'INCREASING' | 'DECREASING';
  maintenancePriority: 'LOW' | 'MEDIUM' | 'HIGH' | 'IMMEDIATE';
}

export interface ProgressiveRisk {
  day: string;
  status: string;
  riskScore: number;
  vibration: string;
  trend: string;
}

export interface CoachCrowdInfo {
  coach: string;
  density: number;
  status: 'GREEN' | 'YELLOW' | 'RED';
}

export interface WeatherInfo {
  city: string;
  tempC: number;
  condition: string;
  rainMm: number;
  windKmh: number;
  humidityPct: number;
  visibilityKm: number;
  railImpact: string;
}

export interface AlertItem {
  id: string;
  title: string;
  category: 'TRACK_ANOMALY' | 'WEATHER' | 'OBSTACLE' | 'DELAY' | 'CONGESTION';
  severity: 'NORMAL' | 'WARNING' | 'HIGH_RISK' | 'CRITICAL';
  affectedTrain?: string;
  affectedStation?: string;
  affectedSection?: string;
  description: string;
  recommendedAction?: string;
  timestamp: string;
  active: boolean;
}

class DataStore {
  public stations: Station[] = [];
  public trains: Train[] = [];
  public trackSections: TrackSection[] = [];
  public progressiveRiskHistory: ProgressiveRisk[] = [];
  public crowdData: any = {};
  public weatherReports: Record<string, WeatherInfo> = {};
  public alerts: AlertItem[] = [];
  public users: any[] = [
    {
      id: 'usr-001',
      email: 'passenger@railsathi.ai',
      password: 'password123', // In demo, plain check or bcrypt
      fullName: 'Aarav Sharma',
      phoneNumber: '+91 98765 43210',
      role: 'PASSENGER',
    },
    {
      id: 'adm-001',
      email: 'admin@railsathi.ai',
      password: 'adminpassword',
      fullName: 'Chief Controller Meera Sen',
      phoneNumber: '+91 98765 00001',
      role: 'ADMIN',
    },
  ];

  constructor() {
    this.loadInitialSeed();
  }

  private loadInitialSeed() {
    try {
      const seedPath = path.resolve(__dirname, '../../../database/seed/seedData.json');
      if (fs.existsSync(seedPath)) {
        const raw = fs.readFileSync(seedPath, 'utf-8');
        const data = JSON.parse(raw);
        this.stations = data.stations || [];
        this.trains = data.trains || [];
        this.trackSections = data.trackSections || [];
        this.progressiveRiskHistory = data.progressiveRiskHistory || [];
        this.crowdData = data.crowdData || {};
        this.weatherReports = data.weatherReports || {};
        this.alerts = data.alerts || [];
        console.log(`[DataStore] Loaded ${this.stations.length} stations, ${this.trains.length} trains from seed.`);
      } else {
        console.warn('[DataStore] Seed file not found at', seedPath);
      }
    } catch (err) {
      console.error('[DataStore] Error loading seed data:', err);
    }
  }

  public getStation(code: string): Station | undefined {
    return this.stations.find((s) => s.code.toUpperCase() === code.toUpperCase());
  }

  public getTrain(trainNumber: string): Train | undefined {
    return this.trains.find((t) => t.trainNumber === trainNumber);
  }

  public searchTrains(from: string, to: string): Train[] {
    const fromCode = from.toUpperCase().trim();
    const toCode = to.toUpperCase().trim();

    return this.trains.filter((t) => {
      const fromStop = t.stops.find((s) => s.code.toUpperCase() === fromCode);
      const toStop = t.stops.find((s) => s.code.toUpperCase() === toCode);
      return fromStop && toStop && fromStop.sequence < toStop.sequence;
    });
  }
}

export const db = new DataStore();
