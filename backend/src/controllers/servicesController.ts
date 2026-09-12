import { Request, Response } from 'express';
import axios from 'axios';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

export const configureSmartAlarm = async (req: Request, res: Response) => {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/services/smart-alarm`, req.body);
    res.json(response.data);
  } catch (error) {
    console.error('Error configuring smart alarm:', error);
    res.status(500).json({ error: 'Failed to configure smart alarm' });
  }
};

export const optimizeFoodDelivery = async (req: Request, res: Response) => {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/services/food-delivery`, req.body);
    res.json(response.data);
  } catch (error) {
    console.error('Error optimizing food delivery:', error);
    res.status(500).json({ error: 'Failed to optimize food delivery' });
  }
};
