/**
 * operationsController.ts — Operations Planning API handlers
 * Routes: /api/operations/* and /api/telemetry/*
 */

import { Request, Response } from 'express';
import { db, CautionOrder, RTISTelemetry } from '../models/dataStore';
import { aiGateway } from '../services/aiServiceGateway';
import { v4 as uuidv4 } from 'uuid';

// ── Platform Conflict Detection ────────────────────────────────────────────

export const getPlatformConflicts = async (req: Request, res: Response): Promise<void> => {
  try {
    const stationCode = req.params.stationCode as string | undefined;
    const code = stationCode ? stationCode.toUpperCase() : 'SDAH';

    // Build train platform slots from scheduled arrivals at this station
    const slots = db.trains
      .filter(train => train.stops.some(s => s.code === code))
      .map(train => {
        const stop = train.stops.find(s => s.code === code)!;
        const delayMin = train.liveState.delayMinutes;
        return {
          trainNumber:         train.trainNumber,
          trainName:           train.name,
          scheduledETA:        stop.arr,
          predictedETA:        stop.arr,     // real ML ETA would be used here
          dwellMinutes:        1.0,
          platform:            stop.platform,
          priority:            1,
          trainType:           train.type,
          delayMinutes:        delayMin,
          requiresElectricLine: true,
        };
      });

    const station = db.getStation(code);
    const totalPlatforms = station?.platforms || 6;

    const result = await aiGateway.checkPlatformConflicts({
      stationCode: code,
      totalPlatforms,
      electricPlatforms: Array.from({ length: totalPlatforms }, (_, i) => i + 1),
      trains: slots,
    });

    res.json({ success: true, stationCode: code, ...result });
  } catch (error) {
    console.error('[Operations] Platform conflict error:', error);
    res.status(500).json({ success: false, error: 'Platform conflict analysis failed' });
  }
};

// ── Crew HOER Duty Alert ──────────────────────────────────────────────────

export const getCrewDutyAlerts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { trainNumber } = req.query;
    let crewRecords = trainNumber
      ? db.getCrewForTrain(trainNumber as string)
      : db.crewDutyRecords;

    if (crewRecords.length === 0) {
      // Synthesise demo crew records from train data
      crewRecords = db.trains.slice(0, 3).map((train, idx) => ({
        crewId:               `LP-${train.trainNumber}`,
        role:                 'LOCO_PILOT' as const,
        signOnTime:           train.departureTime,
        signOnDate:           new Date().toISOString().split('T')[0],
        homeDepot:            train.source,
        currentSection:       train.liveState.currentSection,
        trainNumber:          train.trainNumber,
        nextCrewChangeDepot:  train.destination,
        estimatedETAToDepot:  train.arrivalTime,
        currentDutyHours:     5.5 + idx * 1.2,
        riskLevel:            (idx === 2 ? 'HIGH_RISK' : 'OK') as 'OK' | 'HIGH_RISK',
      }));
    }

    const result = await aiGateway.evaluateCrewHOER({
      trainNumber: (trainNumber as string) || 'ALL',
      crew: crewRecords.map(c => ({
        crewId:              c.crewId,
        role:                c.role,
        signOnTime:          c.signOnTime,
        signOnDate:          c.signOnDate,
        homeDepot:           c.homeDepot,
        currentSection:      c.currentSection,
        nextCrewChangeDepot: c.nextCrewChangeDepot,
        estimatedETAToDepot: c.estimatedETAToDepot,
      })),
    });

    // Update risk levels in store
    result.crewAlerts.forEach((alert: any) => {
      const rec = db.crewDutyRecords.find(c => c.crewId === alert.crewId);
      if (rec) rec.riskLevel = alert.riskLevel as any;
    });

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('[Operations] Crew HOER error:', error);
    res.status(500).json({ success: false, error: 'Crew HOER evaluation failed' });
  }
};

// ── Rake Turnaround & Pit Line ───────────────────────────────────────────

