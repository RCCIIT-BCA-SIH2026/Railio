import { Request, Response } from 'express';
import { aiGateway } from '../services/aiServiceGateway';

export const handleMaxPlusTimetable = async (req: Request, res: Response): Promise<void> => {
  try {
    const { numTrains, headwayMinutes, dwellMinutes, initialDelays, steps } = req.body;
    const result = await aiGateway.solveMaxPlusTimetable(numTrains, headwayMinutes, dwellMinutes, initialDelays, steps);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const handleSparseDelayDiffusion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { primaryDelays, dampingFactor, hops } = req.body;
    const result = await aiGateway.propagateDelaysSparse(primaryDelays || { NDLS: 25.0, CNB: 15.0 }, dampingFactor, hops);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const handleOccupancyConflictDetection = async (req: Request, res: Response): Promise<void> => {
  try {
    const { trajectories, timeHorizonMinutes } = req.body;
    const result = await aiGateway.detectOccupancyConflicts(trajectories || [], timeHorizonMinutes);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const handleSpatialNearestStations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { trains } = req.body;
    const result = await aiGateway.computeSpatialNearestStations(trains || []);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const handleMatrixTopologyMetrics = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await aiGateway.getMatrixTopologyMetrics();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
