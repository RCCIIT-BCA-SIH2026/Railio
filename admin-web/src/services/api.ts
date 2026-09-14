import axios from 'axios';
import { io, Socket } from 'socket.io-client';

const API_BASE_URL = 'http://localhost:5001';

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 8000,
});

export const initSocket = (): Socket => {
  return io(API_BASE_URL, {
    transports: ['websocket', 'polling'],
  });
};

export const fetchDashboardData = async () => {
  const res = await apiClient.get('/admin/dashboard');
  return res.data;
};

export const fetchOperationalZones = async () => {
  const res = await apiClient.get('/trains/zones');
  return res.data;
};

export const fetchEngineStats = async () => {
  const res = await apiClient.get('/trains/engine/stats');
  return res.data;
};

export const setSimulationScaleApi = async (scale: number) => {
  const res = await apiClient.post('/trains/scale', { scale });
  return res.data;
};

export const fetchTrainsWithFilter = async (params: {
  zone?: string;
  division?: string;
  limit?: number;
  offset?: number;
  search?: string;
}) => {
  const res = await apiClient.get('/trains', { params });
  return res.data;
};

export const fetchTrackRisk = async () => {
  const res = await apiClient.get('/track/risk');
  return res.data;
};

export const runWhatIfSimulation = async (
  scenario: string,
  trainNumber: string = '22436',
  zone: string = 'ALL',
  sectionId?: string,
  delayMinutes?: number
) => {
  const res = await apiClient.post('/digital-twin/simulate', {
    scenario,
    trainNumber,
    zone,
    sectionId,
    delayMinutes: delayMinutes || 0,
  });
  return res.data;
};

export const createRailwayAlert = async (alertData: any) => {
  const res = await apiClient.post('/admin/alerts', alertData);
  return res.data;
};

export const fetchStationCrowd = async (stationCode: string) => {
  const res = await apiClient.get(`/crowd/station/${stationCode}`);
  return res.data;
};

// Future Scopes APIs
export const fetchGnnCascade = async () => {
  const res = await apiClient.get('/future/gnn-cascade');
  return res.data;
};

export const fetchFederatedLearning = async () => {
  const res = await apiClient.get('/future/federated');
  return res.data;
};

export const fetchLogisticsOrchestration = async () => {
  const res = await apiClient.get('/future/logistics');
  return res.data;
};

// ── Linear Algebra & Matrix Logic API Endpoints ─────────────────────────────
export const solveMaxPlusTimetableApi = async (params: {
  numTrains?: number;
  headwayMinutes?: number;
  dwellMinutes?: number;
  initialDelays?: number[];
  steps?: number;
}) => {
  const res = await apiClient.post('/matrix/max-plus-schedule', params);
  return res.data;
};

export const propagateDelaysSparseApi = async (params: {
  primaryDelays: Record<string, number>;
  dampingFactor?: number;
  hops?: number;
}) => {
  const res = await apiClient.post('/matrix/propagate-delays', params);
  return res.data;
};

export const detectOccupancyConflictsApi = async (params: {
  trajectories: Array<{
    trainNumber: string;
    sectionIds: string[];
    startMinute: number;
    durationMinutesPerSection?: number;
  }>;
  timeHorizonMinutes?: number;
}) => {
  const res = await apiClient.post('/matrix/detect-conflicts', params);
  return res.data;
};

export const computeSpatialNearestStationsApi = async (trains: Array<{ trainNumber: string; lat: number; lng: number }>) => {
  const res = await apiClient.post('/matrix/spatial-nearest-stations', { trains });
  return res.data;
};

export const fetchMatrixTopologyMetricsApi = async () => {
  const res = await apiClient.get('/matrix/topology-metrics');
  return res.data;
};