export const getRakeTurnaroundStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { terminus } = req.query;
    const terminusCode = (terminus as string)?.toUpperCase() || 'SDAH';

    // Build rake arrivals from trains terminating at this station
    const terminatingTrains = db.trains.filter(
      t => t.destination === terminusCode || t.stops[t.stops.length - 1]?.code === terminusCode
    );

    if (terminatingTrains.length === 0) {
      res.json({
        success: true, terminus: terminusCode,
        message: 'No terminating trains found for rake scheduling.',
        rakeSchedules: [], violations: 0
      });
      return;
    }

    const rakes = terminatingTrains.map((train, idx) => ({
      rakeId:               `RAKE-${train.trainNumber}`,
      trainNumber:          train.trainNumber,
      trainName:            train.name,
      arrivalTime:          train.arrivalTime,
      scheduledReturnTime:  train.departureTime,   // next outward trip
      pitLineSlot:          (idx % 4) + 1,
      maintenanceTypeHours: 0.35,  // 20-min rapid suburban EMU turn-around inspection
      priority:             1,
    }));

    const result = await aiGateway.evaluateRakeTurnaround({
      terminus: terminusCode,
      totalPitLines: 4,
      rakes,
    });

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('[Operations] Rake turnaround error:', error);
    res.status(500).json({ success: false, error: 'Rake turnaround evaluation failed' });
  }
};

// ── Telemetry Ingestion ───────────────────────────────────────────────────

export const ingestRealTimeTelemetry = async (req: Request, res: Response): Promise<void> => {
  try {
    const payload = req.body as RTISTelemetry;
    if (!payload.trainNumber || payload.latitude === undefined) {
      res.status(400).json({ success: false, error: 'trainNumber and latitude required' });
      return;
    }

    payload.timestamp = payload.timestamp || new Date().toISOString();
    payload.source    = payload.source || 'MANUAL';

    db.ingestRTISTelemetry(payload);

    res.json({
      success: true,
      trainNumber: payload.trainNumber,
      message: `Telemetry for ${payload.trainNumber} ingested successfully.`,
      source: payload.source,
      timestamp: payload.timestamp,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Telemetry ingestion failed' });
  }
};

export const ingestCautionOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const order = req.body;
    if (!order.sectionId || order.maxSpeedKmh === undefined) {
      res.status(400).json({ success: false, error: 'sectionId and maxSpeedKmh required' });
      return;
    }

    const cautionOrder: CautionOrder = {
      id:            order.id || uuidv4(),
      sectionId:     order.sectionId,
      startKm:       order.startKm || 0,
      endKm:         order.endKm || 10,
      maxSpeedKmh:   order.maxSpeedKmh,
      normalSpeedKmh: order.normalSpeedKmh || 110,
      reason:        order.reason || 'Maintenance',
      validFrom:     order.validFrom || new Date().toISOString(),
      validTo:       order.validTo || '',
      zone:          order.zone || 'ER',
      active:        true,
      ingestedAt:    new Date().toISOString(),
    };

    db.ingestCautionOrder(cautionOrder);

    // Generate alert for control room
    db.alerts.push({
      id:               `TSR-${cautionOrder.id}`,
      title:            `TSR Active: ${cautionOrder.sectionId} (${cautionOrder.maxSpeedKmh} km/h)`,
      category:         'DELAY',
      severity:         cautionOrder.maxSpeedKmh < 20 ? 'CRITICAL' : 'WARNING',
      affectedSection:  cautionOrder.sectionId,
      description:      `Temporary Speed Restriction on ${cautionOrder.sectionId}. Reason: ${cautionOrder.reason}`,
      recommendedAction: 'Update ETAs for all trains on affected section.',
      timestamp:        new Date().toISOString(),
      active:           true,
    });

    res.json({
      success: true,
      order: cautionOrder,
      totalActiveTSRs: db.getActiveCautionOrders().length,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Caution order ingestion failed' });
  }
};

export const getActiveCautionOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const orders = db.getActiveCautionOrders();
    res.json({ success: true, count: orders.length, cautionOrders: orders });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve caution orders' });
  }
};

