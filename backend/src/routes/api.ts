import { Router } from 'express';
import { login, register, getMe } from '../controllers/authController';
import { authenticateToken } from '../middleware/authMiddleware';
import { getTrains, getTrainByNumber, getLiveTrainStatus, getTrainETAPrediction } from '../controllers/trainController';
import { getStations, getStationArrivals } from '../controllers/stationController';
import { calculateCatchProbability } from '../controllers/catchController';
import { getStationCrowd, getTrainCoachCrowd } from '../controllers/crowdController';
import { getTrackRisk, ingestSensorTelemetry, getRealTelemetryHistory } from '../controllers/trackController';
import { simulateWhatIfScenario } from '../controllers/digitalTwinController';
import { handleAIChat } from '../controllers/aiController';
import { verifyWebhook, handleIncomingWebhook } from '../controllers/whatsappController';
import { getDashboardOverview, getAlerts, createAlert, getWeatherIntelligence } from '../controllers/adminController';
import { getUpcomingSuburbanTrains, getCoachCrowdTelemetry, getSuburbanCorridors } from '../controllers/suburbanController';

const router = Router();

// 1. Auth routes
router.post('/auth/login', login);
router.post('/auth/register', register);
router.get('/auth/me', authenticateToken as any, getMe);

// 2. Train routes
router.get('/trains', getTrains);
router.get('/trains/:trainNumber', getTrainByNumber);
router.get('/trains/:trainNumber/live', getLiveTrainStatus);
router.get('/trains/:trainNumber/eta', getTrainETAPrediction);

// 3. Station routes
router.get('/stations', getStations);
router.get('/stations/:id/arrivals', getStationArrivals);

// 4. "Can I Catch My Train?" Hero Route
router.post('/catch-probability', calculateCatchProbability);

// 5. Crowd & Coach routes
router.get('/crowd/station/:id', getStationCrowd);
router.get('/crowd/train/:trainNumber', getTrainCoachCrowd);

// 5b. Suburban Local & Google Maps Cellular Signal Telemetry routes
router.get('/suburban/upcoming', getUpcomingSuburbanTrains);
router.get('/suburban/crowd-telemetry/:trainNumber', getCoachCrowdTelemetry);
router.get('/suburban/corridors', getSuburbanCorridors);

// 6. Track Anomaly & ESP32 Telemetry
router.get('/track/risk', getTrackRisk);
router.get('/track/telemetry/history', getRealTelemetryHistory);
router.post('/track/sensor', ingestSensorTelemetry);

// 7. Digital Twin & What-If Simulation
router.post('/digital-twin/simulate', simulateWhatIfScenario);

// 8. AI Agent & Meta WhatsApp Cloud API Webhook
router.post('/ai/chat', handleAIChat);
router.post('/ai/agent', handleAIChat);
router.get('/ai/whatsapp-webhook', verifyWebhook);
router.post('/ai/whatsapp-webhook', handleIncomingWebhook);
router.get('/whatsapp/webhook', verifyWebhook);
router.post('/whatsapp/webhook', handleIncomingWebhook);

// 9. Weather Intelligence
router.get('/weather', getWeatherIntelligence);

// 10. Admin & Controller Overview
router.get('/admin/dashboard', getDashboardOverview);
router.get('/admin/alerts', getAlerts);
router.post('/admin/alerts', createAlert);

export default router;

