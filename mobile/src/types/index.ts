export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  Register: undefined;
  PhoneVerification: undefined;
  MainTabs: undefined;
  SearchTrain: undefined;
  SearchResults: { from: string; to: string; date?: string };
  TrainDetails: { trainNumber: string };
  LiveTrain: { trainNumber: string };
  StationArrivalBoard: { stationCode?: string };
  CanICatch: { trainNumber?: string };
  CrowdStatus: { stationCode?: string };
  CoachCrowd: { trainNumber?: string };
  SuburbanLocal: { from?: string; to?: string } | undefined;
  WeatherIntelligence: { stationCode?: string };
  ObstacleDetection: undefined;
  CameraNavigation: { destination?: string } | undefined;
  AIAssistant: { initialQuery?: string } | undefined;
  WhatsAppSimulator: undefined;
  Alerts: undefined;
  ConnectingTrain: undefined;
  AdminQuickAlerts: undefined;
  Profile: undefined;
  Settings: undefined;
};

export interface CoachSignalCrowd {
  coach: string;
  name: string;
  density: number;
  status: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED' | 'CRITICAL';
  activePhoneSignals: number;
  signalStrengthDbm: number;
  bleBeacons: number;
  coachType: 'GENERAL' | 'LADIES' | 'VENDOR' | 'HANDICAPPED';
  platformMarker: string;
  advice: string;
}

export interface SuburbanDeparture {
  trainNumber: string;
  name: string;
  type: string;
  source: string;
  destination: string;
  fromStation: string;
  toStation: string;
  scheduledDeparture: string;
  predictedDeparture: string;
  scheduledArrival: string;
  predictedArrival: string;
  minutesUntilDeparture: number;
  delayMinutes: number;
  platform: number;
  status: 'ON_TIME' | 'DELAYED' | 'ARRIVING_NOW' | 'DEPARTED';
  overallCrowdPct: number;
  overallCrowdStatus: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED' | 'CRITICAL';
  coaches: CoachSignalCrowd[];
  recommendedCoach: string;
  recommendedCoaches: string[];
  bestPlatformZone: string;
  reason: string;
  telemetry: {
    trackedDevices: number;
    signalConfidence: number;
    cellularTechnology: string;
    velocityKmh: number;
    lastUpdatedSecs: number;
  };
}

export interface SuburbanCorridor {
  id: string;
  name: string;
  from: string;
  to: string;
  frequencyMin: number;
  dailyTrains: number;
  isPopular: boolean;
  stations: string[];
}

export type BottomTabParamList = {
  HomeTab: undefined;
  PlatformTab: undefined;
  TrainsTab: undefined;
  WhatsAppTab: undefined;
  MapTab: { trainNumber?: string } | undefined;
  ProfileTab: undefined;
};

export interface TrainStop {
  code: string;
  sequence: number;
  arr: string;
  dep: string;
  km: number;
  platform: number;
}

export interface DelayReason {
  factor: string;
  impactMin: number;
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

export interface CatchTrainResult {
  trainNumber: string;
  trainName: string;
  predictedDeparture: string;
  roadTravelMinutes: number;
  stationEntryBufferMinutes: number;
  requiredMinutes: number;
  availableMinutes: number;
  catchProbabilityPct: number;
  statusRisk: 'LOW_RISK' | 'MODERATE_RISK' | 'HIGH_RISK' | 'CRITICAL';
  recommendation: string;
  alternativeTrain?: {
    trainNumber: string;
    name: string;
    departureTime: string;
  };
  breakdown: {
    roadTime: number;
    stationBuffer: number;
    safetyMargin: number;
    trafficDelay: number;
    delayProbability: number;
  };
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
