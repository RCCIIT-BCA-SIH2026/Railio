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
      res.status(404).json({ success: false, error: 'Train not found' });
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

    // ── Call ML inference ─────────────────────────────────────────────────
    const prediction = await aiGateway.predictDelay({
      trainNumber:        train.trainNumber,
      departureTime:      train.departureTime,
      arrivalTime:        train.arrivalTime,
      travelDurationMins: train.totalDistanceKm / Math.max(train.avgSpeed, 10) * 60,
      distanceKm:         distanceRemaining,
      line:               'Main Line',
      division:           'Sealdah',
      direction:          'DOWN',
      avgDelay5Yr:        5.0,
      departureDelay:     train.liveState.delayMinutes,
      currentSpeed:       train.liveState.speed,
      dwellTime:          dwellTime,
      weatherCondition,
      junctionCongestionLevel: junctionCongestion,
      activeTSRs,
      signalAspect:       signalBlock ? {
        aspect:          signalBlock.aspect,
        distanceMeters:  signalBlock.distanceMeters,
        expectedHaltMin: signalBlock.expectedHaltMin,
      } : undefined,
      precedingTrainDelayMin,
      fogVisibilityKm,
    });

    // ── Log prediction for audit trail ───────────────────────────────────
    db.logPrediction({
      trainNumber:      train.trainNumber,
      stationCode:      train.destination,
      predictedDelayMin: prediction.predictedDelayMinutes,
      predictedAt:      new Date().toISOString(),
      modelType:        prediction.modelType,
      confidenceScore:  prediction.confidenceScore,
    });

    res.json({
      success: true,
      trainNumber:      train.trainNumber,
      name:             train.name,
      source:           train.source,
      destination:      train.destination,
      scheduledArrival: train.arrivalTime,
      predictedArrival: `${train.arrivalTime} (${prediction.arrivalWindow})`,
      distanceRemainingKm: distanceRemaining,
      junctionCongestionLevel: junctionCongestion,
      activeTSRCount:  activeTSRs.length,
      signalAspect:    signalBlock?.aspect || 'GREEN',
      prediction,
      timestamp:       new Date().toISOString(),
    });
  } catch (error) {
    console.error('[ETA] Prediction error:', error);
    res.status(500).json({ success: false, error: 'ETA prediction failed' });
  }
};
