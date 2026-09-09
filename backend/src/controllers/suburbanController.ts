import { Request, Response } from 'express';
import { db } from '../models/dataStore';

/**
 * Controller for Kolkata Suburban Local Trains (Dakshineswar ⇄ Sealdah & Connected Networks)
 * Powered by Google Maps-style Mobile Phone Signal Aggregation Telemetry
 */

export const getUpcomingSuburbanTrains = async (req: Request, res: Response): Promise<void> => {
  try {
    const from = (req.query.from as string) || 'DAKE';
    const to = (req.query.to as string) || 'SDAH';
    const time = req.query.time as string | undefined;

    const fromStation = db.getStation(from) || { code: from, name: `${from} Station` };
    const toStation = db.getStation(to) || { code: to, name: `${to} Station` };

    const upcomingTrains = db.getUpcomingSuburbanTrains(from, to, time);

    res.json({
      success: true,
      corridor: {
        from: fromStation,
        to: toStation,
        distanceKm: 18,
        averageTravelMinutes: 28,
        sectionName: 'Sealdah - Dankuni Chord Suburban Section (ER)',
      },
      queriedAt: new Date().toISOString(),
      currentTimeBasis: time || new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
      telemetryProvider: 'Google Maps Anonymized Cellular Signal Density & BLE Mesh Aggregation',
      count: upcomingTrains.length,
      trains: upcomingTrains,
    });
  } catch (error) {
    console.error('[suburbanController] Error getting upcoming trains:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve upcoming suburban trains' });
  }
};

export const getCoachCrowdTelemetry = async (req: Request, res: Response): Promise<void> => {
  try {
    const tNum = Array.isArray(req.params.trainNumber) ? req.params.trainNumber[0] : req.params.trainNumber;
    const trainNumber = tNum || '32216';

    const telemetry = db.getCoachSignalTelemetry(trainNumber);

    res.json({
      success: true,
      trainNumber,
      telemetry,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[suburbanController] Error getting coach telemetry:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve coach crowd telemetry' });
  }
};

export const getSuburbanCorridors = async (_req: Request, res: Response): Promise<void> => {
  try {
    const corridors = [
      {
        id: 'DKAE-SDAH',
        name: 'Dankuni ⇄ Sealdah Chord Local',
        from: 'DKAE',
        to: 'SDAH',
        frequencyMin: 20,
        dailyTrains: 40,
        isPopular: true,
        stations: ['DKAE', 'DAKE', 'BARN', 'DDJ', 'BNXR', 'SDAH'],
      },
      {
        id: 'DAKE-SDAH',
        name: 'Dakshineswar ⇄ Sealdah Local',
        from: 'DAKE',
        to: 'SDAH',
        frequencyMin: 20,
        dailyTrains: 40,
        isPopular: true,
        stations: ['DKAE', 'DAKE', 'BARN', 'DDJ', 'BNXR', 'SDAH'],
      },
      {
        id: 'DDJ-SDAH',
        name: 'Dum Dum Jn ⇄ Sealdah Local',
        from: 'DDJ',
        to: 'SDAH',
        frequencyMin: 20,
        dailyTrains: 40,
        isPopular: true,
        stations: ['DDJ', 'BNXR', 'SDAH'],
      },
      {
        id: 'BARN-SDAH',
        name: 'Baranagar Road ⇄ Sealdah',
        from: 'BARN',
        to: 'SDAH',
        frequencyMin: 20,
        dailyTrains: 40,
        isPopular: false,
        stations: ['BARN', 'DDJ', 'BNXR', 'SDAH'],
      },
    ];

    res.json({
      success: true,
      corridors,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve suburban corridors' });
  }
};
