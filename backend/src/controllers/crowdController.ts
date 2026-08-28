import { Request, Response } from 'express';
import { db } from '../models/dataStore';

export const getStationCrowd = async (req: Request, res: Response): Promise<void> => {
  try {
    const stationId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const stationCode = (stationId || '').toUpperCase();
    const stationCrowd = db.crowdData.stations?.[stationCode] || {
      platform1: 65,
      platform2: 42,
      platform3: 28,
      overall: 45,
    };

    res.json({
      success: true,
      stationCode,
      crowd: stationCrowd,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve station crowd' });
  }
};

export const getTrainCoachCrowd = async (req: Request, res: Response): Promise<void> => {
  try {
    const tNum = Array.isArray(req.params.trainNumber) ? req.params.trainNumber[0] : req.params.trainNumber;
    const trainNumber = tNum || '12301';
    const coachInfo = db.crowdData.coachCrowd?.[trainNumber] || {
      coaches: [
        { coach: 'A1', density: 82, status: 'RED' },
        { coach: 'A2', density: 46, status: 'YELLOW' },
        { coach: 'A3', density: 29, status: 'GREEN' },
        { coach: 'A4', density: 91, status: 'RED' },
      ],
      recommendedCoach: 'A3',
      reason: 'Lowest estimated crowd density (29% occupancy).',
    };

    res.json({
      success: true,
      trainNumber,
      coachCrowd: coachInfo,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve coach crowd' });
  }
};
