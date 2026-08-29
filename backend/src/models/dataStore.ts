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

class DataStore {
  public stations: Station[] = [];
  public trains: Train[] = [];
  public trackSections: TrackSection[] = [];
  public progressiveRiskHistory: ProgressiveRisk[] = [];
  public realHardwareTelemetryBuffer: any[] = [];
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

  /**
   * Generates a 12-coach Google Maps style cellular & RF signal crowd heatmap
   */
  public generateSuburbanCoachCrowd(trainNumber: string, isPeakRush: boolean = false): CoachSignalCrowd[] {
    const baseProfile = this.crowdData?.coachCrowd?.[trainNumber]?.coaches;
    if (baseProfile && baseProfile.length === 12) {
      return baseProfile;
    }

    // Generate dynamic 12-coach cellular telemetry
    const coachTemplates: { id: string; name: string; type: 'GENERAL' | 'LADIES' | 'VENDOR'; marker: string }[] = [
      { id: 'C1', name: 'Coach 1 (Front General)', type: 'GENERAL', marker: 'FRONT_PLATFORM' },
      { id: 'C2', name: 'Coach 2 (Ladies Compartment)', type: 'LADIES', marker: 'FRONT_PLATFORM' },
      { id: 'C3', name: 'Coach 3 (General Second)', type: 'GENERAL', marker: 'FRONT_MIDDLE' },
      { id: 'C4', name: 'Coach 4 (Vendor Compartment)', type: 'VENDOR', marker: 'MIDDLE_PLATFORM' },
      { id: 'C5', name: 'Coach 5 (Mid General)', type: 'GENERAL', marker: 'MIDDLE_STAIRS' },
      { id: 'C6', name: 'Coach 6 (Mid General)', type: 'GENERAL', marker: 'MIDDLE_STAIRS' },
      { id: 'C7', name: 'Coach 7 (General Second)', type: 'GENERAL', marker: 'REAR_MIDDLE' },
      { id: 'C8', name: 'Coach 8 (Ladies Compartment)', type: 'LADIES', marker: 'REAR_MIDDLE' },
      { id: 'C9', name: 'Coach 9 (General Second)', type: 'GENERAL', marker: 'REAR_PLATFORM' },
      { id: 'C10', name: 'Coach 10 (General Second)', type: 'GENERAL', marker: 'REAR_PLATFORM' },
      { id: 'C11', name: 'Coach 11 (Vendor Compartment)', type: 'VENDOR', marker: 'REAR_END' },
      { id: 'C12', name: 'Coach 12 (Rear General)', type: 'GENERAL', marker: 'REAR_END' },
    ];

    const multiplier = isPeakRush ? 1.6 : 0.85;

    return coachTemplates.map((t, idx) => {
      // Middle coaches near staircase (C5, C6) have highest congestion
      const isMiddle = idx === 4 || idx === 5;
      const isEnd = idx === 0 || idx === 2 || idx === 8 || idx === 9;
      
      let baseDensity = isMiddle ? (isPeakRush ? 115 : 68) : isEnd ? 28 : 48;
      const jitter = Math.floor((Math.sin(idx * 1.5) * 8));
      const density = Math.max(15, Math.min(135, Math.round(baseDensity * multiplier + jitter)));

      let status: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED' | 'CRITICAL' = 'GREEN';
      let advice = 'Seats available';

      if (density >= 105) {
        status = 'CRITICAL';
        advice = 'Superdense crush load! Avoid middle staircase.';
      } else if (density >= 85) {
        status = 'RED';
        advice = 'Heavy congestion - standing room only.';
      } else if (density >= 65) {
        status = 'ORANGE';
        advice = 'Moderate standing rush.';
      } else if (density >= 45) {
        status = 'YELLOW';
        advice = 'Comfortable standing & few open seats.';
      } else {
        status = 'GREEN';
        advice = 'High seat vacancy - Optimal boarding coach.';
      }

      const activePhones = Math.round(density * 1.15 + (Math.random() * 6));
      const signalDbm = -50 - Math.round(density * 0.25);
      const bleBeacons = Math.round(activePhones * 0.6);

      return {
        coach: t.id,
        name: t.name,
        density,
        status,
        activePhoneSignals: activePhones,
        signalStrengthDbm: signalDbm,
        bleBeacons,
        coachType: t.type,
        platformMarker: t.marker,
        advice,
      };
    });
  }

