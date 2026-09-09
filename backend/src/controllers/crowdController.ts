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
    const trainNumber = tNum || '32216';
    const coachInfo = db.crowdData.coachCrowd?.[trainNumber] || {
      coaches: [
        { coach: 'C1', density: 38, status: 'GREEN' },
        { coach: 'C2', density: 45, status: 'YELLOW' },
        { coach: 'C3', density: 28, status: 'GREEN' },
        { coach: 'C4', density: 58, status: 'YELLOW' },
        { coach: 'C5', density: 78, status: 'ORANGE' },
        { coach: 'C6', density: 85, status: 'RED' },
        { coach: 'C7', density: 72, status: 'ORANGE' },
        { coach: 'C8', density: 40, status: 'GREEN' },
        { coach: 'C9', density: 32, status: 'GREEN' },
        { coach: 'C10', density: 35, status: 'GREEN' },
        { coach: 'C11', density: 42, status: 'YELLOW' },
        { coach: 'C12', density: 30, status: 'GREEN' },
      ],
      recommendedCoach: 'C3',
      reason: 'Lowest estimated crowd density (28% occupancy).',
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
