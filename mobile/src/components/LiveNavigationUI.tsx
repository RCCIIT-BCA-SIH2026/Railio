import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
  PanResponder,
  TextInput,
  Keyboard,
  Alert,
  Modal,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useLiveNavigation } from '../services/navigation/useLiveNavigation';
import {
  Footprints,
  Train,
  MapPin,
  Navigation,
  Clock,
  Gauge,
  Maximize2,
  Minimize2,
  X,
  Radio,
  CheckCircle2,
  AlertTriangle,
  Search,
  Compass,
  Zap,
  ChevronRight,
  RotateCcw,
} from 'lucide-react-native';
import { liveNavigationService, isValidCoordinate } from '../services/navigation/LiveNavigationService';
import { CORRIDOR_STATIONS, haversineDistanceMeters } from '../utils/RailwayMatcher';
import { ALL_INDIAN_STATIONS } from '../data/stationsData';

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

const QUICK_PRESET_STATIONS = [
  { code: 'SDAH', name: 'Sealdah', lat: 22.5675, lng: 88.3712, aliases: ['sealdah', 'sdah', 'kolkata'] },
  { code: 'HWH', name: 'Howrah', lat: 22.5839, lng: 88.3433, aliases: ['howrah', 'hwh'] },
  { code: 'SEP', name: 'Sodepur', lat: 22.6983, lng: 88.3881, aliases: ['sodepur', 'sodhpur', 'sodpur', 'sep'] },
  { code: 'BP', name: 'Barrackpore', lat: 22.7631, lng: 88.3719, aliases: ['barrackpore', 'barackpore', 'bp'] },
  { code: 'BLH', name: 'Belgharia', lat: 22.6517, lng: 88.3844, aliases: ['belgharia', 'blh'] },
  { code: 'AGP', name: 'Agarpara', lat: 22.6781, lng: 88.3811, aliases: ['agarpara', 'agp'] },
  { code: 'KDH', name: 'Khardah', lat: 22.7231, lng: 88.3811, aliases: ['khardah', 'kdh'] },
  { code: 'TGH', name: 'Titagarh', lat: 22.7411, lng: 88.3756, aliases: ['titagarh', 'tgh'] },
  { code: 'NH', name: 'Naihati', lat: 22.8951, lng: 88.3972, aliases: ['naihati', 'nh'] },
  { code: 'BT', name: 'Barasat', lat: 22.7208, lng: 88.4828, aliases: ['barasat', 'bt'] },
  { code: 'RHA', name: 'Ranaghat', lat: 23.1764, lng: 88.5638, aliases: ['ranaghat', 'rha'] },
  { code: 'BDC', name: 'Bandel', lat: 22.9255, lng: 88.3789, aliases: ['bandel', 'bdc'] },
  { code: 'DAKE', name: 'Dakshineswar', lat: 22.6534, lng: 88.3601, aliases: ['dakshineswar', 'dake'] },
  { code: 'DKAE', name: 'Dankuni', lat: 22.6872, lng: 88.2934, aliases: ['dankuni', 'dkae'] },
  { code: 'DDJ', name: 'Dum Dum', lat: 22.6219, lng: 88.3931, aliases: ['dum dum', 'ddj'] },
  { code: 'BNXR', name: 'Bidhan Nagar', lat: 22.5898, lng: 88.3892, aliases: ['bidhan nagar', 'ultadanga', 'bnxr'] },
  { code: 'SATPUR', name: 'Satpur', lat: 20.0076, lng: 73.7431, aliases: ['satpur', 'nashik'] },
  { code: 'KOAA', name: 'Kolkata Chitpur', lat: 22.6025, lng: 88.3781, aliases: ['kolkata chitpur', 'koaa'] },
  { code: 'KGP', name: 'Kharagpur', lat: 22.3385, lng: 87.3262, aliases: ['kharagpur', 'kgp'] },
  { code: 'BWN', name: 'Barddhaman', lat: 23.2378, lng: 87.8631, aliases: ['barddhaman', 'burdwan', 'bwn'] },
  { code: 'ASN', name: 'Asansol', lat: 23.6841, lng: 86.9654, aliases: ['asansol', 'asn'] },
  { code: 'DGR', name: 'Durgapur', lat: 23.4988, lng: 87.3111, aliases: ['durgapur', 'dgr'] },
  { code: 'NJP', name: 'New Jalpaiguri', lat: 26.6851, lng: 88.4411, aliases: ['new jalpaiguri', 'njp', 'siliguri'] },
];

