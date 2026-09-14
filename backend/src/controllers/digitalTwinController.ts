import { Request, Response } from 'express';
import { aiGateway } from '../services/aiServiceGateway';

export const simulateWhatIfScenario = async (req: Request, res: Response): Promise<void> => {
  try {
    const { scenario, trainNumber, zone, sectionId, delayMinutes } = req.body;

    const result = await aiGateway.runWhatIfSimulation(
      scenario || 'PEAK_EMU_PRECEDENCE',
      trainNumber || '32216',
      zone || 'ALL',
      sectionId,
      typeof delayMinutes === 'number' ? delayMinutes : 0
    );

    res.json({
      success: true,
      simulation: result,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Digital Twin simulation failed' });
  }
};
