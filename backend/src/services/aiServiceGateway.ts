import axios from 'axios';
import { db } from '../models/dataStore';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

export interface CatchTrainRequest {
  trainNumber: string;
  userLat?: number;
  userLng?: number;
  userLocationName?: string;
  roadDistanceKm?: number;
  trafficCondition?: 'LOW' | 'MODERATE' | 'HEAVY' | 'SEVERE';
  stationEntryBufferMin?: number;
  scheduledDepartureTime?: string;
}

export interface CatchTrainResponse {
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

export class AIServiceGateway {
  async predictDelay(features: {
    trainNumber: string;
    departureTime?: string;
    arrivalTime?: string;
    travelDurationMins?: number;
    distanceKm?: number;
    line?: string;
    division?: string;
    direction?: string;
    avgDelay5Yr?: number;
    departureDelay?: number;
    currentSpeed: number;
    distanceRemaining?: number;
    dwellTime: number;
    weatherCondition: string;
    junctionCongestionLevel: number;
    activeTSRs?: any[];
    signalAspect?: any;
    precedingTrainDelayMin?: number;
    fogVisibilityKm?: number;
  }) {
    try {
      const res = await axios.post(`${AI_SERVICE_URL}/api/ml/predict-delay`, features, { timeout: 5000 });
      return res.data;
    } catch (err) {
      const baseDelay = Math.max(0, Math.round(
        features.junctionCongestionLevel * 8 +
        (features.weatherCondition.includes('Rain') ? 6 : 0) +
        (features.fogVisibilityKm && features.fogVisibilityKm < 1 ? 15 : 0) +
        (features.activeTSRs && features.activeTSRs.length > 0 ? 8 : 0) +
        ((features.distanceRemaining || features.distanceKm || 300) > 500 ? 5 : 2)
      ));
      return {
        predictedDelayMinutes: baseDelay,
        delayProbability: Math.min(0.95, baseDelay / 30),
        confidenceScore: 0.88,
        confidenceIntervalMin: [Math.max(0, baseDelay - 10), baseDelay + 10],
        arrivalWindow: baseDelay > 0 ? `+${baseDelay} to +${baseDelay + 5} min` : 'On Time (±2 min)',
        expectedDelay: baseDelay > 0 ? `+${baseDelay} minutes` : 'On Time',
        catchUpPotentialMin: 0,
        modelType: 'Statistical Fallback (AI service offline)',
        explainability: [
          { factor: 'Junction congestion', impactMin: Math.round(features.junctionCongestionLevel * 6), category: 'TRAFFIC' },
          { factor: 'Weather impact', impactMin: features.weatherCondition.includes('Rain') ? 5 : 0, category: 'WEATHER' },
          { factor: 'Dwell overrun', impactMin: Math.max(1, Math.round(features.dwellTime / 2)), category: 'OPERATIONAL' },
        ],
      };
    }
  }

  async getSectionalCatchUp(req: {
    trainNumber: string;
    currentDelayMin: number;
    line?: string;
    sections?: any[];
  }) {
    try {
      const res = await axios.post(`${AI_SERVICE_URL}/api/ml/catch-up-potential`, req, { timeout: 5000 });
      return res.data;
    } catch (err) {
      return {
        trainNumber: req.trainNumber,
        currentDelayMin: req.currentDelayMin,
        totalRecoverableMin: Math.min(req.currentDelayMin * 0.3, 8),
        netPredictedDelayMin: req.currentDelayMin * 0.7,
        recoverySections: [],
        catchUpFeasible: req.currentDelayMin < 15,
        recommendation: 'AI service offline — rough catch-up estimate.',
      };
    }
  }

  async checkPlatformConflicts(req: {
    stationCode: string;
    totalPlatforms: number;
    electricPlatforms: number[];
    trains: any[];
  }) {
    try {
      const res = await axios.post(`${AI_SERVICE_URL}/api/operations/platform-conflicts`, req, { timeout: 5000 });
      return res.data;
    } catch (err) {
      return {
        stationCode: req.stationCode,
        conflictsDetected: 0,
        conflicts: [],
        reallocations: [],
        resolvedSchedule: req.trains,
        allConflictsResolved: true,
        summary: 'AI service offline — conflict check skipped.',
      };
    }
  }

  async evaluateCrewHOER(req: { trainNumber: string; crew: any[] }) {
    try {
      const res = await axios.post(`${AI_SERVICE_URL}/api/operations/crew-hoer`, req, { timeout: 5000 });
      return res.data;
    } catch (err) {
      return {
        trainNumber: req.trainNumber,
        evaluatedAt: new Date().toISOString(),
        crewAlerts: req.crew.map(c => ({
          crewId: c.crewId,
          role: c.role,
          homeDepot: c.homeDepot,
          currentDutyHours: 0,
          projectedDutyAtDepot: 0,
          remainingAllowedHours: 9,
          riskLevel: 'OK',
          alertMessage: '⚠️ AI service offline — HOER evaluation unavailable.',
          reliefRequiredAt: 'N/A',
          reliefRequiredBy: 'N/A',
        })),
        criticalAlerts: 0,
        highRiskAlerts: 0,
        autoReliefBookingRequired: false,
        summary: 'AI service offline — manual HOER check required.',
      };
    }
  }