async function resolveLocationQuery(target: string): Promise<{ lat: number; lng: number; name: string } | null> {
  const query = target.toLowerCase().trim();
  if (!query) return null;

  // 1. Check coordinates input "lat, lng"
  if (query.includes(',')) {
    const parts = query.split(',');
    const parsedLat = parseFloat(parts[0]);
    const parsedLng = parseFloat(parts[1]);
    if (isValidCoordinate(parsedLat, parsedLng)) {
      return { lat: parsedLat, lng: parsedLng, name: `Location (${parsedLat.toFixed(2)}, ${parsedLng.toFixed(2)})` };
    }
  }

  // 2. Check QUICK_PRESET_STATIONS
  const presetMatch = QUICK_PRESET_STATIONS.find(
    s => s.code.toLowerCase() === query ||
         s.name.toLowerCase() === query ||
         s.name.toLowerCase().includes(query) ||
         (s.aliases && s.aliases.some(a => a.toLowerCase().includes(query) || query.includes(a.toLowerCase())))
  );
  if (presetMatch) {
    return { lat: presetMatch.lat, lng: presetMatch.lng, name: presetMatch.name };
  }

  // 3. Check CORRIDOR_STATIONS
  const corridorMatch = CORRIDOR_STATIONS.find(
    s => s.code.toLowerCase() === query || s.name.toLowerCase().includes(query)
  );
  if (corridorMatch) {
    return { lat: corridorMatch.lat, lng: corridorMatch.lng, name: corridorMatch.name };
  }

  // 4. Check ALL_INDIAN_STATIONS
  const indianMatch = ALL_INDIAN_STATIONS.find(
    s => s.code.toLowerCase() === query ||
         s.name.toLowerCase() === query ||
         s.name.toLowerCase().includes(query) ||
         (s.aliases && s.aliases.some(a => a.toLowerCase().includes(query) || query.includes(a.toLowerCase())))
  );
  if (indianMatch) {
    // If coordinates are available in dataset or geocoding
    try {
      const osmUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(indianMatch.name + ' railway station West Bengal India')}&format=json&limit=1`;
      const res = await fetch(osmUrl, { headers: { 'User-Agent': 'RailIo-Mobile-App/1.0' } });
      const data = await res.json();
      if (data && data.length > 0 && isValidCoordinate(parseFloat(data[0].lat), parseFloat(data[0].lon))) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), name: indianMatch.name };
      }
    } catch (e) {}
  }

  // 5. OpenStreetMap Nominatim Geocoding API (Station Specific Query)
  try {
    const osmUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(target + ' railway station West Bengal India')}&format=json&limit=1`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(osmUrl, {
      headers: { 'User-Agent': 'RailIo-Mobile-App/1.0' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const data = await res.json();
    if (data && data.length > 0) {
      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);
      if (isValidCoordinate(lat, lng)) {
        const rawName = data[0].display_name ? data[0].display_name.split(',')[0] : target;
        return { lat, lng, name: rawName };
      }
    }
  } catch (e) {
    console.warn('[GEOCODE][OSM_STATION_FALLBACK_ERROR]', e);
  }

  // 6. OpenStreetMap Nominatim Geocoding API (General Query)
  try {
    const osmUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(target + ' India')}&format=json&limit=1`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(osmUrl, {
      headers: { 'User-Agent': 'RailIo-Mobile-App/1.0' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const data = await res.json();
    if (data && data.length > 0) {
      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);
      if (isValidCoordinate(lat, lng)) {
        const rawName = data[0].display_name ? data[0].display_name.split(',')[0] : target;
        return { lat, lng, name: rawName };
      }
    }
  } catch (e) {
    console.warn('[GEOCODE][OSM_GENERAL_FALLBACK_ERROR]', e);
  }

  // 7. LocationIQ Geocoding API Fallback
  try {
    const apiKey = process.env.EXPO_PUBLIC_LOCATIONIQ_API_KEY || process.env.EXPO_PUBLIC_LOCATION_API_KEY || 'v1.public.eyJqdGkiOiI1YjRkMWY5MS1mMmJhLTQ2OTItYjc2Mi05NzM1YzYwOWEwYWMifU780Iatp-HORgFBBNiXgFcca0haVNCCH7RbMHCQZDXdya-PCHU405RvrFl5DitMqnxHwY7JfKNWyg0S2ZhpBj7nBvjCgVgngT6Emmhhn2BCwaaxCufiGGDUP7xbDp_tsxPT37qX_EF4F2XtzSd58WQjNmG0FMaclGgJjqj_BPlwynl-tZMCW2tvjO0sadXaG0aF7PPaNjETa1Wj6aXMayZhX_TJJDJeU8RTr52s-XgPuaXg9-FjvlfC3P4tiKnQlu3xGYTaCynIDDecSW1cOFe4UlVgQjtUb7bLT53NOpGAXgZJa8URHZ5pfDEkrXAEYjMkF7Oh-iJXLdjAyGBFneo.N2IyNTQ2ODQtOWE1YS00MmI2LTkyOTItMGJlNGMxODU1Mzc2';
    const res = await fetch(
      `https://us1.locationiq.com/v1/search?key=${apiKey}&q=${encodeURIComponent(target + ' railway station India')}&format=json&limit=1`
    );
    const data = await res.json();
    if (data && data.length > 0) {
      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);
      if (isValidCoordinate(lat, lng)) {
        return { lat, lng, name: data[0].display_name ? data[0].display_name.split(',')[0] : target };
      }
    }
  } catch (err) {
    console.warn('[GEOCODE][LOCATIONIQ_ERROR]', err);
  }

  // 8. OpenWeather Geocoding API Fallback
  try {
    const apiKey = process.env.EXPO_PUBLIC_OPENWEATHER_LOCATION_API_KEY || 'b0bc8cf841bc3898c8b28a3dc2cda03d';
    const res = await fetch(
      `http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(target)}&limit=1&appid=${apiKey}`
    );
    const data = await res.json();
    if (data && data.length > 0) {
      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);
      if (isValidCoordinate(lat, lng)) {
        return { lat, lng, name: data[0].name || target };
      }
    }
  } catch (err) {
    console.warn('[GEOCODE][OPENWEATHER_ERROR]', err);
  }

  return null;
}

