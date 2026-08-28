import { Request, Response } from 'express';
import { db } from '../models/dataStore';

export const getTrackRisk = async (req: Request, res: Response): Promise<void> => {
  try {
    res.json({
      success: true,
      sections: db.trackSections,
      progressiveRiskHistory: db.progressiveRiskHistory,
      summary: {
        activeAnomalies: db.trackSections.filter((s) => s.riskLevel !== 'NORMAL').length,
        highestRiskSection: 'HWH-B17',
        maintenanceActionRequired: true,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve track risk data' });
  }
};

export const ingestSensorTelemetry = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sectionId, trainNumber, accel, gyro, vibrationRms } = req.body;

    const rms = Number(vibrationRms) || 1.4;
    const isAnomaly = rms > 2.8;
    const severity = rms > 3.2 ? 'HIGH_RISK' : rms > 2.5 ? 'WARNING' : 'NORMAL';

    // Update the corresponding track section state
    const section = db.trackSections.find((s) => s.id === sectionId);
    if (section) {
      section.vibrationRms = rms;
      section.riskLevel = severity;
      section.healthScore = Math.max(20, Math.round(100 - (rms * 12)));
    }

    res.status(201).json({
      success: true,
      anomalyDetected: isAnomaly,
      severity,
      sectionId: sectionId || 'HWH-B17',
      confidence: 0.89,
      processedAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to ingest sensor telemetry' });
  }
};
