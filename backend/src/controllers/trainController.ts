import { Request, Response } from 'express';
import { db } from '../models/dataStore';
import { zoneRegistry } from '../models/zoneRegistry';
import { aiGateway } from '../services/aiServiceGateway';
import { simulationEngine } from '../services/simulationEngine';

export const getTrains = async (req: Request, res: Response): Promise<void> => {
  try {
    const { from, to, date, search, zone, division, limit, offset, minLat, maxLat, minLng, maxLng } = req.query;

    // 1. Spatial bounding-box query (e.g. Map viewport bounds)
    if (minLat && maxLat && minLng && maxLng) {
      const spatialTrains = db.queryByBoundingBox(
        parseFloat(minLat as string),
        parseFloat(maxLat as string),
        parseFloat(minLng as string),
        parseFloat(maxLng as string),
        parseInt((limit as string) || '300', 10)
      );
      res.json({
        success: true,
        count: spatialTrains.length,
        activeScale: db.activeScaleLimit,
        totalFleet: db.trains.length,
        trains: spatialTrains
      });
      return;
    }

    // 2. Search by route (from station -> to station)
    if (from && to) {
      const matched = db.searchTrains(from as string, to as string, zone as string);
      
      // Fast vectorized ML delay batch inference for searched trains
      const batchPayload = matched.map((t) => ({
        trainNumber: t.trainNumber,
        zone: t.zone || 'NR',
        departureTime: t.departureTime,
        arrivalTime: t.arrivalTime,
        travelDurationMins: (t.totalDistanceKm / Math.max(t.avgSpeed, 10)) * 60,
        distanceKm: t.totalDistanceKm,
        direction: t.source.toUpperCase() === 'SDAH' || t.source.toUpperCase() === 'NDLS' ? 0 : 1,
        departureDelay: t.liveState?.delayMinutes ?? 0,
        currentSpeed: t.liveState?.speed ?? t.avgSpeed,
        dwellTime: 1.5,
        weatherCondition: db.weatherReports[t.destination]?.condition || 'Clear',
        junctionCongestionLevel: db.deriveJunctionCongestionLevel(t.trainNumber),
      }));

      const predictions = await aiGateway.predictDelaysBatch(batchPayload);
      const predMap = new Map();
      predictions.forEach((p) => {
        if (p.trainNumber) predMap.set(p.trainNumber, p);
      });

      const enriched = matched.map((t) => {
        const pred = predMap.get(t.trainNumber);
        if (pred) {
          return {
            ...t,
            liveState: {
              ...t.liveState,
              predictedDelay: pred.predictedDelayMinutes,
              delayMinutes: pred.predictedDelayMinutes,
              confidence: pred.confidenceScore,
              status: pred.predictedDelayMinutes <= 5 ? 'ON_TIME' : 'DELAYED',
              delayReasons: pred.explainability?.map((e: any) => ({ factor: e.factor, impactMin: e.impactMin })) || []
            }
          };
        }
        return t;
      });

      res.json({
        success: true,
        count: enriched.length,
        activeScale: db.activeScaleLimit,
        totalFleet: db.trains.length,
        trains: enriched
      });
      return;
    }

    // 3. Search query filter
    if (search) {
      const q = (search as string).toLowerCase().trim();
      const matched = db.trains
        .filter((t) =>
          t.trainNumber.includes(q) ||
          t.name.toLowerCase().includes(q) ||
          t.source.toLowerCase().includes(q) ||
          t.destination.toLowerCase().includes(q) ||
          (t.zone && t.zone.toLowerCase() === q)
        )
        .slice(0, parseInt((limit as string) || '100', 10));

      res.json({
        success: true,
        count: matched.length,
        activeScale: db.activeScaleLimit,
        totalFleet: db.trains.length,
        trains: matched
      });
      return;
    }

    // 4. Default: Return active slice partitioned by zone / division / limit
    const parsedLimit = limit ? parseInt(limit as string, 10) : 500;
    const parsedOffset = offset ? parseInt(offset as string, 10) : 0;
    const activeSlice = db.getActiveTrainsSlice(zone as string, division as string, parsedLimit, parsedOffset);

    res.json({
      success: true,
      count: activeSlice.length,
      activeScale: db.activeScaleLimit,
      totalFleet: db.trains.length,
      trains: activeSlice
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve trains' });
  }
};

export const getTrainByNumber = async (req: Request, res: Response): Promise<void> => {
  try {
    const tNum = Array.isArray(req.params.trainNumber)
      ? req.params.trainNumber[0]
      : req.params.trainNumber;
    const train = db.getTrain(tNum || '');
    if (!train) {
      res.status(404).json({ success: false, error: 'Train not found' });
      return;
    }
    res.json({ success: true, train });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve train' });
  }
};

export const getLiveTrainStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const tNum = Array.isArray(req.params.trainNumber)
      ? req.params.trainNumber[0]
      : req.params.trainNumber;
    const train = db.getTrain(tNum || '');
    
    if (!train) {
      const ixigoData = await aiGateway.getIxigoRunningStatus(tNum || '');
      if (ixigoData && !ixigoData.error && ixigoData.stations?.length > 0) {
        const passedStns = ixigoData.stations.filter((s: any) => s.status === 'PASSED');
        const lastPassed = passedStns.length > 0 ? passedStns[passedStns.length - 1] : null;
        const upcomingStns = ixigoData.stations.filter((s: any) => s.status === 'UPCOMING');
        const nextStn = upcomingStns.length > 0 ? upcomingStns[0] : null;

        res.json({
          success: true,
          trainNumber: tNum,
          name: ixigoData.train_name || `Train ${tNum}`,
          isAllIndiaTrain: true,
          liveSource: 'ixigo.com (Live Running Status & Delays)',
          lastUpdated: ixigoData.last_updated,
          liveState: {
            currentStation: lastPassed?.station_code || ixigoData.stations[0]?.station_code || '',
            nextStation: nextStn?.station_code || '',
            delayMinutes: lastPassed?.delay_minutes ?? (nextStn?.delay_minutes ?? 0),
            status: (lastPassed?.delay_minutes ?? 0) <= 5 ? 'ON_TIME' : 'DELAYED',
            speed: 85,
            progressPct: Math.round((ixigoData.stations_passed / Math.max(1, ixigoData.total_stations)) * 100),
          },
          ixigoData,
          stops: ixigoData.stations.map((s: any, idx: number) => ({
            code: s.station_code,
            name: s.station_name,
            sequence: idx + 1,
            distanceKm: parseFloat(s.distance) || (idx * 50),
            scheduledArrival: s.arrival_scheduled,
            scheduledDeparture: s.departure_scheduled,
            actualArrival: s.arrival_actual,
            actualDeparture: s.departure_actual,
            delay: s.delay,
            platform: s.platform,
            status: s.status,
          })),
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(404).json({ success: false, error: 'Train not found in live tracking feeds' });
      return;
    }

    const telemetry = db.getLatestTelemetry(tNum || '');

    res.json({
      success: true,
      trainNumber: train.trainNumber,
      name: train.name,
      zone: train.zone,
      liveState: train.liveState,
      stops: train.stops,
      latestTelemetry: telemetry || null,
      activeTSRs: db.getTSRsForSection(train.liveState.currentSection),
      signalBlock: db.getSignalBlock(train.liveState.currentSection) || null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get live status' });
  }
};

export const setSimulationScale = async (req: Request, res: Response): Promise<void> => {
  try {
    const { scale } = req.body;
    const numScale = parseInt(scale, 10);
    if (isNaN(numScale) || numScale < 10) {
      res.status(400).json({ success: false, error: 'Invalid scale number (min 10)' });
      return;
    }
    const result = db.setScaleLimit(numScale);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getOperationalZones = async (req: Request, res: Response): Promise<void> => {
  try {
    const zones = zoneRegistry.getAllZones();
    const health = db.getEngineHealth();
    res.json({
      success: true,
      zonesCount: zones.length,
      zones,
      zoneDistribution: health.zoneDistribution
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getEngineStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const metrics = simulationEngine.getTelemetryMetrics();
    const health = db.getEngineHealth();
    res.json({
      success: true,
      ...health,
      ...metrics,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getIxigoTrainRunningStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const tNum = Array.isArray(req.params.trainNumber)
      ? req.params.trainNumber[0]
      : req.params.trainNumber;
    const data = await aiGateway.getIxigoRunningStatus(tNum || '');
    res.json({ success: true, ...data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch ixigo status' });
  }
};

export const getLivePollerStatsHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = await aiGateway.getMLLivePollerStats();
    res.json({ success: true, stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getMLSelfLearningHealthHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const health = await aiGateway.getMLSelfLearningHealth();
    res.json({ success: true, health });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getTrainETAPrediction = async (req: Request, res: Response): Promise<void> => {
  try {
    const tNum = Array.isArray(req.params.trainNumber)
      ? req.params.trainNumber[0]
      : req.params.trainNumber;
    const train = db.getTrain(tNum || '');

    if (!train) {
      res.status(404).json({ success: false, error: 'Train not found' });
      return;
    }

    const distanceRemaining = db.computeDistanceRemainingKm(tNum || '');
    const junctionCongestion = db.deriveJunctionCongestionLevel(tNum || '');

    const activeTSRs = db.getActiveCautionOrders()
      .filter(c => c.sectionId === train.liveState.currentSection)
      .map(c => ({
        sectionId:      c.sectionId,
        startKm:        c.startKm,
        endKm:          c.endKm,
        maxSpeedKmh:    c.maxSpeedKmh,
        normalSpeedKmh: c.normalSpeedKmh,
        reason:         c.reason,
      }));

    const signalBlock = db.getSignalBlock(train.liveState.currentSection);
    const depStop  = train.stops[0];
    const dwellTime = depStop ? 3.0 : 2.0;

    const weatherCondition =
      db.weatherReports[train.destination]?.condition || 'Clear';
    const weatherReport = db.weatherReports[train.destination];
    const fogVisibilityKm = weatherReport?.visibilityKm ?? 10.0;
    const precedingTrainDelayMin = Math.max(0, train.liveState.delayMinutes - 5);

    const dynamicETA = await aiGateway.predictDynamicGroundTruthETA({
      trainNumber:        train.trainNumber,
      trainName:          train.name,
      rakeType:           train.type.includes('VANDE') || train.type.includes('Vande') ? 'VANDE_BHARAT_TRAINSET' : (train.type.includes('SUBURBAN') || train.type.includes('Suburban') ? 'SUBURBAN_EMU_12CAR' : 'LHB_COACHING'),
      locoType:           'WAP-7',
      sourceStation:      train.source,
      destinationStation: train.destination,
      currentSpeedKmh:    train.liveState.speed,
      currentChainageKm:  train.totalDistanceKm - distanceRemaining,
      currentSectionId:   train.liveState.currentSection,
      currentDelayMinutes: train.liveState.delayMinutes,
      activeIncidents:    db.getActiveCrewIncidents(train.trainNumber).map(inc => ({
        reporterRole:          inc.reporterRole,
        staffId:               inc.staffId,
        incidentCategory:      inc.incidentCategory,
        coachNumber:           inc.coachNumber,
        severity:              inc.severity,
        estimatedClearanceMin: inc.estimatedClearanceMin,
        details:               inc.details,
      })),
      activeTSRs,
      signalAspect:       signalBlock?.aspect || 'GREEN',
      fogVisibilityKm,
      weatherCondition,
      precedingTrainDelayMin,
      stops:              train.stops,
    });

    const activeIncidents = db.getActiveCrewIncidents(train.trainNumber);

    db.logPrediction({
      trainNumber:      train.trainNumber,
      stationCode:      train.destination,
      predictedDelayMin: dynamicETA.overallPredictedDelayMinutes,
      predictedAt:      new Date().toISOString(),
      modelType:        'DynamicGroundTruthCascade (v3.0)',
      confidenceScore:  dynamicETA.overallConfidenceScore,
    });

    res.json({
      success: true,
      trainNumber:      train.trainNumber,
      name:             train.name,
      zone:             train.zone,
      source:           train.source,
      destination:      train.destination,
      scheduledArrival: train.arrivalTime,
      predictedArrival: `${dynamicETA.predictedFinalETA} (+${dynamicETA.overallPredictedDelayMinutes} min)`,
      distanceRemainingKm: distanceRemaining,
      junctionCongestionLevel: junctionCongestion,
      activeTSRCount:      activeTSRs.length,
      activeIncidentCount: activeIncidents.length,
      signalAspect:        signalBlock?.aspect || 'GREEN',
      dynamicETA,
      prediction: {
        predictedDelayMinutes: dynamicETA.overallPredictedDelayMinutes,
        predictedETA:          dynamicETA.predictedFinalETA,
        scheduledArrival:      train.arrivalTime,
        arrivalWindow:         `${dynamicETA.predictedFinalETA} (+${dynamicETA.overallConfidenceInterval[0]} to +${dynamicETA.overallConfidenceInterval[1]} min)`,
        confidenceScore:       dynamicETA.overallConfidenceScore,
        confidenceIntervalMin: dynamicETA.overallConfidenceInterval,
        delayProbability:      Math.min(0.98, dynamicETA.overallPredictedDelayMinutes / 25.0 + 0.1),
        expectedDelay:         dynamicETA.overallPredictedDelayMinutes > 0 ? `+${dynamicETA.overallPredictedDelayMinutes} min` : 'On Time',
        explainability:        dynamicETA.explainability,
        catchUpPotentialMin:   dynamicETA.currentStatus?.totalRecoveredMinutes || 0,
        modelType:             'DynamicGroundTruthCascade (v3.0)',
      },
      timestamp:       new Date().toISOString(),
    });
  } catch (error) {
    console.error('[ETA] Prediction error:', error);
    res.status(500).json({ success: false, error: 'ETA prediction failed' });
  }
};