function getStationSuggestions(input: string): Array<{ name: string; code: string; matchType: string }> {
  if (!input || input.trim().length === 0) return [];
  const query = input.toLowerCase().trim();
  const results: Array<{ name: string; code: string; matchType: string; score: number }> = [];

  // 1. Check presets
  for (const st of QUICK_PRESET_STATIONS) {
    const codeMatch = st.code.toLowerCase().startsWith(query);
    const nameMatch = st.name.toLowerCase().includes(query);
    const aliasMatch = st.aliases && st.aliases.some(a => a.toLowerCase().includes(query) || query.includes(a.toLowerCase()));

    if (codeMatch) {
      results.push({ name: st.name, code: st.code, matchType: 'Exact Code', score: 100 });
    } else if (nameMatch) {
      results.push({ name: st.name, code: st.code, matchType: 'Station Match', score: 85 });
    } else if (aliasMatch) {
      results.push({ name: st.name, code: st.code, matchType: 'AI Corrected', score: 75 });
    } else if (query.length >= 3) {
      const dist = levenshteinDistance(query, st.name.toLowerCase().slice(0, query.length));
      if (dist <= 2) {
        results.push({ name: st.name, code: st.code, matchType: 'AI Corrected', score: 65 - dist * 10 });
      }
    }
  }

  // 2. Check ALL_INDIAN_STATIONS
  for (const st of ALL_INDIAN_STATIONS) {
    if (results.some(r => r.code.toLowerCase() === st.code.toLowerCase())) continue;

    const codeMatch = st.code.toLowerCase().startsWith(query);
    const nameMatch = st.name.toLowerCase().includes(query);
    const aliasMatch = st.aliases && st.aliases.some(a => a.toLowerCase().includes(query) || query.includes(a.toLowerCase()));

    if (codeMatch) {
      results.push({ name: st.name, code: st.code, matchType: 'Exact Code', score: 95 });
    } else if (nameMatch) {
      results.push({ name: st.name, code: st.code, matchType: 'Station Match', score: 80 });
    } else if (aliasMatch) {
      results.push({ name: st.name, code: st.code, matchType: 'AI Corrected', score: 70 });
    } else if (query.length >= 3) {
      const dist = levenshteinDistance(query, st.name.toLowerCase().slice(0, query.length));
      if (dist <= 2) {
        results.push({ name: st.name, code: st.code, matchType: 'AI Corrected', score: 55 - dist * 10 });
      }
    }

    if (results.length >= 10) break;
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 5);
}

function findNearestStation(lat?: number | null, lng?: number | null): { name: string; code: string; distKm: number } | null {
  if (!isValidCoordinate(lat, lng)) return null;
  let nearest = null;
  let minDist = Infinity;

  for (const st of QUICK_PRESET_STATIONS) {
    const dist = haversineDistanceMeters(lat!, lng!, st.lat, st.lng);
    if (dist < minDist) {
      minDist = dist;
      nearest = { name: st.name, code: st.code, distKm: Math.round((dist / 1000) * 10) / 10 };
    }
  }
  return nearest;
}

