import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { Train, Station, CatchTrainResult, AlertItem } from '../types';

const getHostAddress = () => {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest2?.extra?.expoClient?.hostUri ||
    (Constants as any).manifest?.debuggerHost;

  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return `http://${ip}:5000/api`;
    }
  }
  return Platform.OS === 'web' ? 'http://localhost:5000/api' : 'http://192.168.0.101:5000/api';
};

const API_BASE_URL = getHostAddress();

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 4000,
});

// Fallback Seed Data for 100% Guaranteed Offline Demo Mode
const fallbackTrains: Train[] = [
  {
    trainNumber: '22436',
    name: 'Vande Bharat Express',
    type: 'Vande Bharat',
    source: 'NDLS',
    destination: 'BSB',
    departureTime: '06:00',
    arrivalTime: '14:00',
    totalDistanceKm: 759,
    avgSpeed: 95,
    coaches: ['E1', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'E2'],
    liveState: {
      lat: 26.4547,
      lng: 80.3507,
      speed: 118,
      heading: 125,
      currentSection: 'CNB-PRYJ-S1',
      lastStation: 'CNB',
      nextStation: 'PRYJ',
      delayMinutes: 4,
      predictedDelay: 6,
      confidence: 0.94,
      status: 'ON_TIME',
      delayReasons: [
        { factor: 'Junction switch clearance', impactMin: 3 },
        { factor: 'Minor speed restriction', impactMin: 1 }
      ]
    },
    stops: [
      { code: 'NDLS', sequence: 1, arr: '06:00', dep: '06:00', km: 0, platform: 1 },
      { code: 'CNB', sequence: 2, arr: '10:08', dep: '10:10', km: 440, platform: 5 },
      { code: 'PRYJ', sequence: 3, arr: '12:08', dep: '12:10', km: 634, platform: 6 },
      { code: 'BSB', sequence: 4, arr: '14:00', dep: '14:00', km: 759, platform: 1 }
    ]
  },
  {
    trainNumber: '12301',
    name: 'Howrah Rajdhani Express',
    type: 'Rajdhani Express',
    source: 'HWH',
    destination: 'NDLS',
    departureTime: '16:50',
    arrivalTime: '10:05',
    totalDistanceKm: 1451,
    avgSpeed: 85,
    coaches: ['H1', 'A1', 'A2', 'A3', 'A4', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'PC'],
    liveState: {
      lat: 25.2818,
      lng: 83.1189,
      speed: 92,
      heading: 305,
      currentSection: 'DDU-PRYJ-B17',
      lastStation: 'DDU',
      nextStation: 'PRYJ',
      delayMinutes: 12,
      predictedDelay: 14,
      confidence: 0.91,
      status: 'DELAYED',
      delayReasons: [
        { factor: 'Junction congestion at DDU', impactMin: 7 },
        { factor: 'Preceding freight train clearance', impactMin: 4 },
        { factor: 'Weather & visibility buffer', impactMin: 1 }
      ]
    },
    stops: [
      { code: 'HWH', sequence: 1, arr: '16:50', dep: '16:50', km: 0, platform: 9 },
      { code: 'DDU', sequence: 2, arr: '00:45', dep: '00:55', km: 673, platform: 4 },
      { code: 'PRYJ', sequence: 3, arr: '02:43', dep: '02:45', km: 826, platform: 1 },
      { code: 'CNB', sequence: 4, arr: '04:50', dep: '04:55', km: 1020, platform: 1 },
      { code: 'NDLS', sequence: 5, arr: '10:05', dep: '10:05', km: 1451, platform: 12 }
    ]
  },
  {
    trainNumber: '12841',
    name: 'Coromandel Express',
    type: 'Superfast',
    source: 'HWH',
    destination: 'MAS',
    departureTime: '15:30',
    arrivalTime: '17:00',
    totalDistanceKm: 1662,
    avgSpeed: 68,
    coaches: ['A1', 'A2', 'B1', 'B2', 'B3', 'B4', 'S1', 'S2', 'S3', 'S4', 'S5', 'GEN'],
    liveState: {
      lat: 20.2668,
      lng: 85.8436,
      speed: 84,
      heading: 195,
      currentSection: 'BBS-PSA-SEC4',
      lastStation: 'BBS',
      nextStation: 'MAS',
      delayMinutes: 7,
      predictedDelay: 8,
      confidence: 0.89,
      status: 'ON_TIME',
      delayReasons: [
        { factor: 'Station dwell overshoot at BBS', impactMin: 5 },
        { factor: 'Heavy coastal rainfall', impactMin: 2 }
      ]
    },
    stops: [
      { code: 'HWH', sequence: 1, arr: '15:30', dep: '15:30', km: 0, platform: 21 },
      { code: 'BBS', sequence: 2, arr: '21:50', dep: '21:55', km: 437, platform: 4 },
      { code: 'MAS', sequence: 3, arr: '17:00', dep: '17:00', km: 1662, platform: 3 }
    ]
  },
  {
    trainNumber: '12951',
    name: 'Mumbai Rajdhani Express',
    type: 'Rajdhani Express',
    source: 'MMCT',
    destination: 'NDLS',
    departureTime: '17:00',
    arrivalTime: '08:32',
    totalDistanceKm: 1386,
    avgSpeed: 89,
    coaches: ['H1', 'A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'B4', 'B5'],
    liveState: {
      lat: 22.3107,
      lng: 73.1812,
      speed: 112,
      heading: 25,
      currentSection: 'BRC-RTM-N3',
      lastStation: 'BRC',
      nextStation: 'NDLS',
      delayMinutes: 2,
      predictedDelay: 0,
      confidence: 0.96,
      status: 'ON_TIME',
      delayReasons: []
    },
    stops: [
      { code: 'MMCT', sequence: 1, arr: '17:00', dep: '17:00', km: 0, platform: 1 },
      { code: 'ST', sequence: 2, arr: '19:32', dep: '19:35', km: 263, platform: 1 },
      { code: 'BRC', sequence: 3, arr: '21:05', dep: '21:10', km: 392, platform: 2 },
      { code: 'NDLS', sequence: 4, arr: '08:32', dep: '08:32', km: 1386, platform: 3 }
    ]
  },
  {
    trainNumber: '20898',
    name: 'Ranchi Vande Bharat Express',
    type: 'Vande Bharat',
    source: 'HWH',
    destination: 'RNC',
    departureTime: '15:45',
    arrivalTime: '22:50',
    totalDistanceKm: 463,
    avgSpeed: 66,
    coaches: ['E1', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'E2'],
    liveState: {
      lat: 22.95,
      lng: 86.80,
      speed: 98,
      heading: 290,
      currentSection: 'KGP-TATA-V1',
      lastStation: 'HWH',
      nextStation: 'RNC',
      delayMinutes: 0,
      predictedDelay: 2,
      confidence: 0.95,
      status: 'ON_TIME',
      delayReasons: []
    },
    stops: [
      { code: 'HWH', sequence: 1, arr: '15:45', dep: '15:45', km: 0, platform: 20 },
      { code: 'RNC', sequence: 2, arr: '22:50', dep: '22:50', km: 463, platform: 1 }
    ]
  }
];

const fallbackStations: Station[] = [
  { code: 'HWH', name: 'Howrah Junction', city: 'Kolkata', state: 'West Bengal', zone: 'ER', lat: 22.5857, lng: 88.3432, platforms: 23, isJunction: true },
  { code: 'NDLS', name: 'New Delhi', city: 'New Delhi', state: 'Delhi', zone: 'NR', lat: 28.6429, lng: 77.2195, platforms: 16, isJunction: true },
  { code: 'MMCT', name: 'Mumbai Central', city: 'Mumbai', state: 'Maharashtra', zone: 'WR', lat: 18.9696, lng: 72.8193, platforms: 5, isJunction: false },
  { code: 'MAS', name: 'Chennai Central', city: 'Chennai', state: 'Tamil Nadu', zone: 'SR', lat: 13.0827, lng: 80.2707, platforms: 17, isJunction: true },
  { code: 'SBC', name: 'KSR Bengaluru', city: 'Bengaluru', state: 'Karnataka', zone: 'SWR', lat: 12.9781, lng: 77.5696, platforms: 10, isJunction: true },
  { code: 'CNB', name: 'Kanpur Central', city: 'Kanpur', state: 'Uttar Pradesh', zone: 'NCR', lat: 26.4547, lng: 80.3507, platforms: 10, isJunction: true },
  { code: 'PRYJ', name: 'Prayagraj Junction', city: 'Prayagraj', state: 'Uttar Pradesh', zone: 'NCR', lat: 25.4526, lng: 81.8349, platforms: 10, isJunction: true },
  { code: 'PNBE', name: 'Patna Junction', city: 'Patna', state: 'Bihar', zone: 'ECR', lat: 25.6022, lng: 85.1376, platforms: 10, isJunction: true },
  { code: 'BBS', name: 'Bhubaneswar', city: 'Bhubaneswar', state: 'Odisha', zone: 'ECoR', lat: 20.2668, lng: 85.8436, platforms: 6, isJunction: true },
  { code: 'BSB', name: 'Varanasi Junction', city: 'Varanasi', state: 'Uttar Pradesh', zone: 'NR', lat: 25.3267, lng: 82.9863, platforms: 9, isJunction: true },
];

export const searchTrainsApi = async (from: string, to: string): Promise<Train[]> => {
  try {
    const res = await api.get(`/trains?from=${from}&to=${to}`);
    if (res.data?.trains?.length > 0) return res.data.trains;
  } catch (err) {
    console.warn('[API] Using offline train search data');
  }
  const f = from.toUpperCase().trim();
  const t = to.toUpperCase().trim();
  const matched = fallbackTrains.filter(train => {
    const sFrom = train.stops.find(s => s.code === f || train.source === f);
    const sTo = train.stops.find(s => s.code === t || train.destination === t);
    return sFrom && sTo;
  });
  return matched.length > 0 ? matched : fallbackTrains;
};

export const getTrainByNumberApi = async (trainNumber: string): Promise<Train> => {
  try {
    const res = await api.get(`/trains/${trainNumber}`);
    if (res.data?.train) return res.data.train;
  } catch (err) {
    console.warn('[API] Using offline train detail');
  }
  return fallbackTrains.find(t => t.trainNumber === trainNumber) || fallbackTrains[0];
};

export const getLiveTrainApi = async (trainNumber: string) => {
  try {
    const res = await api.get(`/trains/${trainNumber}/live`);
    if (res.data) return res.data;
  } catch (err) {
    console.warn('[API] Using offline live train');
  }
  const train = fallbackTrains.find(t => t.trainNumber === trainNumber) || fallbackTrains[0];
  return {
    trainNumber: train.trainNumber,
    name: train.name,
    liveState: train.liveState,
    stops: train.stops,
  };
};

export const calculateCatchProbabilityApi = async (params: {
  trainNumber: string;
  roadDistanceKm: number;
  trafficCondition: string;
  stationEntryBufferMin: number;
}): Promise<CatchTrainResult> => {
  try {
    const res = await api.post('/catch-probability', params);
    if (res.data?.data) return res.data.data;
  } catch (err) {
    console.warn('[API] Using offline catch probability calculation');
  }
  
  const dist = params.roadDistanceKm || 12;
  const trafficMult = params.trafficCondition === 'LOW' ? 1.0 : params.trafficCondition === 'MODERATE' ? 1.4 : params.trafficCondition === 'HEAVY' ? 1.9 : 2.4;
  const roadTime = Math.round((dist / 32) * 60 * trafficMult);
  const stationBuffer = params.stationEntryBufferMin || 7;
  const reqTime = roadTime + stationBuffer + 5;
  const availTime = Math.round(dist * 2.8 + 8);
  const margin = availTime - reqTime;

  let pct = 91;
  let statusRisk: 'LOW_RISK' | 'MODERATE_RISK' | 'HIGH_RISK' | 'CRITICAL' = 'LOW_RISK';
  let rec = '🟢 High probability you can catch your train. Leave now.';

  if (margin >= 10) {
    pct = 91;
    statusRisk = 'LOW_RISK';
    rec = '🟢 High probability you can catch your train. Leave now.';
  } else if (margin >= 0) {
    pct = 64;
    statusRisk = 'MODERATE_RISK';
    rec = '🟡 Tight schedule. Start immediately and use highway route.';
  } else {
    pct = 18;
    statusRisk = 'CRITICAL';
    rec = '🔴 You may miss this train. Recommended: Take Train 12841 at 18:15.';
  }

  return {
    trainNumber: params.trainNumber || '12301',
    trainName: 'Howrah Rajdhani Express',
    predictedDeparture: '17:02',
    roadTravelMinutes: roadTime,
    stationEntryBufferMinutes: stationBuffer,
    requiredMinutes: reqTime,
    availableMinutes: availTime,
    catchProbabilityPct: pct,
    statusRisk,
    recommendation: rec,
    alternativeTrain: pct < 50 ? {
      trainNumber: '12841',
      name: 'Coromandel Express',
      departureTime: '18:15'
    } : undefined,
    breakdown: {
      roadTime,
      stationBuffer,
      safetyMargin: 5,
      trafficDelay: Math.round(roadTime * 0.3),
      delayProbability: 0.18
    }
  };
};

export const getStationArrivalsApi = async (stationCode: string) => {
  try {
    const res = await api.get(`/stations/${stationCode}/arrivals`);
    if (res.data) return res.data;
  } catch (err) {
    console.warn('[API] Using offline station arrivals');
  }
  return {
    station: { code: stationCode, name: `${stationCode} Station`, platforms: 10 },
    arrivals: [
      { trainNumber: '22436', trainName: 'Vande Bharat Express', type: 'Vande Bharat', scheduledArrival: '12:08', predictedArrival: '12:14', delayMinutes: 6, status: '+6 min', platform: 1, confidence: 0.94, currentLocation: 'Kanpur Section', delayReason: 'Signal clearance' },
      { trainNumber: '12301', trainName: 'Howrah Rajdhani', type: 'Rajdhani Express', scheduledArrival: '16:50', predictedArrival: '17:02', delayMinutes: 12, status: '+12 min', platform: 9, confidence: 0.91, currentLocation: 'DDU Interlocking', delayReason: 'Junction congestion' },
      { trainNumber: '12841', trainName: 'Coromandel Express', type: 'Superfast', scheduledArrival: '15:30', predictedArrival: '15:37', delayMinutes: 7, status: '+7 min', platform: 21, confidence: 0.89, currentLocation: 'BBS Coastal', delayReason: 'Monsoon speed limit' }
    ]
  };
};

export const getCoachCrowdApi = async (trainNumber: string) => {
  try {
    const res = await api.get(`/crowd/train/${trainNumber}`);
    if (res.data?.coachCrowd) return res.data.coachCrowd;
  } catch (err) {}
  return {
    coaches: [
      { coach: 'A1', density: 82, status: 'RED' },
      { coach: 'A2', density: 46, status: 'YELLOW' },
      { coach: 'A3', density: 29, status: 'GREEN' },
      { coach: 'A4', density: 91, status: 'RED' }
    ],
    recommendedCoach: 'A3',
    reason: 'Lowest estimated crowd density (29% occupancy).'
  };
};

export const getWeatherApi = async () => {
  try {
    const res = await api.get('/weather');
    if (res.data?.weather) return res.data.weather;
  } catch (err) {}
  return {
    HWH: { city: 'Kolkata', tempC: 31, condition: 'Heavy Rain', rainMm: 42.5, windKmh: 28, humidityPct: 88, visibilityKm: 3.5, railImpact: 'Precautionary speed restriction: +8 to +12 min delay.' },
    NDLS: { city: 'New Delhi', tempC: 28, condition: 'Clear Sky', rainMm: 0, windKmh: 12, humidityPct: 45, visibilityKm: 9.0, railImpact: 'Optimal corridor running conditions.' }
  };
};

export const getAlertsApi = async (): Promise<AlertItem[]> => {
  try {
    const res = await api.get('/admin/alerts');
    if (res.data?.alerts) return res.data.alerts;
  } catch (err) {}
  return [
    {
      id: 'ALT-001',
      title: 'Track Anomaly Detected on Section B-17',
      category: 'TRACK_ANOMALY',
      severity: 'HIGH_RISK',
      affectedTrain: '12301',
      description: 'ESP32 MPU6050 vibration RMS measured 3.42g (Threshold 2.4g). Deterioration risk 78/100.',
      recommendedAction: 'Impose 45 km/h caution order.',
      timestamp: '10 min ago',
      active: true
    }
  ];
};

export const chatAIApi = async (query: string) => {
  try {
    const res = await api.post('/ai/chat', { message: query });
    if (res.data?.data) return res.data.data;
  } catch (err) {}
  return {
    answer: `🚆 **RailSathi Agent Intelligence**:\n\nChecked live signals for "${query}". Train 12301 is running 12 mins behind schedule near DDU Junction. Catch probability is 91% if you depart within 7 minutes.`,
    toolsExecuted: [
      { tool: 'TrainStatusTool', input: { train: '12301' }, output: 'Running +12m delayed', status: 'SUCCESS' },
      { tool: 'ETAPredictionTool', input: {}, output: 'Predicted 17:02', status: 'SUCCESS' },
      { tool: 'CatchProbabilityTool', input: {}, output: '91% probability', status: 'SUCCESS' }
    ],
    confidence: 0.94
  };
};

export const getAllStationsApi = async (): Promise<Station[]> => {
  try {
    const res = await api.get('/stations');
    if (res.data?.stations?.length > 0) return res.data.stations;
  } catch (err) {}
  return fallbackStations;
};
