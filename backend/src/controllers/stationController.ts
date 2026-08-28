import { Request, Response } from 'express';
import { db } from '../models/dataStore';

export const getStations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search } = req.query;
    let list = db.stations;

    if (search) {
      const q = (search as string).toLowerCase();
      list = list.filter(
        (s) => s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.city.toLowerCase().includes(q)
      );
    }

    res.json({ success: true, count: list.length, stations: list });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve stations' });
  }
};

export const getStationArrivals = async (req: Request, res: Response): Promise<void> => {
  try {
    const stId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const stationCode = (stId || '').toUpperCase();
    const station = db.getStation(stationCode);

    if (!station) {
      res.status(404).json({ success: false, error: 'Station not found' });
      return;
    }

    // Find trains stopping at this station
    const arrivals = db.trains
      .filter((t) => t.stops.some((s) => s.code.toUpperCase() === stationCode))
      .map((t) => {
        const stop = t.stops.find((s) => s.code.toUpperCase() === stationCode)!;
        const delayMin = t.liveState.delayMinutes;
        return {
          trainNumber: t.trainNumber,
          trainName: t.name,
          type: t.type,
          scheduledArrival: stop.arr,
          scheduledDeparture: stop.dep,
          predictedArrival: delayMin > 0 ? `${stop.arr} (+${delayMin}m)` : stop.arr,
          delayMinutes: delayMin,
          status: delayMin === 0 ? 'On Time' : `+${delayMin} min`,
          platform: stop.platform,
          confidence: t.liveState.confidence,
          currentLocation: `${t.liveState.currentSection} (speed ${t.liveState.speed} km/h)`,
          delayReason: t.liveState.delayReasons.length > 0 ? t.liveState.delayReasons[0].factor : 'Running smoothly',
        };
      });

    res.json({
      success: true,
      station: {
        code: station.code,
        name: station.name,
        city: station.city,
        platforms: station.platforms,
      },
      arrivals,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve station arrivals' });
  }
};