export const LiveNavigationUI: React.FC = () => {
  const navState = useLiveNavigation();
  const pan = useRef(new Animated.ValueXY()).current;
  const [isEditing, setIsEditing] = useState(false);
  const [customDest, setCustomDest] = useState('');
  const [showDebug, setShowDebug] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  React.useEffect(() => {
    if (!navState.isNavigating) {
      liveNavigationService.startLiveTrackingWithoutDestination();
    }
  }, []);

  const suggestions = getStationSuggestions(customDest);
  const isFullScreenVisible = isFullScreen || Boolean(navState.isFullScreen);

  const handleOpenFullScreen = () => {
    setIsFullScreen(true);
    liveNavigationService.openFullScreen();
  };

  const handleCloseFullScreen = () => {
    setIsFullScreen(false);
    liveNavigationService.closeFullScreen();
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: () => {
        pan.extractOffset();
      },
    })
  ).current;

  if (!navState.isNavigating) {
    return null;
  }

  const {
    etaSeconds,
    status,
    movementMode,
    speedKmh,
    remainingDistanceMeters,
    destination,
    currentLocation,
    accuracyMeters,
    lastGpsFixTimestamp,
    rawGpsSpeedKmh,
    derivedSpeedKmh,
    progressPercent,
    dataHealth,
    motionDebug,
  } = navState;

  const nearestOrigin = findNearestStation(currentLocation?.latitude, currentLocation?.longitude);

  const handleAllowGps = () => {
    if (Platform.OS !== 'web') {
      Alert.alert(
        'Location Access Needed',
        'RailIo needs access to your location to calculate real distance, movement speed, and arrival ETA during live navigation.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Allow Location',
            onPress: () => liveNavigationService.retryGps(),
          },
          {
            text: 'Open Settings',
            onPress: () => liveNavigationService.openSystemSettings(),
          },
        ]
      );
    } else {
      liveNavigationService.retryGps();
    }
  };

  // Formatting ETA
  let etaText = 'Select Destination';
  let etaSubtext = 'Select a destination station below to calculate arrival ETA';
  let arrivalClockStr = '--:--';

  if (!destination) {
    etaText = 'Select Destination';
    etaSubtext = 'Choose a station below to view live arrival ETA';
  } else if (status === 'destination_unavailable') {
    etaText = 'Unavailable';
    etaSubtext = 'Set a valid destination';
  } else if (status === 'location_permission_required') {
    etaText = 'Allow GPS';
    etaSubtext = 'Tap to grant location permission';
  } else if (status === 'location_services_disabled') {
    etaText = 'Turn on GPS';
    etaSubtext = 'Enable Location Services in device settings';
  } else if (status === 'waiting_for_gps' || status === 'waiting_for_first_fix') {
    etaText = 'Locating...';
    etaSubtext = 'Acquiring satellite GPS fix...';
  } else if (status === 'arrived') {
    etaText = 'Arrived!';
    etaSubtext = 'You have reached your destination';
  } else if (etaSeconds !== null && etaSeconds >= 0) {
    const mins = Math.floor(etaSeconds / 60);
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;

    if (hrs > 0) {
      etaText = `${hrs}h ${remMins}m`;
    } else if (mins === 0 && etaSeconds > 0) {
      etaText = '< 1m';
    } else {
      etaText = `${mins} min`;
    }

    etaSubtext = `Estimated time until arrival`;

    const arrivalDate = new Date(Date.now() + etaSeconds * 1000);
    arrivalClockStr = arrivalDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // Formatting Distance
  let distanceText = 'Set Destination';
  let distanceValText = '--';
  let distanceUnitText = '';

  if (destination && remainingDistanceMeters !== null && remainingDistanceMeters >= 0) {
    if (remainingDistanceMeters >= 1000) {
      const kmVal = (remainingDistanceMeters / 1000).toFixed(2);
      distanceText = `${kmVal} km`;
      distanceValText = kmVal;
      distanceUnitText = 'km';
    } else {
      distanceText = `${remainingDistanceMeters} m`;
      distanceValText = `${remainingDistanceMeters}`;
      distanceUnitText = 'm';
    }
  }

  if (destination && distanceText !== 'Set Destination' && etaSeconds !== null && etaSeconds >= 0) {
    const mins = Math.floor(etaSeconds / 60);
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    const timeStr = hrs > 0 ? `${hrs}h ${remMins}m` : (mins === 0 && etaSeconds > 0 ? '< 1m' : `${mins} min`);
    etaText = `${timeStr} • ${distanceText}`;
  }

  // Formatting Speed
  let speedText = '0.0 km/h';
  let speedValText = '0.0';
  if (speedKmh !== null && speedKmh >= 0) {
    const spd = speedKmh.toFixed(1);
    speedText = `${spd} km/h`;
    speedValText = spd;
  }

  const getModeIcon = (size = 18, color = '#0F172A') => {
    const m = (movementMode || '').toLowerCase();
    if (m.includes('train')) return <Train size={size} color={color} />;
    if (m.includes('vehicle')) return <Navigation size={size} color={color} />;
    if (m.includes('walking') || m.includes('running')) return <Footprints size={size} color={color} />;
    return <Train size={size} color={color} />;
  };

  const getStatusText = () => {
    if (status === 'arrived') return 'ARRIVED AT DESTINATION';
    if (status === 'destination_unavailable') return 'DESTINATION UNAVAILABLE';
    if (status === 'location_permission_required') return 'LOCATION PERMISSION REQUIRED';
    if (status === 'location_services_disabled') return 'LOCATION SERVICES OFF';
    if (status === 'waiting_for_first_fix' || status === 'waiting_for_gps' || !currentLocation) return 'ACQUIRING GPS FIX';
    
    const m = (movementMode || '').toLowerCase();
    if (m === 'train_stopped') return 'TRAIN STOPPED AT STATION';
    if (m === 'train') return speedKmh && speedKmh > 1 ? 'TRAIN IN TRANSIT' : 'TRAIN BOARDED';
    if (m === 'vehicle') return 'IN VEHICLE TRANSIT';
    if (m === 'walking') return 'WALKING / PEDESTRIAN';
    if (m === 'running') return 'RUNNING / FAST WALK';

    if (speedKmh && speedKmh > 15) return 'TRAIN IN TRANSIT';
    if (speedKmh && speedKmh > 5) return 'WALKING / IN TRANSIT';
    return 'TRAIN BOARDED';
  };

  const handleSetDestination = async (destName?: string) => {
    const target = destName || customDest;
    if (!target) {
      setIsEditing(false);
      Keyboard.dismiss();
      return;
    }

    const resolved = await resolveLocationQuery(target);

    if (resolved && isValidCoordinate(resolved.lat, resolved.lng)) {
      liveNavigationService.startNavigation({
        latitude: resolved.lat,
        longitude: resolved.lng,
        name: resolved.name,
      });
      setIsEditing(false);
      setCustomDest('');
      Keyboard.dismiss();
    } else {
      liveNavigationService.setInvalidDestination(target);
      setIsEditing(false);
      setCustomDest('');
      Keyboard.dismiss();
    }
  };

  const originNameStr = nearestOrigin ? `Near ${nearestOrigin.name}` : (currentLocation ? `GPS: ${currentLocation.latitude.toFixed(3)}°, ${currentLocation.longitude.toFixed(3)}°` : 'Acquiring GPS...');
  const currentStatusStr = getStatusText();

  const subtitleLine = destination
    ? `📍 ${originNameStr} • ${currentStatusStr} (${speedText})`
    : `📍 ${originNameStr} • 🛰️ GPS Active (${speedText})`;

  return (
    <>
      {/* COMPACT FLOATING CAPSULE MODE */}
      <Animated.View
        style={[
          styles.capsuleContainer,
          { transform: [{ translateX: pan.x }, { translateY: pan.y }] },
        ]}
        {...panResponder.panHandlers}
      >
        <View style={styles.capsule}>
          <TouchableOpacity
            style={styles.iconContainer}
            onPress={handleOpenFullScreen}
            onLongPress={() => setShowDebug(!showDebug)}
            delayLongPress={800}
            activeOpacity={0.8}
          >
            {getModeIcon(18, '#FF671F')}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.infoCol}
            onPress={() => {
              if (status === 'location_permission_required' || status === 'location_services_disabled') {
                handleAllowGps();
              } else {
                handleOpenFullScreen();
              }
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.etaValue}>{etaText}</Text>
            <Text style={styles.statusText}>{subtitleLine}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.expandBtn}
            onPress={handleOpenFullScreen}
          >
            <Maximize2 size={14} color="#FF671F" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => liveNavigationService.stopNavigation()}
          >
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {isEditing && (
          <View>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Station (e.g. Sodepur, Barrackpore, SDAH)"
                placeholderTextColor="#94A3B8"
                value={customDest}
                onChangeText={setCustomDest}
                onSubmitEditing={() => handleSetDestination()}
              />
              <TouchableOpacity style={styles.goBtn} onPress={() => handleSetDestination()}>
                <Text style={styles.goBtnText}>GO</Text>
              </TouchableOpacity>
            </View>

            {customDest.trim().length > 0 && suggestions.length > 0 && (
              <View style={styles.suggestionsDropdown}>
                {suggestions.map((item, idx) => (
                  <TouchableOpacity
                    key={`capsule-sug-${item.code}-${idx}`}
                    style={styles.suggestionItem}
                    onPress={() => handleSetDestination(item.name)}
                  >
                    <View style={styles.suggestionTextRow}>
                      <Text style={styles.suggestionNameText}>{item.name}</Text>
                      <Text style={styles.suggestionCodeText}>({item.code})</Text>
                    </View>
                    <Text style={styles.suggestionMatchBadge}>{item.matchType}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {showDebug && (
          <View style={styles.debugPanel}>
            <Text style={styles.debugTitle}>GPS & NAVIGATION DIAGNOSTICS</Text>

            <Text style={styles.debugText}>Destination: {destination?.name ?? 'N/A'}</Text>
            <Text style={styles.debugText}>Dest Lat: {destination?.latitude ?? 'N/A'}</Text>
            <Text style={styles.debugText}>Dest Lng: {destination?.longitude ?? 'N/A'}</Text>

            <Text style={styles.debugText}>Permission: {(dataHealth.locationPermission ?? 'UNDETERMINED').toUpperCase()}</Text>
            <Text style={styles.debugText}>Services Enabled: {dataHealth.locationServicesEnabled !== false ? 'ON' : 'OFF'}</Text>
            <Text style={styles.debugText}>GPS Watcher: {dataHealth.gpsWatcherActive ? 'ACTIVE' : 'INACTIVE'}</Text>

            <Text style={styles.debugText}>Current Lat: {currentLocation?.latitude ?? 'N/A'}</Text>
            <Text style={styles.debugText}>Current Lng: {currentLocation?.longitude ?? 'N/A'}</Text>
            <Text style={styles.debugText}>Distance: {remainingDistanceMeters !== null ? remainingDistanceMeters + ' m' : 'N/A'}</Text>
            <Text style={styles.debugText}>Speed: {speedKmh !== null ? speedKmh + ' km/h' : 'N/A'}</Text>
            <Text style={styles.debugText}>ETA: {etaSeconds !== null ? Math.round(etaSeconds / 60) + ' min' : 'N/A'}</Text>
            <Text style={styles.debugText}>Status State: {status}</Text>
          </View>
        )}
      </Animated.View>

      {/* FULL-SCREEN LIVE NAVIGATION SCREEN */}
      <Modal
        visible={isFullScreenVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={handleCloseFullScreen}
      >
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        <SafeAreaView style={styles.fullScreenContainer}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* FULL SCREEN HEADER */}
            <View style={styles.headerBar}>
              <View style={styles.headerLeft}>
                <View style={styles.livePulseDot} />
                <View>
                  <Text style={styles.headerTitle}>LIVE TRAIN NAVIGATION</Text>
                  <Text style={styles.headerSubtitle}>Motion Fusion & GPS Telemetry</Text>
                </View>
              </View>

              <View style={styles.headerRightButtons}>
                <TouchableOpacity
                  style={styles.minimizeBtn}
                  onPress={handleCloseFullScreen}
                >
                  <Minimize2 size={18} color="#FFFFFF" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.stopNavBtn}
                  onPress={() => {
                    liveNavigationService.stopNavigation();
                    handleCloseFullScreen();
                  }}
                >
                  <X size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>

            {/* MY CURRENT LOCATION (ORIGIN) BANNER */}
            <View style={styles.originCard}>
              <View style={styles.destHeaderRow}>
                <View style={styles.originBadge}>
                  <Radio size={16} color="#4ADE80" />
                  <Text style={styles.originBadgeText}>MY CURRENT LOCATION (ORIGIN)</Text>
                </View>
                <View style={styles.liveGpsPulseContainer}>
                  <View style={styles.pulseDotGreen} />
                  <Text style={styles.liveGpsText}>
                    {dataHealth.hasRecentGpsFix ? 'LIVE GPS ACTIVE' : 'LOCATING...'}
                  </Text>
                </View>
              </View>

              <Text style={styles.originNameText}>
                {currentLocation
                  ? (nearestOrigin
                      ? `Near ${nearestOrigin.name} Station (${nearestOrigin.distKm} km)`
                      : `GPS Fix: ${currentLocation.latitude.toFixed(4)}°N, ${currentLocation.longitude.toFixed(4)}°E`)
                  : 'Locating current GPS coordinates...'}
              </Text>

              {currentLocation?.latitude && currentLocation?.longitude ? (
                <Text style={styles.originCoordsText}>
                  Satellite GPS: {currentLocation.latitude.toFixed(5)}°N, {currentLocation.longitude.toFixed(5)}°E (Accuracy: ±{Math.round(accuracyMeters ?? 10)}m)
                </Text>
              ) : (
                <Text style={styles.originCoordsText}>Acquiring satellite GPS fix from device...</Text>
              )}
            </View>

            {/* DESTINATION BANNER */}
            <View style={styles.destinationCard}>
              <View style={styles.destHeaderRow}>
                <View style={styles.destBadge}>
                  <MapPin size={16} color="#FF671F" />
                  <Text style={styles.destBadgeText}>DESTINATION</Text>
                </View>

                <TouchableOpacity
                  style={styles.changeDestBtn}
                  onPress={() => setIsEditing(!isEditing)}
                >
                  <Search size={14} color="#38BDF8" />
                  <Text style={styles.changeDestText}>Change Station</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.destNameText}>
                {destination?.name ? destination.name : 'Select Station'}
              </Text>

              {destination?.latitude && destination?.longitude ? (
                <Text style={styles.coordsText}>
                  GPS: {destination.latitude.toFixed(4)}°N, {destination.longitude.toFixed(4)}°E
                </Text>
              ) : null}

              {isEditing && (
                <View>
                  <View style={styles.fullScreenInputRow}>
                    <TextInput
                      style={styles.fullScreenInput}
                      placeholder="Type station (e.g. Sodepur, Barrackpore, SDAH)"
                      placeholderTextColor="#94A3B8"
                      value={customDest}
                      onChangeText={setCustomDest}
                      onSubmitEditing={() => handleSetDestination()}
                      autoFocus
                    />
                    <TouchableOpacity
                      style={styles.fullScreenGoBtn}
                      onPress={() => handleSetDestination()}
                    >
                      <Text style={styles.fullScreenGoText}>GO</Text>
                    </TouchableOpacity>
                  </View>

                  {customDest.trim().length > 0 && suggestions.length > 0 && (
                    <View style={styles.suggestionsDropdown}>
                      {suggestions.map((item, idx) => (
                        <TouchableOpacity
                          key={`full-sug-${item.code}-${idx}`}
                          style={styles.suggestionItem}
                          onPress={() => handleSetDestination(item.name)}
                        >
                          <View style={styles.suggestionTextRow}>
                            <Text style={styles.suggestionNameText}>{item.name}</Text>
                            <Text style={styles.suggestionCodeText}>({item.code})</Text>
                          </View>
                          <Text style={styles.suggestionMatchBadge}>{item.matchType}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* QUICK PRESET CHIPS */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.presetChipsScroll}
                contentContainerStyle={styles.presetChipsContent}
              >
                {QUICK_PRESET_STATIONS.map(st => (
                  <TouchableOpacity
                    key={st.code}
                    style={[
                      styles.presetChip,
                      destination?.name?.toLowerCase() === st.name.toLowerCase() && styles.presetChipActive,
                    ]}
                    onPress={() => handleSetDestination(st.name)}
                  >
                    <Text
                      style={[
                        styles.presetChipText,
                        destination?.name?.toLowerCase() === st.name.toLowerCase() && styles.presetChipTextActive,
                      ]}
                    >
                      {st.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* GPS PERMISSION / SERVICE WARNING BANNER (IF DENIED OR DISABLED) */}
            {(status === 'location_permission_required' || status === 'location_services_disabled') && (
              <TouchableOpacity
                style={styles.alertBannerCard}
                onPress={handleAllowGps}
                activeOpacity={0.8}
              >
                <AlertTriangle size={24} color="#EF4444" />
                <View style={styles.alertBannerTextCol}>
                  <Text style={styles.alertBannerTitle}>
                    {status === 'location_permission_required'
                      ? 'Location Permission Denied'
                      : 'Location Services Disabled'}
                  </Text>
                  <Text style={styles.alertBannerSub}>
                    Tap here to grant GPS access and enable live distance tracking.
                  </Text>
                </View>
                <ChevronRight size={20} color="#EF4444" />
              </TouchableOpacity>
            )}

            {/* HERO ETA CARD */}
            <View style={styles.heroEtaCard}>
              <View style={styles.etaTopRow}>
                <View style={styles.etaLabelGroup}>
                  <Clock size={20} color="#FF671F" />
                  <Text style={styles.etaLabelText}>ESTIMATED ARRIVAL TIME (ETA)</Text>
                </View>
                {arrivalClockStr !== '--:--' && (
                  <View style={styles.clockBadge}>
                    <Text style={styles.clockBadgeText}>Clock: {arrivalClockStr}</Text>
                  </View>
                )}
              </View>

              <Text style={styles.heroEtaNumber}>{etaText}</Text>
              <Text style={styles.heroEtaSubtext}>{etaSubtext}</Text>

              {/* PROGRESS BAR */}
              <View style={styles.progressContainer}>
                <View style={styles.progressTrack}>
                  <View style={[styles.fillBar, { width: `${Math.min(100, Math.max(0, progressPercent))}%` }]} />
                </View>
                <View style={styles.progressLabels}>
                  <Text style={styles.progressLabelLeft}>Start / Boarding</Text>
                  <Text style={styles.progressPercentText}>{Math.round(progressPercent)}% Completed</Text>
                  <Text style={styles.progressLabelRight}>{destination?.name || 'Destination'}</Text>
                </View>
              </View>
            </View>

            {/* METRICS GRID (SPEED & DISTANCE) */}
            <View style={styles.metricsGrid}>
              {/* SPEEDOMETER CARD */}
              <View style={styles.metricCard}>
                <View style={styles.metricHeaderRow}>
                  <Gauge size={18} color="#38BDF8" />
                  <Text style={styles.metricTitle}>SPEED</Text>
                </View>

                <View style={styles.metricValueRow}>
                  <Text style={styles.metricBigNumber}>{speedValText}</Text>
                  <Text style={styles.metricUnit}>km/h</Text>
                </View>

                <View style={styles.speedModeBadge}>
                  {getModeIcon(12, '#38BDF8')}
                  <Text style={styles.speedModeText}>
                    {speedKmh && speedKmh > 20
                      ? 'TRAIN SPEED'
                      : speedKmh && speedKmh > 5
                      ? 'RUNNING / TRANSIT'
                      : 'PEDESTRIAN SPEED'}
                  </Text>
                </View>
              </View>

              {/* REMAINING DISTANCE CARD */}
              <View style={styles.metricCard}>
                <View style={styles.metricHeaderRow}>
                  <Navigation size={18} color="#4ADE80" />
                  <Text style={styles.metricTitle}>REMAINING</Text>
                </View>

                <View style={styles.metricValueRow}>
                  <Text style={styles.metricBigNumber}>{distanceValText}</Text>
                  <Text style={styles.metricUnit}>{distanceUnitText}</Text>
                </View>

                <View style={styles.distanceBadge}>
                  <Text style={styles.distanceBadgeText}>
                    {remainingDistanceMeters !== null
                      ? `${remainingDistanceMeters} meters left`
                      : 'Calculating distance...'}
                  </Text>
                </View>
              </View>
            </View>

            {/* MOTION FUSION MODE & CONFIDENCE CARD */}
            <View style={styles.telemetryCard}>
              <View style={styles.telemetryHeader}>
                <Zap size={18} color="#FACC15" />
                <Text style={styles.telemetryTitle}>MOTION FUSION DETECTOR</Text>
              </View>

              <View style={styles.telemetryRow}>
                <Text style={styles.telemetryLabel}>Classification Mode:</Text>
                <View style={styles.modePill}>
                  {getModeIcon(14, '#FACC15')}
                  <Text style={styles.modePillText}>{movementMode.toUpperCase()}</Text>
                </View>
              </View>

              {motionDebug && (
                <View style={styles.confidenceCol}>
                  <View style={styles.confBarRow}>
                    <Text style={styles.confLabel}>Train Confidence:</Text>
                    <View style={styles.confTrack}>
                      <View style={[styles.confFill, { width: `${Math.round(motionDebug.confidence.train * 100)}%`, backgroundColor: '#FF671F' }]} />
                    </View>
                    <Text style={styles.confVal}>{Math.round(motionDebug.confidence.train * 100)}%</Text>
                  </View>

                  <View style={styles.confBarRow}>
                    <Text style={styles.confLabel}>Walking Confidence:</Text>
                    <View style={styles.confTrack}>
                      <View style={[styles.confFill, { width: `${Math.round(motionDebug.confidence.walking * 100)}%`, backgroundColor: '#4ADE80' }]} />
                    </View>
                    <Text style={styles.confVal}>{Math.round(motionDebug.confidence.walking * 100)}%</Text>
                  </View>
                </View>
              )}
            </View>

            {/* GPS SATELLITE TELEMETRY CARD */}
            <View style={styles.telemetryCard}>
              <View style={styles.telemetryHeader}>
                <Radio size={18} color="#A855F7" />
                <Text style={styles.telemetryTitle}>GPS SATELLITE STATUS</Text>
              </View>

              <View style={styles.gpsDetailsGrid}>
                <View style={styles.gpsDetailItem}>
                  <Text style={styles.gpsDetailLabel}>GPS Lock Status</Text>
                  <Text style={styles.gpsDetailVal}>
                    {dataHealth.hasRecentGpsFix ? 'ACTIVE FIX' : 'WAITING FIX'}
                  </Text>
                </View>

                <View style={styles.gpsDetailItem}>
                  <Text style={styles.gpsDetailLabel}>Accuracy</Text>
                  <Text style={styles.gpsDetailVal}>
                    {accuracyMeters ? `±${Math.round(accuracyMeters)} m` : 'N/A'}
                  </Text>
                </View>

                <View style={styles.gpsDetailItem}>
                  <Text style={styles.gpsDetailLabel}>Current Latitude</Text>
                  <Text style={styles.gpsDetailVal}>
                    {currentLocation?.latitude ? currentLocation.latitude.toFixed(5) : 'Searching...'}
                  </Text>
                </View>

                <View style={styles.gpsDetailItem}>
                  <Text style={styles.gpsDetailLabel}>Current Longitude</Text>
                  <Text style={styles.gpsDetailVal}>
                    {currentLocation?.longitude ? currentLocation.longitude.toFixed(5) : 'Searching...'}
                  </Text>
                </View>
              </View>
            </View>

            {/* FOOTER ACTIONS */}
            <View style={styles.footerActions}>
              <TouchableOpacity
                style={styles.minimizeFullBtn}
                onPress={handleCloseFullScreen}
              >
                <Minimize2 size={16} color="#0F172A" />
                <Text style={styles.minimizeFullText}>Minimize to Floating Capsule</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.stopFullBtn}
                onPress={() => {
                  liveNavigationService.stopNavigation();
                  handleCloseFullScreen();
                }}
              >
                <X size={16} color="#FFFFFF" />
                <Text style={styles.stopFullText}>End Navigation</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  capsuleContainer: {
    position: 'absolute',
    top: 140,
    left: 20,
    zIndex: 9999,
  },
  capsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Platform.OS === 'ios' ? 'rgba(15, 23, 42, 0.92)' : '#0F172A',
    borderRadius: 50,
    paddingVertical: 8,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 10,
  },
  iconContainer: {
    backgroundColor: '#1E293B',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCol: {
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  etaValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: -2,
  },
  expandBtn: {
    backgroundColor: '#1E293B',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  closeBtn: {
    backgroundColor: '#331D1D',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '900',
  },
  inputContainer: {
    flexDirection: 'row',
    marginTop: 8,
    backgroundColor: '#1E293B',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  input: {
    flex: 1,
    fontSize: 12,
    color: '#FFFFFF',
    paddingVertical: 4,
    minWidth: 100,
  },
  goBtn: {
    backgroundColor: '#FF671F',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  goBtnText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  debugPanel: {
    marginTop: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    borderRadius: 12,
    padding: 12,
    width: 260,
    borderWidth: 1,
    borderColor: '#333',
  },
  debugTitle: {
    color: '#FF671F',
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  debugText: {
    color: '#E2E8F0',
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 2,
  },

  /* FULL SCREEN STYLING */
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  livePulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF671F',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  headerRightButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  minimizeBtn: {
    backgroundColor: '#1E293B',
    padding: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  stopNavBtn: {
    backgroundColor: '#331D1D',
    padding: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  originCard: {
    backgroundColor: '#0F291E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#166534',
  },
  originBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  originBadgeText: {
    color: '#4ADE80',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  originNameText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 2,
  },
  originCoordsText: {
    color: '#86EFAC',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  liveGpsPulseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#052E16',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#15803D',
  },
  pulseDotGreen: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4ADE80',
  },
  liveGpsText: {
    color: '#4ADE80',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  destinationCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  destHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  destBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  destBadgeText: {
    color: '#FF671F',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  changeDestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  changeDestText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
  },
  destNameText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 2,
  },
  coordsText: {
    color: '#64748B',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 10,
  },
  fullScreenInputRow: {
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 10,
    gap: 8,
  },
  fullScreenInput: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#FFFFFF',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#334155',
  },
  fullScreenGoBtn: {
    backgroundColor: '#FF671F',
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenGoText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
  },
  presetChipsScroll: {
    marginTop: 6,
  },
  presetChipsContent: {
    gap: 8,
  },
  presetChip: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  presetChipActive: {
    backgroundColor: '#FF671F',
    borderColor: '#FF671F',
  },
  presetChipText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },
  presetChipTextActive: {
    color: '#FFFFFF',
  },
  alertBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#331D1D',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    gap: 12,
  },
  alertBannerTextCol: {
    flex: 1,
  },
  alertBannerTitle: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '800',
  },
  alertBannerSub: {
    color: '#F87171',
    fontSize: 11,
    marginTop: 2,
  },
  heroEtaCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FF671F',
    shadowColor: '#FF671F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  etaTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  etaLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  etaLabelText: {
    color: '#FF671F',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  clockBadge: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  clockBadgeText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
  },
  heroEtaNumber: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: -1,
  },
  heroEtaSubtext: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 16,
  },
  progressContainer: {
    marginTop: 4,
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#0F172A',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  fillBar: {
    height: '100%',
    backgroundColor: '#FF671F',
    borderRadius: 4,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabelLeft: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
  },
  progressPercentText: {
    color: '#FF671F',
    fontSize: 11,
    fontWeight: '900',
  },
  progressLabelRight: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  metricHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  metricTitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 8,
  },
  metricBigNumber: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
  },
  metricUnit: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '700',
  },
  speedModeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  speedModeText: {
    color: '#38BDF8',
    fontSize: 9,
    fontWeight: '800',
  },
  distanceBadge: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  distanceBadgeText: {
    color: '#4ADE80',
    fontSize: 9,
    fontWeight: '800',
  },
  telemetryCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  telemetryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  telemetryTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  telemetryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  telemetryLabel: {
    color: '#94A3B8',
    fontSize: 12,
  },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FACC15',
  },
  modePillText: {
    color: '#FACC15',
    fontSize: 11,
    fontWeight: '900',
  },
  confidenceCol: {
    gap: 6,
  },
  confBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  confLabel: {
    color: '#64748B',
    fontSize: 10,
    width: 100,
  },
  confTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#0F172A',
    borderRadius: 3,
    overflow: 'hidden',
  },
  confFill: {
    height: '100%',
    borderRadius: 3,
  },
  confVal: {
    color: '#94A3B8',
    fontSize: 10,
    width: 32,
    textAlign: 'right',
    fontWeight: '700',
  },
  gpsDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gpsDetailItem: {
    width: '46%',
    backgroundColor: '#0F172A',
    padding: 10,
    borderRadius: 12,
  },
  gpsDetailLabel: {
    color: '#64748B',
    fontSize: 10,
    marginBottom: 2,
  },
  gpsDetailVal: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  footerActions: {
    gap: 10,
    marginTop: 8,
  },
  minimizeFullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F1F5F9',
    paddingVertical: 14,
    borderRadius: 16,
  },
  minimizeFullText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '900',
  },
  stopFullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#331D1D',
    borderWidth: 1,
    borderColor: '#EF4444',
    paddingVertical: 14,
    borderRadius: 16,
  },
  stopFullText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '900',
  },
  suggestionsDropdown: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    marginTop: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  suggestionTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  suggestionNameText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  suggestionCodeText: {
    color: '#FF671F',
    fontSize: 11,
    fontWeight: '900',
  },
  suggestionMatchBadge: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '700',
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
});
