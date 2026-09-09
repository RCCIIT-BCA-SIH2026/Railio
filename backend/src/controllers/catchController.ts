import { Request, Response } from 'express';
import { db } from '../models/dataStore';
import { aiGateway } from '../services/aiServiceGateway';

export const calculateCatchProbability = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      trainNumber,
      userLat,
      userLng,
      userLocationName,
      roadDistanceKm,
      trafficCondition,
      stationEntryBufferMin,
      scheduledDepartureTime,
    } = req.body;

    const train = db.getTrain(trainNumber || '32216');
    if (!train) {
      res.status(404).json({ success: false, error: 'Train not found' });
      return;
    }

    const result = await aiGateway.calculateCatchProbability(
      {
        trainNumber: train.trainNumber,
        userLat,
        userLng,
        userLocationName: userLocationName || 'Bidhan Nagar Hub',
        roadDistanceKm: Number(roadDistanceKm) || 5,
        trafficCondition: trafficCondition || 'MODERATE',
        stationEntryBufferMin: Number(stationEntryBufferMin) || 7,
        scheduledDepartureTime: scheduledDepartureTime || train.departureTime,
      },
      train
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to calculate catch probability' });
  }
};
