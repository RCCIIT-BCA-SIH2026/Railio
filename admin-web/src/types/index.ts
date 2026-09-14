export interface LiveTrain {
  trainNumber: string;
  name: string;
  type: string;
  zone?: string;
  division?: string;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  currentSection: string;
  delayMinutes: number;
  predictedDelay: number;
  status: 'ON_TIME' | 'DELAYED' | 'CRITICAL_DELAY' | 'DIVERTED' | 'CANCELLED';
  direction?: 'UP' | 'DOWN';
  source?: string;
  destination?: string;
  delayReasons?: Array<{ factor: string; impactMin: number }>;
}

export interface OperationalZone {
  code: string;
  name: string;
  hq: string;
  state: string;
  divisions: string[];
  color: string;
  routeKm: number;
  maxSpeedKmh: number;
  terrain: string;
  weatherSensitivities: {
    winterFog: number;
    summerHeat: number;
    monsoonFlood: number;
    cyclone: number;
  };
  gradientDragFactor: number;
  defaultFogSpeedCapKmh: number;
  primaryCorridors: string[];
  keyJunctions: string[];
}

export interface EngineTelemetry {
  tick: number;
  activeTrains: number;
  totalFleet: number;
  throughputTPS: number;
  mlBatchDurationMs: number;
  memoryMB: number;
  timestamp: string;
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

export interface DashboardMetrics {
  activeTrains: number;
  delayedTrains: number;
  criticalIncidents: number;
  highCrowdStations: number;
  trackRisks: number;
  weatherAlerts: number;
  networkPunctualityPct: number;
  avgNetworkSpeedKmh: number;
}