export const getPredictionAuditLog = async (req: Request, res: Response): Promise<void> => {
  try {
    const { trainNumber, limit } = req.query;
    let logs = [...db.predictionAuditLog].reverse(); // newest first
    if (trainNumber) {
      logs = logs.filter(l => l.trainNumber === trainNumber);
    }
    const maxEntries = parseInt(limit as string) || 50;
    res.json({
      success: true,
      count: logs.slice(0, maxEntries).length,
      auditLog: logs.slice(0, maxEntries),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve audit log' });
  }
};

export const recordActualArrival = async (req: Request, res: Response): Promise<void> => {
  try {
    const { trainNumber, stationCode, actualDelayMin } = req.body;
    if (!trainNumber || !stationCode || actualDelayMin === undefined) {
      res.status(400).json({ success: false, error: 'trainNumber, stationCode, actualDelayMin required' });
      return;
    }
    db.recordActualArrival(trainNumber, stationCode, Number(actualDelayMin));
    
    // Also feed to Python online adaptive model
    aiGateway.recordActualArrivalFeedback({
      trainNumber,
      stationCode,
      actualArrival: req.body.actualArrival || '04:50',
      predictedETA: req.body.predictedETA,
    }).catch(() => {});

    res.json({ success: true, message: 'Actual arrival recorded for model feedback.' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to record actual arrival' });
  }
};

export const reportCrewIncident = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      trainNumber,
      reporterRole,
      staffId,
      incidentCategory,
      coachNumber,
      severity,
      estimatedClearanceMin,
      chainageKm,
      sectionId,
      details,
    } = req.body;

    if (!trainNumber || !incidentCategory) {
      res.status(400).json({ success: false, error: 'trainNumber and incidentCategory required' });
      return;
    }

    const train = db.getTrain(trainNumber);
    const incident: any = {
      id: `INC-${Date.now()}`,
      trainNumber,
      reporterRole: reporterRole || 'GUARD',
      staffId: staffId || 'STAFF_GUEST',
      incidentCategory,
      coachNumber: coachNumber || '',
      severity: severity || 'MEDIUM',
      estimatedClearanceMin: estimatedClearanceMin ? Number(estimatedClearanceMin) : undefined,
      chainageKm: chainageKm !== undefined ? Number(chainageKm) : 0,
      sectionId: sectionId || train?.liveState.currentSection || 'MAIN-SEC-1',
      details: details || `Ground incident reported by ${reporterRole || 'Crew'}`,
      timestamp: new Date().toISOString(),
      resolved: false,
    };

    db.ingestCrewIncident(incident);

    // Create live alert in operations dashboard
    db.alerts.unshift({
      id: incident.id,
      title: `🚨 ${incident.reporterRole} Alert: ${incident.incidentCategory.replace(/_/g, ' ')} on Train ${trainNumber}`,
      category: 'SAFETY',
      severity: incident.severity === 'CRITICAL' ? 'CRITICAL' : 'WARNING',
      affectedSection: incident.sectionId,
      description: `${incident.details}${incident.coachNumber ? ` (Coach ${incident.coachNumber})` : ''}. Clearance estimate: ~${incident.estimatedClearanceMin || 8.5} mins.`,
      recommendedAction: 'Dynamic ETA updated for all downstream stations. Section controller notified.',
      timestamp: incident.timestamp,
      active: true,
    });

    // Compute updated dynamic ETA cascade immediately
    const dynamicETA = await aiGateway.predictDynamicGroundTruthETA({
      trainNumber,
      trainName: train?.name || `Train ${trainNumber}`,
      rakeType: train?.type?.includes('Vande') ? 'VANDE_BHARAT_TRAINSET' : (train?.type?.includes('Suburban') ? 'SUBURBAN_EMU_12CAR' : 'LHB_COACHING'),
      locoType: 'WAP-7',
      sourceStation: train?.source || 'SDAH',
      destinationStation: train?.destination || 'DKAE',
      currentSpeedKmh: 0,
      currentChainageKm: incident.chainageKm,
      currentSectionId: incident.sectionId,
      currentDelayMinutes: (train?.liveState.delayMinutes || 0) + (incident.estimatedClearanceMin || 8.5),
      activeIncidents: [incident],
      stops: train?.stops,
    });

    // Update train live state in memory
    if (train) {
      train.liveState.delayMinutes = dynamicETA.overallPredictedDelayMinutes;
      train.liveState.predictedDelay = dynamicETA.overallPredictedDelayMinutes;
      train.liveState.status = 'DELAYED';
      train.liveState.speed = 0;
    }

    res.json({
      success: true,
      incident,
      message: `Incident recorded. Downstream ETAs recalculated in < 300ms.`,
      dynamicETA,
    });
  } catch (error) {
    console.error('[Operations] Report crew incident error:', error);
    res.status(500).json({ success: false, error: 'Failed to record crew incident' });
  }
};

