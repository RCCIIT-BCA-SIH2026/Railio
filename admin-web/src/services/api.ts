import axios from 'axios';
import { io, Socket } from 'socket.io-client';

const API_BASE_URL = 'http://localhost:5000';

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 5000,
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

export const fetchTrackRisk = async () => {
  const res = await apiClient.get('/track/risk');
  return res.data;
};

export const runWhatIfSimulation = async (scenario: string, trainNumber: string = '22436') => {
  const res = await apiClient.post('/digital-twin/simulate', { scenario, trainNumber });
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
