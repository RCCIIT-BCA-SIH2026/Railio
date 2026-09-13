import path from 'path';
import fs from 'fs';

export interface OperationalZone {
  code: string;
  name: string;
  hq: string;
  state: string;
  divisions: string[];
  color: string;
  routeKm: number;
  maxSpeedKmh: number;
  terrain: string;
  weatherSensitivities: {
    winterFog: number;
    summerHeat: number;
    monsoonFlood: number;
    cyclone: number;
  };
  gradientDragFactor: number;
  defaultFogSpeedCapKmh: number;
  primaryCorridors: string[];
  keyJunctions: string[];
}

export class ZoneRegistry {
  private zones: Map<string, OperationalZone> = new Map();
  private divisionToZone: Map<string, string> = new Map();

  constructor() {
    this.loadZones();
  }

  private loadZones() {
    try {
      const p = path.resolve(__dirname, '../../../data/zones/operational_zones.json');
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf8');
        const list: OperationalZone[] = JSON.parse(raw);
        list.forEach((z) => {
          this.zones.set(z.code.toUpperCase(), z);
          z.divisions.forEach((div) => {
            this.divisionToZone.set(div.toLowerCase(), z.code.toUpperCase());
          });
        });
        console.log(`[ZoneRegistry] Initialized with ${this.zones.size} Indian Railways Operational Zones.`);
      }
    } catch (err) {
      console.error('[ZoneRegistry] Failed to load zones:', err);
    }
  }

  public getAllZones(): OperationalZone[] {
    return Array.from(this.zones.values());
  }

  public getZone(code: string): OperationalZone | undefined {
    return this.zones.get(code.toUpperCase());
  }

  public getZoneForDivision(divisionName: string): OperationalZone | undefined {
    const code = this.divisionToZone.get(divisionName.toLowerCase());
    return code ? this.zones.get(code) : undefined;
  }

  public calculateZoneResistanceMultiplier(zoneCode: string, weatherCondition?: string): number {
    const zone = this.getZone(zoneCode);
    if (!zone) return 1.0;

    let multiplier = zone.gradientDragFactor;
    const cond = (weatherCondition || '').toLowerCase();

    if (cond.includes('fog') || cond.includes('mist')) {
      multiplier += zone.weatherSensitivities.winterFog * 0.35;
    } else if (cond.includes('rain') || cond.includes('flood') || cond.includes('monsoon')) {
      multiplier += zone.weatherSensitivities.monsoonFlood * 0.25;
    } else if (cond.includes('storm') || cond.includes('cyclone')) {
      multiplier += zone.weatherSensitivities.cyclone * 0.45;
    } else if (cond.includes('heat') || cond.includes('hot')) {
      multiplier += zone.weatherSensitivities.summerHeat * 0.15;
    }

    return Number(multiplier.toFixed(3));
  }
}

export const zoneRegistry = new ZoneRegistry();
