import { Request, Response } from 'express';
import { db } from '../models/dataStore';
import { simulationEngine } from '../services/simulationEngine';

export const getTrackRisk = async (req: Request, res: Response): Promise<void> => {
  try {
    res.json({
      success: true,
      sections: db.trackSections,
      progressiveRiskHistory: db.progressiveRiskHistory,
      realHardwareHistory: db.realHardwareTelemetryBuffer,
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

export const getRealTelemetryHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    res.json({
      success: true,
      count: db.realHardwareTelemetryBuffer.length,
      history: db.realHardwareTelemetryBuffer,
      lastSample: db.realHardwareTelemetryBuffer[db.realHardwareTelemetryBuffer.length - 1] || null,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get telemetry history' });
  }
};

export const ingestSensorTelemetry = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      sectionId,
      trainNumber,
      accel,
      gyro,
      vibrationRms,
      accelX,
      accelY,
      accelZ,
      gyroX,
      gyroY,
      gyroZ,
    } = req.body;

    const ax = Number(accel?.x ?? accelX ?? 0);
    const ay = Number(accel?.y ?? accelY ?? 0);
    const az = Number(accel?.z ?? accelZ ?? 1.0);
    const gx = Number(gyro?.x ?? gyroX ?? 0);
    const gy = Number(gyro?.y ?? gyroY ?? 0);
    const gz = Number(gyro?.z ?? gyroZ ?? 0);

    const calculatedRms = Math.sqrt(ax * ax + ay * ay + az * az);
    const rms = Number(vibrationRms) || Number(calculatedRms.toFixed(2)) || 1.0;
    const isAnomaly = rms > 2.4;
    const severity = rms > 3.2 ? 'HIGH_RISK' : rms > 2.4 ? 'WARNING' : 'NORMAL';

    const secId = sectionId || 'HWH-B17';

    // Update the corresponding track section state in database
    const section = db.trackSections.find((s) => s.id === secId);
    if (section) {
      section.vibrationRms = Number(rms.toFixed(2));
      section.riskLevel = severity;
      section.healthScore = Math.max(10, Math.round(100 - (rms * 12)));
      section.deteriorationTrend = isAnomaly ? 'INCREASING' : 'STABLE';
      section.maintenancePriority = severity === 'HIGH_RISK' ? 'IMMEDIATE' : severity === 'WARNING' ? 'HIGH' : 'LOW';
    }

    // Real physical hardware payload
    const telemetryPayload = {
      timestamp: new Date().toISOString(),
      sectionId: secId,
      trainNumber: trainNumber || '12301',
      accel: { x: ax, y: ay, z: az },
      gyro: { x: gx, y: gy, z: gz },
      vibrationRms: Number(rms.toFixed(2)),
      isAnomaly,
      severity,
      confidence: 0.95,
      source: 'ESP32_PHYSICAL_HARDWARE',
    };

    // Append to real telemetry buffer (keep last 50 data points)
    db.realHardwareTelemetryBuffer.push(telemetryPayload);
    if (db.realHardwareTelemetryBuffer.length > 50) {
      db.realHardwareTelemetryBuffer.shift();
    }

    // Broadcast physical hardware telemetry instantly to Admin Web & Mobile
    simulationEngine.broadcastSensorTelemetry(telemetryPayload);

    res.status(201).json({
      success: true,
      anomalyDetected: isAnomaly,
      severity,
      sectionId: secId,
      vibrationRms: rms,
      confidence: 0.95,
      processedAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to ingest sensor telemetry' });
  }
};
