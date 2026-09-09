import { Request, Response } from 'express';
import axios from 'axios';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

export const getGnnCascade = async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${AI_SERVICE_URL}/future/gnn-cascade`);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching GNN cascade data:', error);
    res.status(500).json({ error: 'Failed to fetch GNN cascade prediction' });
  }
};

export const getFederatedLearning = async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${AI_SERVICE_URL}/future/federated-learning`);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching Federated Learning data:', error);
    res.status(500).json({ error: 'Failed to fetch Federated Learning data' });
  }
};

export const getLogisticsOrchestration = async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${AI_SERVICE_URL}/future/logistics`);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching Logistics data:', error);
    res.status(500).json({ error: 'Failed to fetch Logistics orchestration data' });
  }
};