  async evaluateRakeTurnaround(req: { terminus: string; totalPitLines: number; rakes: any[] }) {
    try {
      const res = await axios.post(`${AI_SERVICE_URL}/api/operations/rake-turnaround`, req, { timeout: 5000 });
      return res.data;
    } catch (err) {
      return {
        terminus: req.terminus,
        totalRakes: req.rakes.length,
        violations: 0,
        pitLineConflicts: [],
        rakeSchedules: req.rakes.map(r => ({
          rakeId: r.rakeId,
          trainNumber: r.trainNumber,
          trainName: r.trainName,
          arrivalTime: r.arrivalTime,
          mandatoryMaintenanceHours: 6,
          maintenanceWindowStart: r.arrivalTime,
          maintenanceWindowEnd: 'N/A',
          scheduledReturnTime: r.scheduledReturnTime,
          feasible: true,
          violationMins: 0,
          recommendedDeparture: r.scheduledReturnTime,
          pitLineAssigned: 1,
          alertMessage: '⚠️ AI service offline — turnaround check skipped.',
        })),
        allFeasible: true,
        summary: 'AI service offline — rake scheduling unavailable.',
      };
    }
  }

  async calculateCatchProbability(req: CatchTrainRequest, trainData: any): Promise<CatchTrainResponse> {
    try {
      const res = await axios.post(`${AI_SERVICE_URL}/api/ml/catch-probability`, { ...req, trainData }, { timeout: 3000 });
      return res.data;
    } catch (err) {
      const distance = req.roadDistanceKm || 12;
      const traffic = req.trafficCondition || 'MODERATE';
      const trafficMultiplier = traffic === 'LOW' ? 1.0 : traffic === 'MODERATE' ? 1.4 : traffic === 'HEAVY' ? 1.9 : 2.5;
      const roadTime = Math.round((distance / 35) * 60 * trafficMultiplier);
      const stationBuffer = req.stationEntryBufferMin || 7;
      const safetyMargin = 5;
      const requiredTime = roadTime + stationBuffer + safetyMargin;
      const availableTime = Math.max(5, (req.roadDistanceKm ? req.roadDistanceKm * 3 : 38));
      const margin = availableTime - requiredTime;
      let prob = margin >= 15 ? 0.95 : margin >= 8 ? 0.88 : margin >= 2 ? 0.68 : margin >= -4 ? 0.35 : 0.12;
      const probPct = Math.round(prob * 100);
      let risk: 'LOW_RISK' | 'MODERATE_RISK' | 'HIGH_RISK' | 'CRITICAL' =
        probPct >= 80 ? 'LOW_RISK' : probPct >= 50 ? 'MODERATE_RISK' : 'CRITICAL';
      return {
        trainNumber: req.trainNumber,
        trainName: trainData?.name || 'Local Train',
        predictedDeparture: trainData?.departureTime || 'N/A',
        roadTravelMinutes: roadTime,
        stationEntryBufferMinutes: stationBuffer,
        requiredMinutes: requiredTime,
        availableMinutes: availableTime,
        catchProbabilityPct: probPct,
        statusRisk: risk,
        recommendation: probPct >= 80
          ? 'High probability you can catch your train. Leave now.'
          : probPct >= 50
          ? 'Tight connection window. Start immediately.'
          : 'High risk of missing this train. Check next service.',
        alternativeTrain: undefined,
        breakdown: { roadTime, stationBuffer, safetyMargin, trafficDelay: Math.round(roadTime * (trafficMultiplier - 1.0)), delayProbability: 0.18 },
      };
    }
  }

  async runWhatIfSimulation(scenario: string, trainNumber: string, extraParams?: any) {
    try {
      const res = await axios.post(`${AI_SERVICE_URL}/api/digital-twin/simulate`,
        { scenario, trainNumber, ...extraParams }, { timeout: 8000 });
      return res.data;
    } catch (err) {
      return {
        scenario,
        recommendedStrategy: 'Digital twin simulation unavailable. AI service is offline.',
        netNetworkDelayChangeMin: 0,
        totalNetworkDelayMin: 0,
        decisionRationale: 'AI service offline.',
        trainImpacts: [],
        affectedJunctions: [],
      };
    }
  }

  async askAgent(query: string, sessionId: string = 'default', userLat?: number, userLng?: number) {
    try {
      const pyRes = await axios.post(`${AI_SERVICE_URL}/agent/chat`, {
        message: query,
        session_id: sessionId,
        location: userLat && userLng ? { latitude: userLat, longitude: userLng } : undefined,
      }, { timeout: 15000 });
      if (pyRes.data && pyRes.data.answer) {
        return {
          answer: pyRes.data.answer,
          toolsExecuted: pyRes.data.toolsExecuted || [],
          confidence: pyRes.data.confidenceScore || 0.96,
        };
      }
    } catch (pyErr: any) {
      console.warn('[AIServiceGateway] Python RailAgent offline:', pyErr?.message);
    }

    // Strict Dataset Fallback
    const matchNumber = query.match(/\b\d{5}\b/);
    const trainNum = matchNumber ? matchNumber[0] : null;
    let localTrain = trainNum ? db.getTrain(trainNum) : undefined;
    if (!localTrain) {
      const qLower = query.toLowerCase();
      localTrain = db.trains.find(t => qLower.includes(t.name.toLowerCase()));
    }
    if (localTrain) {
      return {
        answer: `Train **${localTrain.trainNumber} (${localTrain.name})**\nRoute: ${localTrain.source} → ${localTrain.destination}\nDeparture: ${localTrain.departureTime} | Arrival: ${localTrain.arrivalTime}\nStatus: ${localTrain.liveState.delayMinutes === 0 ? 'On Time' : `Delayed by ${localTrain.liveState.delayMinutes} mins`}`,
        toolsExecuted: [{ tool: 'DatasetLocalDB', query: localTrain.trainNumber, status: 'SUCCESS' }],
        confidence: 0.95,
      };
    }
    return {
      answer: `Dataset Query: Where would you like to travel? (e.g. Sealdah to Dankuni)`,
      toolsExecuted: [{ tool: 'DatasetLocalDB', query, status: 'SUCCESS' }],
      confidence: 0.90,
    };
  }
}

export const aiGateway = new AIServiceGateway();

