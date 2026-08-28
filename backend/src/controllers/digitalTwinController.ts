import { Request, Response } from 'express';
import { aiGateway } from '../services/aiServiceGateway';

export const simulateWhatIfScenario = async (req: Request, res: Response): Promise<void> => {
  try {
    const { scenario, trainNumber } = req.body;

    const result = await aiGateway.runWhatIfSimulation(
      scenario || 'VANDE_BHARAT_PRIORITY',
      trainNumber || '22436'
    );

    res.json({
      success: true,
      simulation: result,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Digital Twin simulation failed' });
  }
};
