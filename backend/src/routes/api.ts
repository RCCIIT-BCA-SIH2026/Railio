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
import { verifyWebhook, handleIncomingWebhook, testOutboundTransport, sendWorkerWhatsAppMessage } from '../controllers/whatsappController';
import { getDashboardOverview, getAlerts, createAlert, getWeatherIntelligence } from '../controllers/adminController';
import { getUpcomingSuburbanTrains, getCoachCrowdTelemetry, getSuburbanCorridors } from '../controllers/suburbanController';
import {
  analyzeScene,
  analyzeSign,
  createSession,
  logNavigationEvent,
  recalculateRoute,
  getEnvironmentDefinition
} from '../controllers/navigationController';
import {
  getPlatformConflicts,
  getCrewDutyAlerts,
  getRakeTurnaroundStatus,
  ingestRealTimeTelemetry,
  ingestCautionOrder,
  getActiveCautionOrders,
  getPredictionAuditLog,
  recordActualArrival,
} from '../controllers/operationsController';
import { getGnnCascade, getFederatedLearning, getLogisticsOrchestration } from '../controllers/futureController';

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
router.get('/whatsapp-webhook', verifyWebhook);
router.post('/whatsapp-webhook', handleIncomingWebhook);
router.get('/ai/whatsapp/webhook', verifyWebhook);
router.post('/ai/whatsapp/webhook', handleIncomingWebhook);
router.get('/whatsapp/test-outbound', testOutboundTransport);
router.post('/whatsapp/test-outbound', testOutboundTransport);
router.get('/ai/whatsapp/test-outbound', testOutboundTransport);
router.post('/ai/whatsapp/test-outbound', testOutboundTransport);

// Worker / Admin Outbound WhatsApp Messaging (Reuses exact same shared whatsappService)
router.post('/admin/whatsapp/send', authenticateToken, sendWorkerWhatsAppMessage);
router.post('/worker/whatsapp/send', authenticateToken, sendWorkerWhatsAppMessage);
router.post('/whatsapp/send-worker-message', sendWorkerWhatsAppMessage);



// 9. Weather Intelligence
router.get('/weather', getWeatherIntelligence);

// 10. Admin & Controller Overview
router.get('/admin/dashboard', getDashboardOverview);
router.get('/admin/alerts', getAlerts);
router.post('/admin/alerts', createAlert);

// 11. AI Camera-Based Indoor Navigation Routes
router.post('/navigation/analyze-scene', analyzeScene);
router.post('/navigation/analyze-sign', analyzeSign);
router.post('/navigation/session', createSession);
router.post('/navigation/event', logNavigationEvent);
router.post('/navigation/recalculate', recalculateRoute);
router.get('/navigation/environments/:id', getEnvironmentDefinition);

// 12. Operations Planning (Platform Conflict, Crew HOER, Rake Turnaround)
router.get('/operations/platform-conflicts/:stationCode', getPlatformConflicts);
router.get('/operations/crew-alerts', getCrewDutyAlerts);
router.get('/operations/rake-turnaround', getRakeTurnaroundStatus);

// 13. Real-Time Telemetry Ingestion (RTIS/ISRO GPS + Caution Orders)
router.post('/telemetry/ingest', ingestRealTimeTelemetry);
router.post('/telemetry/caution-orders', ingestCautionOrder);
router.get('/telemetry/caution-orders', getActiveCautionOrders);

// 14. Prediction Audit Trail & Actual Arrival Feedback
router.get('/audit/predictions', getPredictionAuditLog);
router.post('/audit/actual-arrival', recordActualArrival);

// 15. Advanced Future Scopes (GNN, Federated Learning, Logistics)
router.get('/future/gnn-cascade', getGnnCascade);
router.get('/future/federated', getFederatedLearning);
router.get('/future/logistics', getLogisticsOrchestration);

// 16. Smart In-Train Services
import { configureSmartAlarm, optimizeFoodDelivery } from '../controllers/servicesController';
router.post('/services/smart-alarm', configureSmartAlarm);
router.post('/services/food-delivery', optimizeFoodDelivery);

export default router;
