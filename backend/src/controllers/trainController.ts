import { Request, Response } from 'express';
import { db } from '../models/dataStore';
import { aiGateway } from '../services/aiServiceGateway';

export const getTrains = async (req: Request, res: Response): Promise<void> => {
  try {
    const { from, to, date, search } = req.query;
    let result = db.trains;

    if (from && to) {
      const matched = db.searchTrains(from as string, to as string);
      
      // Real-time ML Inference for searched trains
      const enriched = await Promise.all(
        matched.map(async (t) => {
          try {
            const pred = await aiGateway.predictDelay({
              trainNumber: t.trainNumber,
              departureTime: t.departureTime,
              arrivalTime: t.arrivalTime,
              travelDurationMins: (t.totalDistanceKm / Math.max(t.avgSpeed, 10)) * 60,
              distanceKm: t.totalDistanceKm,
              direction: t.source.toUpperCase() === 'SDAH' ? '0' : '1',
              departureDelay: t.liveState?.delayMinutes ?? 0,
              currentSpeed: t.liveState?.speed ?? t.avgSpeed,
              dwellTime: 1.5,
              weatherCondition: db.weatherReports[t.destination]?.condition || 'Clear',
              junctionCongestionLevel: db.deriveJunctionCongestionLevel(t.trainNumber),
            });

            return {
              ...t,
              liveState: {
                ...t.liveState,
                predictedDelay: pred.predictedDelayMinutes,
                delayMinutes: pred.predictedDelayMinutes,
                confidence: pred.confidenceScore,
                status: (pred.predictedDelayMinutes <= 5 ? 'ON_TIME' : 'DELAYED') as any,
              },
            };
          } catch {
            return t;
          }
        })
      );
      result = enriched;
    } else if (search) {
      const q = (search as string).toLowerCase();
      result = result.filter(
        (t) =>
          t.trainNumber.includes(q) ||
          t.name.toLowerCase().includes(q) ||
          t.source.toLowerCase().includes(q) ||
          t.destination.toLowerCase().includes(q)
      );
    }

    res.json({ success: true, count: result.length, trains: result });
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
      // For all-India trains not in local suburban dataset (e.g. 12301, 12951, 20607),
      // fetch real-time live running status directly from ixigo + NTES via AI service!
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

    // Enrich with latest RTIS telemetry if available
    const telemetry = db.getLatestTelemetry(tNum || '');

    res.json({
      success: true,
      trainNumber: train.trainNumber,
      name: train.name,
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

    // ── Ground-reality feature extraction ──────────────────────────────────
    const distanceRemaining = db.computeDistanceRemainingKm(tNum || '');
    const junctionCongestion = db.deriveJunctionCongestionLevel(tNum || '');

    // Get active TSRs on current section
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

    // Get signal block for current section
    const signalBlock = db.getSignalBlock(train.liveState.currentSection);

    // Determine dwell overrun from stop sequence
    const depStop  = train.stops[0];
    const dwellTime = depStop ? 3.0 : 2.0;  // minutes (simplified)

    // Weather for destination
    const weatherCondition =
      db.weatherReports[train.destination]?.condition || 'Clear';

    // Fog/visibility (from weather data if available)
    const weatherReport = db.weatherReports[train.destination];
    const fogVisibilityKm = weatherReport?.visibilityKm ?? 10.0;

    // Preceding train headway (simplified: use delay difference)
    const precedingTrainDelayMin = Math.max(0, train.liveState.delayMinutes - 5);

    // ── Call Dynamic Ground-Truth Multi-Station Cascade ML inference ────
    const dynamicETA = await aiGateway.predictDynamicGroundTruthETA({
      trainNumber:        train.trainNumber,
      trainName:          train.name,
      rakeType:           train.type.includes('Vande') ? 'VANDE_BHARAT_TRAINSET' : (train.type.includes('Suburban') ? 'SUBURBAN_EMU_12CAR' : 'LHB_COACHING'),
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

    // ── Log prediction for audit trail ───────────────────────────────────
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

