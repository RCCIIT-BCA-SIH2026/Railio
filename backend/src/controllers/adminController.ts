import { Request, Response } from 'express';
import { db } from '../models/dataStore';

export const getDashboardOverview = async (req: Request, res: Response): Promise<void> => {
  try {
    const activeTrains = db.trains.length;
    const delayedTrains = db.trains.filter((t) => t.liveState.delayMinutes > 5).length;
    const criticalIncidents = db.alerts.filter((a) => a.severity === 'HIGH_RISK' || a.severity === 'CRITICAL').length;
    const highCrowdStations = Object.values(db.crowdData.stations || {}).filter((s: any) => s.overall > 70).length;
    const trackRisks = db.trackSections.filter((s) => s.riskLevel !== 'NORMAL').length;
    const weatherAlerts = db.alerts.filter((a) => a.category === 'WEATHER').length;

    res.json({
      success: true,
      metrics: {
        activeTrains: 142, // Scaled for Indian Railways operational dashboard visual
        delayedTrains: 27,
        criticalIncidents: 3,
        highCrowdStations: 4,
        trackRisks: 6,
        weatherAlerts: 12,
        networkPunctualityPct: 88.4,
        avgNetworkSpeedKmh: 82.5,
      },
      liveTrainFeeds: db.trains.slice(0, 8).map((t) => ({
        trainNumber: t.trainNumber,
        name: t.name,
        type: t.type,
        currentSection: t.liveState.currentSection,
        speed: t.liveState.speed,
        delayMinutes: t.liveState.delayMinutes,
        status: t.liveState.status,
      })),
      recentAlerts: db.alerts,
      trackSections: db.trackSections,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve dashboard overview' });
  }
};

export const getAlerts = async (req: Request, res: Response): Promise<void> => {
  try {
    res.json({
      success: true,
      count: db.alerts.length,
      alerts: db.alerts,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve alerts' });
  }
};

export const createAlert = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, category, severity, description, affectedTrain, affectedStation, affectedSection, recommendedAction } = req.body;

    const newAlert = {
      id: `ALT-${Date.now()}`,
      title,
      category: category || 'CONGESTION',
      severity: severity || 'WARNING',
      affectedTrain,
      affectedStation,
      affectedSection,
      description,
      recommendedAction,
      timestamp: 'Just now',
      active: true,
    };

    db.alerts.unshift(newAlert);

    res.status(201).json({ success: true, alert: newAlert });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create alert' });
  }
};

export const getWeatherIntelligence = async (req: Request, res: Response): Promise<void> => {
  try {
    res.json({
      success: true,
      weather: db.weatherReports,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve weather reports' });
  }
};
