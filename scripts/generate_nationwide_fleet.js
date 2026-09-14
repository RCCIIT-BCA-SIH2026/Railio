/**
 * generate_nationwide_fleet.js
 * Generates 5,000+ realistic trains across all 18 Indian Railways operational zones.
 * Output: data/trains/nationwide_fleet.json
 */

const fs = require('fs');
const path = require('path');

const zonesPath = path.resolve(__dirname, '../data/zones/operational_zones.json');
const stationsPath = path.resolve(__dirname, '../data/stations/all_india_stations.json');
const outputPath = path.resolve(__dirname, '../data/trains/nationwide_fleet.json');

const zones = JSON.parse(fs.readFileSync(zonesPath, 'utf8'));
const stations = JSON.parse(fs.readFileSync(stationsPath, 'utf8'));

const stationsByCode = new Map();
stations.forEach(s => stationsByCode.set(s.code, s));

const trainTypes = [
  { type: 'VANDE_BHARAT', namePrefix: 'Vande Bharat Express', speed: 110, priority: 10, coaches: ['E1', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'E2'] },
  { type: 'RAJDHANI', namePrefix: 'Rajdhani Express', speed: 95, priority: 9, coaches: ['H1', 'A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9', 'B10', 'PC', 'EOG'] },
  { type: 'SHATABDI', namePrefix: 'Shatabdi Express', speed: 92, priority: 9, coaches: ['E1', 'E2', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9', 'C10', 'EOG'] },
  { type: 'SUPERFAST', namePrefix: 'Superfast Express', speed: 78, priority: 8, coaches: ['SLR', 'GS', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'B1', 'B2', 'B3', 'A1', 'GS', 'SLR'] },
  { type: 'MAIL_EXPRESS', namePrefix: 'Express', speed: 65, priority: 7, coaches: ['SLR', 'GS', 'S1', 'S2', 'S3', 'S4', 'S5', 'B1', 'B2', 'A1', 'GS', 'SLR'] },
  { type: 'SUBURBAN_EMU', namePrefix: 'Suburban Local', speed: 48, priority: 7, coaches: ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9', 'C10', 'C11', 'C12'] },
  { type: 'FREIGHT_BOXN', namePrefix: 'BOXN Freight Rake', speed: 52, priority: 4, coaches: ['WAG9_LEAD', 'BOXN_01-58', 'BVZC_GUARD'] }
];

// Major route corridors connecting zones
const keyCorridors = [
  // Golden Quadrilateral & Diagonals
  { src: 'NDLS', dst: 'HWH', via: ['CNB', 'PRYJ', 'DDU', 'GAYA', 'DHN', 'ASN', 'BWN'], zone: 'NR', dist: 1450 },
  { src: 'HWH', dst: 'NDLS', via: ['BWN', 'ASN', 'DHN', 'GAYA', 'DDU', 'PRYJ', 'CNB'], zone: 'ER', dist: 1450 },
  { src: 'NDLS', dst: 'MMCT', via: ['MTJ', 'KOTA', 'RTM', 'BRC', 'ST'], zone: 'NR', dist: 1384 },
  { src: 'MMCT', dst: 'NDLS', via: ['ST', 'BRC', 'RTM', 'KOTA', 'MTJ'], zone: 'WR', dist: 1384 },
  { src: 'HWH', dst: 'MAS', via: ['KGP', 'BBS', 'KUR', 'VSKP', 'BZA'], zone: 'SER', dist: 1660 },
  { src: 'MAS', dst: 'HWH', via: ['BZA', 'VSKP', 'KUR', 'BBS', 'KGP'], zone: 'SR', dist: 1660 },
  { src: 'CSMT', dst: 'MAS', via: ['KYN', 'PUNE', 'SUR', 'GTL', 'RU'], zone: 'CR', dist: 1280 },
  { src: 'MAS', dst: 'CSMT', via: ['RU', 'GTL', 'SUR', 'PUNE', 'KYN'], zone: 'SR', dist: 1280 },
  { src: 'NDLS', dst: 'MAS', via: ['AGC', 'GWL', 'VGLJ', 'BPL', 'ET', 'NGP', 'KZJ', 'BZA'], zone: 'NR', dist: 2180 },
  { src: 'MAS', dst: 'NDLS', via: ['BZA', 'KZJ', 'NGP', 'ET', 'BPL', 'VGLJ', 'GWL', 'AGC'], zone: 'SR', dist: 2180 },
  { src: 'HWH', dst: 'CSMT', via: ['KGP', 'TATA', 'CKP', 'ROU', 'JSG', 'BSP', 'R', 'NGP', 'BSL', 'KYN'], zone: 'SER', dist: 1968 },
  { src: 'CSMT', dst: 'HWH', via: ['KYN', 'BSL', 'NGP', 'R', 'BSP', 'JSG', 'ROU', 'CKP', 'TATA', 'KGP'], zone: 'CR', dist: 1968 },
  
  // Regional Hub Corridors
  { src: 'SDAH', dst: 'DKAE', via: ['BNXR', 'DDJ', 'BARN', 'DAKE'], zone: 'ER', dist: 28 },
  { src: 'DKAE', dst: 'SDAH', via: ['DAKE', 'BARN', 'DDJ', 'BNXR'], zone: 'ER', dist: 28 },
  { src: 'SDAH', dst: 'BWN', via: ['DDJ', 'BDC'], zone: 'ER', dist: 102 },
  { src: 'HWH', dst: 'BWN', via: ['DKAE', 'BDC'], zone: 'ER', dist: 95 },
  { src: 'CSMT', dst: 'PUNE', via: ['KYN', 'KJT'], zone: 'CR', dist: 192 },
  { src: 'PUNE', dst: 'CSMT', via: ['KJT', 'KYN'], zone: 'CR', dist: 192 },
  { src: 'MMCT', dst: 'ADI', via: ['ST', 'BRC'], zone: 'WR', dist: 492 },
  { src: 'ADI', dst: 'MMCT', via: ['BRC', 'ST'], zone: 'WR', dist: 492 },
  { src: 'MAS', dst: 'SBC', via: ['KPD', 'JTJ', 'BWT'], zone: 'SR', dist: 358 },
  { src: 'SBC', dst: 'MAS', via: ['BWT', 'JTJ', 'KPD'], zone: 'SWR', dist: 358 },
  { src: 'SBC', dst: 'MYS', via: ['RMGM', 'MYA'], zone: 'SWR', dist: 139 },
  { src: 'SC', dst: 'BZA', via: ['KZJ'], zone: 'SCR', dist: 313 },
  { src: 'BZA', dst: 'SC', via: ['KZJ'], zone: 'SCR', dist: 313 },
  { src: 'PNBE', dst: 'DDU', via: ['BXR'], zone: 'ECR', dist: 214 },
  { src: 'DDU', dst: 'DHN', via: ['GAYA', 'KQR'], zone: 'ECR', dist: 315 },
  { src: 'NDLS', dst: 'LKO', via: ['MB', 'BE'], zone: 'NR', dist: 512 },
  { src: 'LKO', dst: 'BSB', via: ['SLN'], zone: 'NR', dist: 301 },
  { src: 'JP', dst: 'DLI', via: ['AWR', 'RE'], zone: 'NWR', dist: 308 },
  { src: 'GHY', dst: 'NJP', via: ['NBQ', 'APDJ'], zone: 'NFR', dist: 412 },
  { src: 'BBS', dst: 'VSKP', via: ['KUR', 'BAM'], zone: 'ECoR', dist: 443 },
  { src: 'BPL', dst: 'JBP', via: ['ET', 'PPI'], zone: 'WCR', dist: 330 },
  { src: 'GKP', dst: 'LJN', via: ['GD', 'BBK'], zone: 'NER', dist: 270 },
  { src: 'ROHA', dst: 'MAO', via: ['RN', 'KAWR'], zone: 'KR', dist: 480 },
  { src: 'MAO', dst: 'MAJN', via: ['KAWR', 'UD'], zone: 'KR', dist: 320 }
];

console.log('[FleetGenerator] Generating 5,200 realistic trains across all 18 Indian Railways zones...');

const trains = [];
let trainCount = 0;

// Helper: generate stops array
function buildStops(srcCode, dstCode, viaCodes, totalDist, avgSpeed) {
  const routeCodes = [srcCode, ...viaCodes, dstCode];
  const totalLegs = routeCodes.length - 1;
  const legDist = totalDist / totalLegs;
  const legTimeMins = (legDist / avgSpeed) * 60;

  const startHour = Math.floor(Math.random() * 24);
  const startMin = Math.floor(Math.random() * 60);

  let curMinutes = startHour * 60 + startMin;
  const stops = [];

  routeCodes.forEach((code, idx) => {
    const arrH = Math.floor((curMinutes % 1440) / 60).toString().padStart(2, '0');
    const arrM = Math.floor(curMinutes % 60).toString().padStart(2, '0');
    
    // Dwell time: 2 min intermediate, 0 at terminal
    const dwell = idx === 0 || idx === routeCodes.length - 1 ? 0 : (avgSpeed < 55 ? 1 : 3);
    const depMinutes = curMinutes + dwell;
    const depH = Math.floor((depMinutes % 1440) / 60).toString().padStart(2, '0');
    const depM = Math.floor(depMinutes % 60).toString().padStart(2, '0');

    stops.push({
      code,
      sequence: idx + 1,
      arr: idx === 0 ? 'SOURCE' : `${arrH}:${arrM}`,
      dep: idx === routeCodes.length - 1 ? 'DESTN' : `${depH}:${depM}`,
      km: Math.round(idx * legDist),
      platform: ((idx + 1) % 8) + 1
    });

    curMinutes += legTimeMins + dwell;
  });

  return stops;
}

// Helper: generate random live state on route
function generateLiveState(corridor, stops, avgSpeed, zoneCode) {
  const srcStn = stationsByCode.get(corridor.src) || { lat: 22.57, lng: 88.36 };
  const dstStn = stationsByCode.get(corridor.dst) || { lat: 28.61, lng: 77.20 };

  const progress = Math.random(); // 0 to 1 along path
  const lat = Number((srcStn.lat + (dstStn.lat - srcStn.lat) * progress + (Math.random() - 0.5) * 0.05).toFixed(4));
  const lng = Number((srcStn.lng + (dstStn.lng - srcStn.lng) * progress + (Math.random() - 0.5) * 0.05).toFixed(4));

  // Realistic delay distribution (68% on-time, 22% minor delay, 10% moderate/high delay)
  const delayRand = Math.random();
  let delayMinutes = 0;
  if (delayRand > 0.68 && delayRand <= 0.90) {
    delayMinutes = Math.floor(Math.random() * 15) + 3;
  } else if (delayRand > 0.90) {
    delayMinutes = Math.floor(Math.random() * 55) + 16;
  }

  const speed = Math.max(0, Math.min(130, Math.round(avgSpeed * (0.85 + Math.random() * 0.25))));
  const heading = Math.floor(Math.random() * 360);

  const secIdx = Math.min(stops.length - 2, Math.floor(progress * (stops.length - 1)));
  const lastStn = stops[Math.max(0, secIdx)].code;
  const nextStn = stops[Math.min(stops.length - 1, secIdx + 1)].code;
  const currentSection = `${lastStn}-${nextStn}-BLK${Math.floor(Math.random() * 4) + 1}`;

  let status = 'ON_TIME';
  if (delayMinutes > 30) status = 'CRITICAL_DELAY';
  else if (delayMinutes > 5) status = 'DELAYED';

  const delayReasons = [];
  if (delayMinutes > 5) {
    if (zoneCode === 'NR' || zoneCode === 'NCR') {
      delayReasons.push({ factor: 'Dense Fog Visibility Speed Restriction (TSR-60)', impactMin: Math.min(delayMinutes, 18) });
    } else if (zoneCode === 'CR' || zoneCode === 'SWR') {
      delayReasons.push({ factor: 'Ghat Incline Banker Locomotive Coupling & Brake Check', impactMin: Math.min(delayMinutes, 14) });
    } else if (zoneCode === 'ER' || zoneCode === 'SER') {
      delayReasons.push({ factor: 'Junction Precedence Regulation at Interlocking Hub', impactMin: Math.min(delayMinutes, 10) });
    } else if (zoneCode === 'KR' || zoneCode === 'NFR') {
      delayReasons.push({ factor: 'Monsoon Heavy Rainfall Precautionary Speed Order', impactMin: Math.min(delayMinutes, 15) });
    } else {
      delayReasons.push({ factor: 'Section Automatic Block Signal Precedence Hold', impactMin: Math.min(delayMinutes, 8) });
    }
  }

  return {
    lat,
    lng,
    speed,
    heading,
    currentSection,
    lastStation: lastStn,
    nextStation: nextStn,
    delayMinutes,
    predictedDelay: delayMinutes,
    confidence: Number((0.91 + Math.random() * 0.08).toFixed(2)),
    status,
    delayReasons
  };
}

// 1. Generate Flagship & Express Trains (Vande Bharat, Rajdhani, Shatabdi, Superfast, Mail/Express)
keyCorridors.forEach((corr, cIdx) => {
  const typesToGen = [trainTypes[0], trainTypes[1], trainTypes[2], trainTypes[3], trainTypes[4]];
  
  typesToGen.forEach((tType, tIdx) => {
    // Generate 15-30 trips per corridor
    const numTrips = tType.type === 'VANDE_BHARAT' ? 8 : (tType.type === 'RAJDHANI' ? 10 : 25);

    for (let i = 0; i < numTrips; i++) {
      trainCount++;
      const prefix = tType.type === 'VANDE_BHARAT' ? '20' : (tType.type === 'RAJDHANI' ? '12' : (tType.type === 'SHATABDI' ? '12' : '13'));
      const trainNumber = `${prefix}${String(100 + (cIdx * 10) + i).padStart(3, '0')}`;
      const srcName = stationsByCode.get(corr.src)?.name || corr.src;
      const dstName = stationsByCode.get(corr.dst)?.name || corr.dst;
      const name = `${srcName} - ${dstName} ${tType.namePrefix}`;

      const stops = buildStops(corr.src, corr.dst, corr.via, corr.dist, tType.speed);
      const liveState = generateLiveState(corr, stops, tType.speed, corr.zone);

      trains.push({
        trainNumber,
        name,
        type: tType.type,
        zone: corr.zone,
        source: corr.src,
        destination: corr.dst,
        departureTime: stops[0].dep,
        arrivalTime: stops[stops.length - 1].arr,
        totalDistanceKm: corr.dist,
        avgSpeed: tType.speed,
        coaches: tType.coaches,
        liveState,
        stops
      });
    }
  });
});

console.log(`[FleetGenerator] Generated ${trains.length} long-distance express trains.`);

// 2. Generate Suburban Commuter Locals across 6 Mega Zones (ER, WR, CR, SR, SCR, NR)
const suburbanZones = [
  { zone: 'ER', hub: 'SDAH', dests: ['DKAE', 'BWN', 'BDC', 'DDJ'], prefix: '322', dist: 28, speed: 45 },
  { zone: 'ER', hub: 'HWH', dests: ['BWN', 'BDC', 'KGP'], prefix: '372', dist: 35, speed: 46 },
  { zone: 'WR', hub: 'MMCT', dests: ['BDTS', 'ST', 'BRC'], prefix: '900', dist: 40, speed: 50 },
  { zone: 'CR', hub: 'CSMT', dests: ['KYN', 'PUNE', 'BSL'], prefix: '970', dist: 54, speed: 48 },
  { zone: 'SR', hub: 'MAS', dests: ['MS', 'CBE', 'TPJ'], prefix: '400', dist: 32, speed: 45 },
  { zone: 'SCR', hub: 'SC', dests: ['HYB', 'KZJ', 'BZA'], prefix: '471', dist: 25, speed: 42 },
  { zone: 'SWR', hub: 'SBC', dests: ['YPR', 'MYS', 'UBL'], prefix: '665', dist: 38, speed: 48 },
  { zone: 'NR', hub: 'NDLS', dests: ['DLI', 'NZM', 'ANVT', 'UMB'], prefix: '640', dist: 45, speed: 50 }
];

suburbanZones.forEach((sub, sIdx) => {
  sub.dests.forEach((dst, dIdx) => {
    // Generate 45-60 local suburban services per corridor
    const numServices = 50;
    for (let i = 1; i <= numServices; i++) {
      trainCount++;
      const isUp = i % 2 === 1;
      const srcCode = isUp ? sub.hub : dst;
      const dstCode = isUp ? dst : sub.hub;
      const trainNumber = `${sub.prefix}${String((sIdx * 100) + (dIdx * 50) + i).padStart(3, '0')}`;
      const srcName = stationsByCode.get(srcCode)?.name || srcCode;
      const dstName = stationsByCode.get(dstCode)?.name || dstCode;
      const name = `${srcName} - ${dstName} Suburban Local (${isUp ? 'UP' : 'DOWN'})`;

      const stops = buildStops(srcCode, dstCode, [], sub.dist, sub.speed);
      const corr = { src: srcCode, dst: dstCode, dist: sub.dist };
      const liveState = generateLiveState(corr, stops, sub.speed, sub.zone);

      trains.push({
        trainNumber,
        name,
        type: 'SUBURBAN_EMU',
        zone: sub.zone,
        source: srcCode,
        destination: dstCode,
        departureTime: stops[0].dep,
        arrivalTime: stops[stops.length - 1].arr,
        totalDistanceKm: sub.dist,
        avgSpeed: sub.speed,
        coaches: trainTypes[5].coaches,
        liveState,
        stops
      });
    }
  });
});

console.log(`[FleetGenerator] Total fleet count with Suburban Locals: ${trains.length}`);

// 3. Generate Heavy Freight BOXN / Mineral / Container Rakes across Freight Hub Zones (ECR, SECR, SER, WCR, KR, NFR)
const freightHubs = [
  { zone: 'ECR', src: 'DDU', dst: 'DHN', via: ['GAYA', 'KQR'], dist: 315 },
  { zone: 'SECR', src: 'BSP', dst: 'R', via: ['DURG'], dist: 150 },
  { zone: 'SER', src: 'KGP', dst: 'TATA', via: ['CKP', 'ROU'], dist: 280 },
  { zone: 'WCR', src: 'KTE', dst: 'JBP', via: ['STA'], dist: 190 },
  { zone: 'ECoR', src: 'VSKP', dst: 'KUR', via: ['BAM'], dist: 440 },
  { zone: 'NFR', src: 'NJP', dst: 'GHY', via: ['APDJ', 'NBQ'], dist: 412 },
  { zone: 'KR', src: 'ROHA', dst: 'MAJN', via: ['RN', 'KAWR', 'UD'], dist: 740 },
  { zone: 'WR', src: 'ADI', dst: 'RTM', via: ['BRC'], dist: 350 },
  { zone: 'NCR', src: 'CNB', dst: 'DDU', via: ['PRYJ'], dist: 345 }
];

freightHubs.forEach((fr, fIdx) => {
  // Generate 80-120 freight rakes per mineral route
  const numFreight = 100;
  for (let i = 1; i <= numFreight; i++) {
    trainCount++;
    const trainNumber = `0${String(70000 + (fIdx * 1000) + i)}`;
    const srcName = stationsByCode.get(fr.src)?.name || fr.src;
    const dstName = stationsByCode.get(fr.dst)?.name || fr.dst;
    const name = `${srcName} - ${dstName} Heavy Freight BOXN (#${trainNumber})`;

    const stops = buildStops(fr.src, fr.dst, fr.via, fr.dist, 52);
    const corr = { src: fr.src, dst: fr.dst, dist: fr.dist };
    const liveState = generateLiveState(corr, stops, 52, fr.zone);

    trains.push({
      trainNumber,
      name,
      type: 'FREIGHT_BOXN',
      zone: fr.zone,
      source: fr.src,
      destination: fr.dst,
      departureTime: stops[0].dep,
      arrivalTime: stops[stops.length - 1].arr,
      totalDistanceKm: fr.dist,
      avgSpeed: 52,
      coaches: trainTypes[6].coaches,
      liveState,
      stops
    });
  }
});

console.log(`[FleetGenerator] Final nationwide train dataset generated: ${trains.length} trains.`);

// Ensure data/trains directory exists
const outDir = path.dirname(outputPath);
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

fs.writeFileSync(outputPath, JSON.stringify(trains, null, 2), 'utf8');
console.log(`[FleetGenerator] Saved master dataset to: ${outputPath} (${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB)`);
