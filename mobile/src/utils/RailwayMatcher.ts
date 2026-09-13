export interface Coordinate {
  latitude: number;
  longitude: number;
}

export const CORRIDOR_STATIONS = [
  { code: 'SDAH', name: 'Sealdah', km: 0, lat: 22.5675, lng: 88.3712 },
  { code: 'BNXR', name: 'Bidhan Nagar Rd', km: 4, lat: 22.5898, lng: 88.3892 },
  { code: 'DDJ', name: 'Dum Dum Jn', km: 7, lat: 22.6219, lng: 88.3931 },
  { code: 'BLH', name: 'Belgharia', km: 11, lat: 22.6568, lng: 88.3860 },
  { code: 'AGP', name: 'Agarpara', km: 14, lat: 22.6782, lng: 88.3842 },
  { code: 'SEP', name: 'Sodepur', km: 16, lat: 22.6983, lng: 88.3881 },
  { code: 'KDH', name: 'Khardaha', km: 19, lat: 22.7214, lng: 88.3845 },
  { code: 'TGH', name: 'Titagarh', km: 21, lat: 22.7392, lng: 88.3778 },
  { code: 'BP', name: 'Barrackpore', km: 24, lat: 22.7632, lng: 88.3705 },
  // Branch Line Segments
  { code: 'BARN', name: 'Baranagar Rd', km: 12, lat: 22.6392, lng: 88.3732 },
  { code: 'DAKE', name: 'Dakshineswar', km: 15, lat: 22.6534, lng: 88.3601 },
  { code: 'DKAE', name: 'Dankuni Jn', km: 28, lat: 22.6872, lng: 88.2934 },
];

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

export function haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = toRadians(lon2 - lon1);
  const l1 = toRadians(lat1);
  const l2 = toRadians(lat2);
  
  const y = Math.sin(dLon) * Math.cos(l2);
  const x = Math.cos(l1) * Math.sin(l2) - Math.sin(l1) * Math.cos(l2) * Math.cos(dLon);
  const brng = Math.atan2(y, x);
  return (toDegrees(brng) + 360) % 360;
}

export function getBearingDifference(b1: number, b2: number): number {
  return Math.abs(((b1 - b2 + 540) % 360) - 180);
}

// Distance from point to line segment with latitude cosine projection scaling
export function distanceToSegmentMeters(
  p: Coordinate,
  a: Coordinate,
  b: Coordinate
): { distanceMeters: number; segmentBearing: number } {
  const avgLatRad = toRadians((a.latitude + b.latitude) / 2);
  const cosLat = Math.cos(avgLatRad);

  const x0 = p.longitude * cosLat; const y0 = p.latitude;
  const x1 = a.longitude * cosLat; const y1 = a.latitude;
  const x2 = b.longitude * cosLat; const y2 = b.latitude;

  const dx = x2 - x1;
  const dy = y2 - y1;
  
  const segmentBearing = calculateBearing(a.latitude, a.longitude, b.latitude, b.longitude);

  if (dx === 0 && dy === 0) {
    return {
      distanceMeters: haversineDistanceMeters(p.latitude, p.longitude, a.latitude, a.longitude),
      segmentBearing
    };
  }

  let t = ((x0 - x1) * dx + (y0 - y1) * dy) / (dx * dx + dy * dy);
  t = Math.max(0, Math.min(1, t));

  const projLng = a.longitude + t * (b.longitude - a.longitude);
  const projLat = a.latitude + t * (b.latitude - a.latitude);

  return {
    distanceMeters: haversineDistanceMeters(p.latitude, p.longitude, projLat, projLng),
    segmentBearing
  };
}

export function matchToRailwayCorridor(
  location: Coordinate
): { distanceMeters: number; expectedBearing: number; matchedSegmentIndex: number } | null {
  if (CORRIDOR_STATIONS.length < 2) return null;

  let bestMatch = null;
  let minDistance = Infinity;

  // Check all station-to-station track segments
  for (let i = 0; i < CORRIDOR_STATIONS.length - 1; i++) {
    const s1 = CORRIDOR_STATIONS[i];
    const s2 = CORRIDOR_STATIONS[i + 1];
    
    const { distanceMeters, segmentBearing } = distanceToSegmentMeters(
      location,
      { latitude: s1.lat, longitude: s1.lng },
      { latitude: s2.lat, longitude: s2.lng }
    );

    if (distanceMeters < minDistance) {
      minDistance = distanceMeters;
      bestMatch = { distanceMeters, expectedBearing: segmentBearing, matchedSegmentIndex: i };
    }
  }

  // Also check direct station proximity for accurate track station stops
  for (let i = 0; i < CORRIDOR_STATIONS.length; i++) {
    const s = CORRIDOR_STATIONS[i];
    const distToStation = haversineDistanceMeters(location.latitude, location.longitude, s.lat, s.lng);
    if (distToStation < minDistance) {
      minDistance = distToStation;
      bestMatch = { distanceMeters: distToStation, expectedBearing: 0, matchedSegmentIndex: i };
    }
  }

  return bestMatch;
}
