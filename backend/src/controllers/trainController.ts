import { Request, Response } from 'express';
import { db } from '../models/dataStore';
import { aiGateway } from '../services/aiServiceGateway';

export const getTrains = async (req: Request, res: Response): Promise<void> => {
  try {
    const { from, to, date, search } = req.query;

    let result = db.trains;

    if (from && to) {
      result = db.searchTrains(from as string, to as string);
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

    res.json({
      success: true,
      count: result.length,
      trains: result,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve trains' });
  }
};

export const getTrainByNumber = async (req: Request, res: Response): Promise<void> => {
  try {
    const tNum = Array.isArray(req.params.trainNumber) ? req.params.trainNumber[0] : req.params.trainNumber;
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
    const tNum = Array.isArray(req.params.trainNumber) ? req.params.trainNumber[0] : req.params.trainNumber;
    const train = db.getTrain(tNum || '');

    if (!train) {
      res.status(404).json({ success: false, error: 'Train not found' });
      return;
    }

    res.json({
      success: true,
      trainNumber: train.trainNumber,
      name: train.name,
      liveState: train.liveState,
      stops: train.stops,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get live status' });
  }
};

export const getTrainETAPrediction = async (req: Request, res: Response): Promise<void> => {
  try {
    const tNum = Array.isArray(req.params.trainNumber) ? req.params.trainNumber[0] : req.params.trainNumber;
    const train = db.getTrain(tNum || '');

    if (!train) {
      res.status(404).json({ success: false, error: 'Train not found' });
      return;
    }

    const prediction = await aiGateway.predictDelay({
      trainNumber: train.trainNumber,
      currentSpeed: train.liveState.speed,
      distanceRemaining: 340,
      dwellTime: 4,
      weatherCondition: db.weatherReports[train.destination]?.condition || 'Clear',
      junctionCongestionLevel: 0.65,
    });

    res.json({
      success: true,
      trainNumber: train.trainNumber,
      name: train.name,
      scheduledArrival: train.arrivalTime,
      predictedArrival: `${train.arrivalTime} (${prediction.arrivalWindow})`,
      prediction,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'ETA prediction failed' });
  }
};