  /**
   * Retrieves upcoming Suburban Local Trains for Dakshineswar ⇄ Sealdah or any corridor
   * calculated dynamically on the basis of the current live clock time.
   */
  public getUpcomingSuburbanTrains(from: string = 'DAKE', to: string = 'SDAH', currentTime?: string): SuburbanDeparture[] {
    const fromCode = from.toUpperCase().trim();
    const toCode = to.toUpperCase().trim();

    // Match all trains that stop at `from` and `to` in correct order
    const matchingTrains = this.trains.filter((t) => {
      const fromStop = t.stops.find((s) => s.code.toUpperCase() === fromCode);
      const toStop = t.stops.find((s) => s.code.toUpperCase() === toCode);
      return fromStop && toStop && fromStop.sequence < toStop.sequence;
    });

    // Parse current time in minutes from midnight (HH:MM)
    let currentTotalMinutes = 0;
    if (currentTime && currentTime.includes(':')) {
      const [ch, cm] = currentTime.split(':').map(Number);
      currentTotalMinutes = (ch || 0) * 60 + (cm || 0);
    } else {
      const now = new Date();
      currentTotalMinutes = now.getHours() * 60 + now.getMinutes();
    }

    // Generate dynamic upcoming trains schedule relative to current time
    // E.g. next departures in +4 min, +16 min, +32 min, +48 min, +68 min, +90 min
    const minuteOffsets = [4, 18, 32, 48, 65, 88, 115, 145];

    const upcomingList: SuburbanDeparture[] = matchingTrains.map((train, idx) => {
      const fromStop = train.stops.find((s) => s.code.toUpperCase() === fromCode)!;
      const toStop = train.stops.find((s) => s.code.toUpperCase() === toCode)!;

      const offsetMinutes = minuteOffsets[idx % minuteOffsets.length] + Math.floor(idx / minuteOffsets.length) * 120;
      const depTotalMin = (currentTotalMinutes + offsetMinutes) % 1440;
      const travelDurationMin = 28 + (idx % 3) * 2;
      const arrTotalMin = (depTotalMin + travelDurationMin) % 1440;

      const formatTime = (totalMin: number) => {
        const h = Math.floor(totalMin / 60).toString().padStart(2, '0');
        const m = (totalMin % 60).toString().padStart(2, '0');
        return `${h}:${m}`;
      };

      const scheduledDep = formatTime(depTotalMin);
      const delayMin = train.liveState.delayMinutes || (idx % 2 === 0 ? 0 : 2);
      const predictedDep = formatTime(depTotalMin + delayMin);
      const scheduledArr = formatTime(arrTotalMin);
      const predictedArr = formatTime(arrTotalMin + delayMin);

      // Determine if current time falls in peak rush hour (08:00 - 10:30 or 17:00 - 20:00)
      const depHour = Math.floor(depTotalMin / 60);
      const isPeakRush = (depHour >= 8 && depHour <= 10) || (depHour >= 17 && depHour <= 20);

      const coaches = this.generateSuburbanCoachCrowd(train.trainNumber, isPeakRush);
      const avgDensity = Math.round(coaches.reduce((sum, c) => sum + c.density, 0) / coaches.length);

      let overallStatus: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED' | 'CRITICAL' = 'GREEN';
      if (avgDensity >= 100) overallStatus = 'CRITICAL';
      else if (avgDensity >= 80) overallStatus = 'RED';
      else if (avgDensity >= 60) overallStatus = 'ORANGE';
      else if (avgDensity >= 40) overallStatus = 'YELLOW';

      // Find best coaches with lowest density
      const sortedCoaches = [...coaches].sort((a, b) => a.density - b.density);
      const bestCoach = sortedCoaches[0]?.coach || 'C3';
      const bestCoaches = sortedCoaches.slice(0, 3).map((c) => c.coach);

      const totalDevices = coaches.reduce((sum, c) => sum + c.activePhoneSignals, 0);

      return {
        trainNumber: train.trainNumber,
        name: train.name,
        type: train.type,
        source: train.source,
        destination: train.destination,
        fromStation: fromCode,
        toStation: toCode,
        scheduledDeparture: scheduledDep,
        predictedDeparture: predictedDep,
        scheduledArrival: scheduledArr,
        predictedArrival: predictedArr,
        minutesUntilDeparture: offsetMinutes + delayMin,
        delayMinutes: delayMin,
        platform: fromStop.platform || 2,
        status: delayMin > 0 ? 'DELAYED' : 'ON_TIME',
        overallCrowdPct: avgDensity,
        overallCrowdStatus: overallStatus,
        coaches,
        recommendedCoach: bestCoach,
        recommendedCoaches: bestCoaches,
        bestPlatformZone: `${fromCode === 'DAKE' ? 'Platform 2' : 'Platform 3'} (Middle-Rear Marker)`,
        reason: `Google Maps cellular signal clustering detected lowest active phone density in Coach ${bestCoach} (~${sortedCoaches[0]?.activePhoneSignals} devices, ${sortedCoaches[0]?.density}% load).`,
        telemetry: {
          trackedDevices: totalDevices,
          signalConfidence: 0.94,
          cellularTechnology: 'Google Maps Aggregated Cellular Pings + BLE Mesh Beacons',
          velocityKmh: train.liveState.speed || 48,
          lastUpdatedSecs: 3,
        },
      };
    });

    // Sort by departure time closest to now
    return upcomingList.sort((a, b) => a.minutesUntilDeparture - b.minutesUntilDeparture);
  }

  /**
   * Detailed Coach-wise crowd & cellular signal telemetry inspector
   */
  public getCoachSignalTelemetry(trainNumber: string) {
    const train = this.getTrain(trainNumber);
    const coaches = this.generateSuburbanCoachCrowd(trainNumber, false);
    const sorted = [...coaches].sort((a, b) => a.density - b.density);

    return {
      trainNumber,
      name: train?.name || 'Suburban EMU Local',
      type: train?.type || 'Suburban EMU',
      coaches,
      recommendedCoach: sorted[0]?.coach || 'C3',
      recommendedCoaches: sorted.slice(0, 3).map((c) => c.coach),
      reason: `Lowest device signal count (${sorted[0]?.activePhoneSignals} active mobile pings). Board at ${sorted[0]?.platformMarker}.`,
      telemetryStats: {
        totalTrackedDevices: coaches.reduce((sum, c) => sum + c.activePhoneSignals, 0),
        aggregationMethod: 'Google Maps Mobile Signal Density & BLE Mesh Clustering',
        accuracyRadiusMeters: 2.8,
        averageVelocityKmh: train?.liveState.speed || 48,
        lastRefreshedSecsAgo: 2,
      },
    };
  }
}

export const db = new DataStore();

