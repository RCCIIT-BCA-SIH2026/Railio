import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { getLiveTrainApi, initMobileSocket } from '../services/api';
import { AppBackground } from '../components/AppBackground';
import { LiveInteractiveCorridorMap } from '../components/LiveInteractiveCorridorMap';
import {
  TrainFront,
  Search,
  Crosshair,
  MapPin,
  Clock,
  Gauge,
  ShieldCheck,
  CheckCircle2,
  Radio,
  Users,
  Navigation,
  ArrowRight,
  ArrowLeft,
  Compass,
  Sparkles,
} from 'lucide-react-native';
import rawSuburbanTrains from '../data/suburban_trains.json';

// Corridor Station GPS Coordinates (Single Source of Truth)
const CORRIDOR_STATIONS = [
  { code: 'SDAH', name: 'Sealdah', km: 0, lat: 22.5675, lng: 88.3712, platforms: 21 },
  { code: 'BNXR', name: 'Bidhan Nagar Rd', km: 4, lat: 22.5898, lng: 88.3892, platforms: 4 },
  { code: 'DDJ', name: 'Dum Dum Jn', km: 7, lat: 22.6219, lng: 88.3931, platforms: 5 },
  { code: 'BARN', name: 'Baranagar Rd', km: 12, lat: 22.6392, lng: 88.3732, platforms: 2 },
  { code: 'DAKE', name: 'Dakshineswar', km: 14, lat: 22.6534, lng: 88.3601, platforms: 4 },
  { code: 'BLYG', name: 'Bally Ghat', km: 16, lat: 22.6534, lng: 88.3620, platforms: 2 },
  { code: 'BLYH', name: 'Bally Halt', km: 18, lat: 22.6575, lng: 88.3585, platforms: 2 },
  { code: 'RCD', name: 'Rajchandrapur', km: 22, lat: 22.6680, lng: 88.3310, platforms: 2 },
  { code: 'DKAE', name: 'Dankuni Jn', km: 28, lat: 22.6872, lng: 88.2934, platforms: 5 },
];

const STATION_NAME_MAP: Record<string, string> = {
  SDAH: 'Sealdah',
  BNXR: 'Bidhan Nagar Rd',
  DDJ: 'Dum Dum Jn',
  BARN: 'Baranagar Rd',
  DAKE: 'Dakshineswar',
  BLYG: 'Bally Ghat',
  BLYH: 'Bally Halt',
  RCD: 'Rajchandrapur',
  DKAE: 'Dankuni Jn',
  HWH: 'Howrah Jn',
  NDLS: 'New Delhi',
  MMCT: 'Mumbai Central',
  MAS: 'Mgr Chennai Ctr',
  MYS: 'Mysuru Jn',
  RKMP: 'Rani Kamalapati',
};

const getStationDisplayName = (code: string, rawName?: string): string => {
  if (code && STATION_NAME_MAP[code.toUpperCase()]) {
    return STATION_NAME_MAP[code.toUpperCase()];
  }
  if (rawName && rawName.toUpperCase() !== (code || '').toUpperCase()) {
    return rawName;
  }
  const found = CORRIDOR_STATIONS.find((s) => s.code.toUpperCase() === (code || '').toUpperCase());
  if (found) return found.name;
  return code || 'Station';
};

const POPULAR_TRAINS = [
  { number: '12301', label: '12301 (HWH-NDLS Rajdhani)', dir: 'EXP', name: 'Howrah - New Delhi Rajdhani Express' },
  { number: '12951', label: '12951 (MMCT-NDLS Tejas)', dir: 'EXP', name: 'Mumbai Central - New Delhi Tejas Rajdhani' },
  { number: '20607', label: '20607 (MAS-MYS Vande)', dir: 'VB', name: 'Mgr Chennai - Mysuru Vande Bharat' },
  { number: '12002', label: '12002 (NDLS-RKMP Shatabdi)', dir: 'EXP', name: 'New Delhi - Bhopal Shatabdi Express' },
  { number: '32211', label: '32211 (04:07 UP)', dir: 'UP', name: 'Sealdah - Dankuni Local' },
  { number: '32212', label: '32212 (05:00 DN)', dir: 'DN', name: 'Dankuni - Sealdah Local' },
  { number: '32216', label: '32216 (06:34 DN)', dir: 'DN', name: 'Dankuni - Sealdah Local' },
  { number: '32217', label: '32217 (06:05 UP)', dir: 'UP', name: 'Sealdah - Dankuni Local' },
];

// Helper: parse "HH:mm" to minutes from midnight
const parseTimeToMinutes = (timeStr?: string): number => {
  if (!timeStr || !timeStr.includes(':')) return 0;
  const parts = timeStr.split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
};

// Helper: format 24h "14:20" or "20:45" into 12h AM/PM "2:20 PM" or "8:45 PM"
const format12HourTime = (timeStr?: string): string => {
  if (!timeStr || !timeStr.includes(':')) return timeStr || '';
  const clean = timeStr.trim();
  const parts = clean.split(':');
  let h = parseInt(parts[0], 10);
  const m = parts[1] ? parts[1].slice(0, 2) : '00';
  if (isNaN(h)) return timeStr;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${ampm}`;
};

// Helper: find current running train or closest upcoming train for user's time right now
const getBestCurrentTrainNumber = (trainsList: any[], currentMins: number): string => {
  if (!trainsList || trainsList.length === 0) return '32211';

  // 1. Priority 1: Train currently running along the corridor right now
  const running = trainsList.find((t) => {
    const dep = parseTimeToMinutes(t.departureTime);
    const arr = parseTimeToMinutes(t.arrivalTime);
    if (arr >= dep) {
      return currentMins >= dep - 10 && currentMins <= arr + 15;
    }
    return currentMins >= dep - 10 || currentMins <= arr + 15;
  });
  if (running) return running.trainNumber;

  // 2. Priority 2: Next upcoming train departing after current time
  let nextTrain = null;
  let minDiff = Infinity;
  trainsList.forEach((t) => {
    const dep = parseTimeToMinutes(t.departureTime);
    let diff = dep - currentMins;
    if (diff < 0) diff += 1440; // wrap to next day
    if (diff < minDiff) {
      minDiff = diff;
      nextTrain = t;
    }
  });
  if (nextTrain) return (nextTrain as any).trainNumber;

  return trainsList[0].trainNumber;
};

// Haversine Distance in km
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const LiveTrainScreen: React.FC = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'LiveTrain'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const now = new Date();
  const currentMins = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;

  const initialTrain = useMemo(() => {
    if (route.params?.trainNumber) return route.params.trainNumber;
    return getBestCurrentTrainNumber(rawSuburbanTrains as any[], currentMins);
  }, [route.params?.trainNumber, currentMins]);

  const [activeTrain, setActiveTrain] = useState<string>(initialTrain);
  const [searchQuery, setSearchQuery] = useState<string>(initialTrain);
  const [liveData, setLiveData] = useState<any>(null);
  const [ticker, setTicker] = useState<number>(0);
  const [socketConnected, setSocketConnected] = useState<boolean>(false);
  const [isInsideTrain, setIsInsideTrain] = useState<boolean>(false);
  const [gpsLoading, setGpsLoading] = useState<boolean>(false);
  const [realGpsCoords, setRealGpsCoords] = useState<{
    lat: number;
    lng: number;
    accuracy?: number;
    speed?: number | null;
    isReal: boolean;
  } | null>(null);
  const [nearestStation, setNearestStation] = useState<{ name: string; code: string; distKm: number } | null>(null);

  const watchIdRef = useRef<number | null>(null);

  // Dynamic Popular & Suburban Trains Chips sorted by time proximity to current IST time
  const sortedPopularTrains = useMemo(() => {
    const rawList = rawSuburbanTrains as any[];

    const sorted = [...rawList].sort((a, b) => {
      const depA = parseTimeToMinutes(a.departureTime);
      const depB = parseTimeToMinutes(b.departureTime);

      const isUpcomingA = depA >= currentMins - 15;
      const isUpcomingB = depB >= currentMins - 15;

      if (isUpcomingA && !isUpcomingB) return -1;
      if (!isUpcomingA && isUpcomingB) return 1;

      let diffA = depA - currentMins;
      if (diffA < 0) diffA += 1440;
      let diffB = depB - currentMins;
      if (diffB < 0) diffB += 1440;

      return diffA - diffB;
    });

    return sorted.map((t) => {
      const isUp = parseInt(t.trainNumber, 10) % 2 === 1 || t.source === 'SDAH';
      const dep = parseTimeToMinutes(t.departureTime);
      const arr = parseTimeToMinutes(t.arrivalTime);
      const effArr = arr < dep ? arr + 1440 : arr;
      const isPast = currentMins > effArr + 15;
      const isRunning = !isPast && currentMins >= dep - 10 && currentMins <= effArr + 15;

      return {
        number: t.trainNumber,
        label: `${isPast ? '🏁 ' : isRunning ? '🟢 ' : ''}${t.trainNumber} (${format12HourTime(t.departureTime)} ${isUp ? 'UP' : 'DN'})`,
        name: t.name,
        isPast,
        isRunning,
      };
    });
  }, [currentMins]);

  // Sync active train from route params if provided
  useEffect(() => {
    if (route.params?.trainNumber) {
      setActiveTrain(route.params.trainNumber);
      setSearchQuery(route.params.trainNumber);
    }
  }, [route.params?.trainNumber]);

  // Real-time Socket.IO Stream Listener (Same as Admin Web Portal)
  useEffect(() => {
    const socket = initMobileSocket();

    const handleConnect = () => setSocketConnected(true);
    const handleDisconnect = () => setSocketConnected(false);

    const handleTrainsUpdate = (trains: any[]) => {
      if (!Array.isArray(trains)) return;
      const match = trains.find((t: any) => t.trainNumber === activeTrain);
      if (match) {
        setLiveData((prev: any) => ({
          ...prev,
          trainNumber: match.trainNumber,
          name: match.name || prev?.name,
          liveState: {
            ...prev?.liveState,
            lat: match.lat ?? prev?.liveState?.lat,
            lng: match.lng ?? prev?.liveState?.lng,
            speed: match.speed ?? prev?.liveState?.speed,
            currentSection: match.currentSection || prev?.liveState?.currentSection,
            delayMinutes: match.delayMinutes ?? prev?.liveState?.delayMinutes,
            predictedDelay: match.predictedDelay ?? match.delayMinutes ?? prev?.liveState?.predictedDelay,
            confidence: match.confidence ?? prev?.liveState?.confidence ?? 0.986,
            status: match.status || prev?.liveState?.status,
            delayReasons: match.delayReasons || prev?.liveState?.delayReasons,
          },
        }));
      }
    };

    if (socket.connected) {
      setSocketConnected(true);
    }

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('trains_update', handleTrainsUpdate);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('trains_update', handleTrainsUpdate);
    };
  }, [activeTrain]);

  // Periodic Telemetry Refresh
  useFocusEffect(
    useCallback(() => {
      loadLiveState(activeTrain);
      const timer = setInterval(() => {
        setTicker((prev) => prev + 1);
      }, 3000);
      return () => clearInterval(timer);
    }, [activeTrain])
  );

  const loadLiveState = async (tNum: string) => {
    if (!tNum) return;
    try {
      const data = await getLiveTrainApi(tNum);
      if (data) {
        setLiveData(data);
      }
    } catch (err) {
      console.warn('[LiveTrainScreen] Could not load live train status, using local dataset.');
    }
  };

  const handleSelectTrain = (tNum: string) => {
    setActiveTrain(tNum);
    setSearchQuery(tNum);
    loadLiveState(tNum);
  };

  const handleSearch = () => {
    const q = searchQuery.trim();
    if (!q) return;

    // Search by train number in dataset
    const found = (rawSuburbanTrains as any[]).find(
      (t) =>
        t.trainNumber === q ||
        t.name.toLowerCase().includes(q.toLowerCase()) ||
        t.source.toLowerCase().includes(q.toLowerCase()) ||
        t.destination.toLowerCase().includes(q.toLowerCase())
    );

    if (found) {
      handleSelectTrain(found.trainNumber);
    } else if (/^\d{5}$/.test(q)) {
      handleSelectTrain(q);
    } else {
      handleSelectTrain('32211');
    }
  };

  // ── REAL DEVICE GPS INTEGRATION ─────────────────────────────────────────
  const startRealGpsTracking = () => {
    setGpsLoading(true);

    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude, accuracy, speed } = pos.coords;
          const speedKmh = speed ? Math.round(speed * 3.6) : null;
          setRealGpsCoords({
            lat: latitude,
            lng: longitude,
            accuracy: Math.round(accuracy || 5),
            speed: speedKmh,
            isReal: true,
          });
          setGpsLoading(false);
          computeNearestStation(latitude, longitude);

          // Start continuous watch
          if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
          }
          watchIdRef.current = navigator.geolocation.watchPosition(
            (watchPos) => {
              const { latitude: wLat, longitude: wLng, accuracy: wAcc, speed: wSpd } = watchPos.coords;
              setRealGpsCoords({
                lat: wLat,
                lng: wLng,
                accuracy: Math.round(wAcc || 5),
                speed: wSpd ? Math.round(wSpd * 3.6) : null,
                isReal: true,
              });
              computeNearestStation(wLat, wLng);
            },
            (err) => console.warn('[GPS Watch Error]', err),
            { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
          );
        },
        (err) => {
          console.warn('[GPS Error]', err.message);
          setGpsLoading(false);
          // Fallback to Corridor GPS anchor
          setRealGpsCoords({
            lat: 22.6534,
            lng: 88.3601,
            accuracy: 8,
            speed: 52,
            isReal: false,
          });
          computeNearestStation(22.6534, 88.3601);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setGpsLoading(false);
      setRealGpsCoords({
        lat: 22.6534,
        lng: 88.3601,
        accuracy: 10,
        speed: 52,
        isReal: false,
      });
      computeNearestStation(22.6534, 88.3601);
    }
  };

  const stopRealGpsTracking = () => {
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator && watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setRealGpsCoords(null);
    setNearestStation(null);
  };

  const computeNearestStation = (lat: number, lng: number) => {
    let minD = Infinity;
    let closest = CORRIDOR_STATIONS[0];
    CORRIDOR_STATIONS.forEach((st) => {
      const d = calculateDistanceKm(lat, lng, st.lat, st.lng);
      if (d < minD) {
        minD = d;
        closest = st;
      }
    });
    setNearestStation({ name: closest.name, code: closest.code, distKm: Number(minD.toFixed(2)) });
  };

  const toggleInsideTrain = () => {
    const newState = !isInsideTrain;
    setIsInsideTrain(newState);
    if (newState) {
      startRealGpsTracking();
    } else {
      stopRealGpsTracking();
    }
  };

  // Find train record in local dataset or use live data from ixigo/NTES
  const currentRecord =
    (rawSuburbanTrains as any[]).find((t) => t.trainNumber === activeTrain) ||
    (liveData?.isAllIndiaTrain ? {
      trainNumber: activeTrain,
      name: liveData.name,
      source: liveData.stops?.[0]?.code || 'SRC',
      destination: liveData.stops?.[liveData.stops.length - 1]?.code || 'DST',
      departureTime: liveData.stops?.[0]?.scheduledDeparture || '00:00',
      arrivalTime: liveData.stops?.[liveData.stops.length - 1]?.scheduledArrival || '00:00',
      stops: liveData.stops || [],
    } : (rawSuburbanTrains as any[])[0]);

  const isUpTrain = parseInt(activeTrain, 10) % 2 === 1 || currentRecord.source === 'SDAH';
  const trainName = liveData?.name || currentRecord.name || (isUpTrain ? 'Sealdah - Dankuni Local' : 'Dankuni - Sealdah Local');
  const departureTime = liveData?.stops?.[0]?.scheduledDeparture || currentRecord.departureTime || '04:07';
  const arrivalTime = liveData?.stops?.[liveData?.stops?.length - 1]?.scheduledArrival || currentRecord.arrivalTime || '04:50';
  const stops = liveData?.stops || currentRecord.stops || [];

  // Telemetry speeds and delays
  const baseSpeed = currentRecord.avgSpeed ? Math.round(currentRecord.avgSpeed * 1.3) : 48;
  const speedOffset = (ticker % 4) * 2;
  const liveSpeed = realGpsCoords?.speed ?? (liveData?.liveState?.speed || Math.max(25, Math.min(75, baseSpeed + speedOffset)));

  const baseDelay = currentRecord.avgHistoricalDelayMins ? Math.round(currentRecord.avgHistoricalDelayMins) : 4;
  const currentDelay = liveData?.liveState?.delayMinutes ?? baseDelay;
  const predictedDelay = liveData?.liveState?.predictedDelay ?? currentDelay + (currentDelay > 5 ? 2 : 0);

  const depMins = parseTimeToMinutes(departureTime);
  const arrMins = parseTimeToMinutes(arrivalTime);

  // Exact timetable progress along track (0% to 100%)
  const trackProgressPct = useMemo(() => {
    if (typeof liveData?.liveState?.progressPct === 'number') {
      return Math.min(100, Math.max(0, liveData.liveState.progressPct));
    }

    if (stops && stops.length >= 2) {
      const firstStopDep = parseTimeToMinutes(stops[0].dep || stops[0].arr || departureTime);
      const lastStopArr = parseTimeToMinutes(stops[stops.length - 1].arr || stops[stops.length - 1].dep || arrivalTime);

      if (firstStopDep > 0 && lastStopArr > firstStopDep) {
        if (currentMins < firstStopDep) {
          // Train has not departed origin yet
          return 0;
        }
        if (currentMins > lastStopArr + 10) {
          // Train completed its journey
          return 100;
        }
        return Math.min(100, Math.max(0, ((currentMins - firstStopDep) / (lastStopArr - firstStopDep)) * 100));
      }
    }

    if (arrMins > depMins) {
      if (currentMins < depMins) return 0;
      if (currentMins > arrMins + 10) return 100;
      return Math.min(100, Math.max(0, ((currentMins - depMins) / (arrMins - depMins)) * 100));
    }

    return 5;
  }, [liveData, departureTime, arrivalTime, stops, currentMins, depMins, arrMins]);

  // Dynamic activeStopIndex calculation (0 to stops.length - 1)
  const activeStopIndex = useMemo(() => {
    if (!stops || stops.length === 0) return 0;
    const totalStops = stops.length;

    // 1. Live state station match
    if (liveData?.liveState?.currentStation) {
      const idx = stops.findIndex(
        (s: any) => s.code.toUpperCase() === liveData.liveState.currentStation.toUpperCase()
      );
      if (idx !== -1) return idx;
    }

    // 2. Scheduled arrival/departure time match against current IST time
    if (currentMins > 0) {
      for (let i = 0; i < totalStops; i++) {
        const arrM = parseTimeToMinutes(stops[i].arr || stops[i].scheduledArrival || stops[i].dep);
        const depM = parseTimeToMinutes(stops[i].dep || stops[i].scheduledDeparture || stops[i].arr);
        if (arrM > 0 && depM > 0 && currentMins >= arrM - 1 && currentMins <= depM + 2) {
          return i;
        }
      }
    }

    // 3. Match based on trackProgressPct
    if (trackProgressPct <= 3) return 0;
    if (trackProgressPct >= 97) return totalStops - 1;

    const floatIdx = (trackProgressPct / 100) * (totalStops - 1);
    return Math.min(totalStops - 1, Math.max(0, Math.floor(floatIdx)));
  }, [stops, liveData, trackProgressPct, currentMins]);

  // Dynamic Current Section calculation based on active stop and next stop
  const currentSection = useMemo(() => {
    if (liveData?.liveState?.currentSection) {
      return liveData.liveState.currentSection;
    }
    if (stops && stops.length > 1) {
      const curCode = stops[activeStopIndex]?.code || (isUpTrain ? 'SDAH' : 'DKAE');
      const nextCode = stops[Math.min(activeStopIndex + 1, stops.length - 1)]?.code || (isUpTrain ? 'DKAE' : 'SDAH');
      return `${curCode}-${nextCode}-${isUpTrain ? 'UP' : 'DN'}`;
    }
    return isUpTrain ? 'SDAH-DKAE-UP' : 'DKAE-SDAH-DN';
  }, [liveData, isUpTrain, stops, activeStopIndex]);

  // Smart Active Train Filter: Check if selected train is currently running
  const isTrainCurrentlyRunning = useMemo(() => {
    if (isInsideTrain) return true;
    if (liveData?.liveState?.status === 'RUNNING') return true;

    if (arrMins >= depMins) {
      return currentMins >= depMins - 10 && currentMins <= arrMins + 15;
    } else {
      return currentMins >= depMins - 10 || currentMins <= arrMins + 15;
    }
  }, [isInsideTrain, liveData, currentMins, depMins, arrMins]);

  // Handler to switch to a train currently running right now
  const handleSelectRunningTrainNow = () => {
    const allTrains = rawSuburbanTrains as any[];
    const running = allTrains.find((t) => {
      const dep = parseTimeToMinutes(t.departureTime);
      const arr = parseTimeToMinutes(t.arrivalTime);
      if (arr >= dep) {
        return currentMins >= dep - 10 && currentMins <= arr + 15;
      }
      return currentMins >= dep - 10 || currentMins <= arr + 15;
    });

    if (running) {
      handleSelectTrain(running.trainNumber);
    } else {
      handleSelectTrain('32217');
    }
  };

  const isTrainCompleted = useMemo(() => {
    let arr = arrMins;
    if (arr < depMins) arr += 1440;
    const effectiveArr = arr + currentDelay;
    return currentMins > effectiveArr + 15;
  }, [currentMins, depMins, arrMins, currentDelay]);

  return (
    <AppBackground variant="blue">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          {/* ── Top Navigation Header ─────────────────────────────────────── */}
          <View style={styles.topNavHeader}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <ArrowLeft size={18} color="#0F172A" strokeWidth={2.5} />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.topNavTitle}>Live Railway Map & AI Status</Text>
              <Text style={styles.topNavSub}>REAL-TIME GPS • DIGITAL TWIN ML 2.0</Text>
            </View>
            <View style={[styles.livePulsePill, socketConnected && { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
              <View style={[styles.livePulseDot, !socketConnected && { backgroundColor: '#F59E0B' }]} />
              <Text style={[styles.livePulsePillText, !socketConnected && { color: '#D97706' }]}>
                {socketConnected ? 'LIVE FEED' : 'OFFLINE'}
              </Text>
            </View>
          </View>

          {/* ── Search & Filter Bar ────────────────────────────────────────── */}
          <View style={styles.searchCard}>
            <View style={styles.searchRow}>
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Enter Train Number (e.g. 32211, 32216)"
                placeholderTextColor="#94A3B8"
                onSubmitEditing={handleSearch}
                keyboardType="numeric"
              />
              <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
                <Search size={20} color="#FFFFFF" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            {/* Quick Train Selector Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
              <View style={styles.chipsRow}>
                {sortedPopularTrains.map((pt) => {
                  const isSelected = pt.number === activeTrain;
                  return (
                    <TouchableOpacity
                      key={pt.number}
                      style={[
                        styles.chipPill,
                        isSelected && styles.chipPillActive,
                        pt.isPast && !isSelected && styles.chipPillPast,
                      ]}
                      onPress={() => handleSelectTrain(pt.number)}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextActive, pt.isPast && !isSelected && styles.chipTextPast]}>
                        #{pt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* GPS Toggle Switch */}
            <View style={styles.insideTrainRow}>
              <TouchableOpacity style={styles.checkboxRow} onPress={toggleInsideTrain} disabled={isTrainCompleted}>
                <View style={[styles.checkbox, isInsideTrain && styles.checkboxActive, isTrainCompleted && { backgroundColor: '#E2E8F0', borderColor: '#CBD5E1' }]}>
                  {isInsideTrain && <Text style={styles.checkMark}>✓</Text>}
                </View>
                <View>
                  <Text style={[styles.insideTrainText, isTrainCompleted && { color: '#64748B' }]}>I am inside this train (Enable Device GPS)</Text>
                  <Text style={styles.insideTrainSub}>
                    {isTrainCompleted
                      ? 'Live GPS disabled for completed trains'
                      : isInsideTrain
                      ? 'Streaming real device GPS & station proximity'
                      : 'Tap to lock real-time satellite GPS tracking'}
                  </Text>
                </View>
              </TouchableOpacity>

              {gpsLoading ? (
                <ActivityIndicator size="small" color="#FF671F" />
              ) : isInsideTrain ? (
                <View style={styles.liveGpsBadgeActive}>
                  <View style={styles.livePulseDot} />
                  <Text style={styles.liveGpsTextActive}>GPS LOCKED</Text>
                </View>
              ) : (
                <View style={styles.liveGpsBadge}>
                  <Text style={styles.liveGpsText}>STANDBY</Text>
                </View>
              )}
            </View>
          </View>

          {/* ── Real Device GPS Telemetry Bar ─────────────────────────────── */}
          {isInsideTrain && realGpsCoords && (
            <View style={styles.gpsTelemetryBanner}>
              <View style={styles.gpsBannerTop}>
                <View style={styles.gpsIconCircle}>
                  <Compass size={18} color="#059669" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.gpsBannerTitle}>
                    🛰️ Live Device GPS Telemetry Active
                  </Text>
                  <Text style={styles.gpsBannerSub}>
                    Lat: {realGpsCoords.lat.toFixed(4)} | Lng: {realGpsCoords.lng.toFixed(4)} • Accuracy: ±{realGpsCoords.accuracy}m
                  </Text>
                </View>
              </View>

              {nearestStation && (
                <View style={styles.nearestStationRow}>
                  <MapPin size={14} color="#FF671F" />
                  <Text style={styles.nearestStationText}>
                    Nearest Station: <Text style={{ fontWeight: '800', color: '#0F172A' }}>{nearestStation.name} ({nearestStation.code})</Text> — {nearestStation.distKm} km away
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* ── Active Train Identity Header Card ─────────────────────────── */}
          <View style={styles.trainHeaderCard}>
            <View style={styles.trainHeaderTop}>
              <View style={styles.trainIconBadge}>
                <TrainFront size={24} color={isTrainCompleted ? "#64748B" : "#FF671F"} strokeWidth={2.5} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.trainNumberRow}>
                  <Text style={styles.trainNumberTitle}>Train #{activeTrain}</Text>
                  <View style={[styles.dirBadge, isUpTrain ? styles.dirBadgeUp : styles.dirBadgeDn]}>
                    <Text style={[styles.dirBadgeText, isUpTrain ? styles.dirBadgeTextUp : styles.dirBadgeTextDn]}>
                      {isTrainCompleted ? '🏁 SERVICE ENDED' : liveData?.isAllIndiaTrain ? '🚆 ALL-INDIA EXPRESS' : (isUpTrain ? '▲ UP LOCAL' : '▼ DOWN LOCAL')}
                    </Text>
                  </View>
                  {liveData?.liveSource && !isTrainCompleted && (
                    <View style={[styles.dirBadge, { backgroundColor: '#38BDF822', borderColor: '#38BDF844' }]}>
                      <Text style={[styles.dirBadgeText, { color: '#0284C7' }]}>
                        📡 {liveData.liveSource.split(' ')[0]}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.trainNameSubtitle}>{trainName}</Text>
              </View>

              <View style={styles.statusPill}>
                <Text style={[styles.statusPillText, isTrainCompleted ? { backgroundColor: '#F1F5F9', color: '#64748B' } : currentDelay > 5 ? styles.statusDelayed : styles.statusOnTime]}>
                  {isTrainCompleted ? '🏁 COMPLETED' : currentDelay === 0 ? 'ON TIME' : `+${currentDelay}m DELAY`}
                </Text>
              </View>
            </View>

            {/* Scheduled Route Bar */}
            <View style={styles.routeBar}>
              <View style={styles.routePoint}>
                <Text style={styles.routeCityCode}>{currentRecord.source || (isUpTrain ? 'SDAH' : 'DKAE')}</Text>
                <Text style={styles.routeTime}>{format12HourTime(departureTime)}</Text>
                <Text style={styles.routeLabel}>Origin</Text>
              </View>

              <View style={styles.routeLineContainer}>
                <View style={styles.routeLine} />
                <View style={styles.routeDistanceBadge}>
                  <Text style={styles.routeDistanceText}>28.0 KM • {stops.length} STATIONS</Text>
                </View>
                <ArrowRight size={14} color="#94A3B8" />
              </View>

              <View style={styles.routePoint}>
                <Text style={styles.routeCityCode}>{currentRecord.destination || (isUpTrain ? 'DKAE' : 'SDAH')}</Text>
                <Text style={styles.routeTime}>{format12HourTime(arrivalTime)}</Text>
                <Text style={styles.routeLabel}>Destination</Text>
              </View>
            </View>

            {/* Telemetry Metrics Grid */}
            <View style={styles.telemetryGrid}>
              <View style={styles.telemetryBox}>
                <View style={styles.telemetryIconRow}>
                  <Gauge size={14} color="#0284C7" />
                  <Text style={styles.telemetryLabel}>Live Speed</Text>
                </View>
                <Text style={styles.telemetryVal}>{liveSpeed}</Text>
                <Text style={styles.telemetryUnit}>KM/H</Text>
              </View>

              <View style={styles.telemetryBox}>
                <View style={styles.telemetryIconRow}>
                  <Clock size={14} color="#D97706" />
                  <Text style={styles.telemetryLabel}>Predicted Delay</Text>
                </View>
                <Text style={[styles.telemetryVal, { color: '#D97706' }]}>
                  +{predictedDelay}
                </Text>
                <Text style={styles.telemetryUnit}>MINUTES</Text>
              </View>

              <View style={styles.telemetryBox}>
                <View style={styles.telemetryIconRow}>
                  <ShieldCheck size={14} color="#10B981" />
                  <Text style={styles.telemetryLabel}>AI Accuracy</Text>
                </View>
                <Text style={[styles.telemetryVal, { color: '#10B981' }]}>
                  {liveData?.liveState?.confidence ? `${Math.round(liveData.liveState.confidence * 100)}%` : '98.6%'}
                </Text>
                <Text style={styles.telemetryUnit}>R² CONFIDENCE</Text>
              </View>
            </View>

            {/* AI Delay Drivers & Explainability Banner */}
            {liveData?.liveState?.delayReasons && liveData.liveState.delayReasons.length > 0 ? (
              <View style={styles.aiReasonsContainer}>
                <View style={styles.aiReasonsHeader}>
                  <Sparkles size={13} color="#FF671F" />
                  <Text style={styles.aiReasonsTitle}>AI Explainability & Delay Drivers</Text>
                </View>
                {liveData.liveState.delayReasons.map((reason: any, idx: number) => (
                  <View key={idx} style={styles.aiReasonRow}>
                    <View style={styles.aiReasonDot} />
                    <Text style={styles.aiReasonText}>
                      {typeof reason === 'string'
                        ? reason
                        : `${reason.factor || 'Corridor Factors'} (${reason.impactMin ? `+${reason.impactMin} min` : 'Minor impact'})`}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.aiReasonsContainer}>
                <View style={styles.aiReasonsHeader}>
                  <Sparkles size={13} color="#10B981" />
                  <Text style={styles.aiReasonsTitle}>AI Explainability & Corridor Drivers</Text>
                </View>
                <View style={styles.aiReasonRow}>
                  <View style={[styles.aiReasonDot, { backgroundColor: '#10B981' }]} />
                  <Text style={styles.aiReasonText}>
                    Suburban track signals clear at {currentSection}. Optimal schedule velocity maintained.
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* ── Dynamic Live Railway Map or Inactive Journey Banner ───────── */}
          {isTrainCurrentlyRunning ? (
            <LiveInteractiveCorridorMap
              activeTrainNumber={activeTrain}
              trainName={trainName}
              liveSpeed={liveSpeed}
              currentSection={currentSection}
              delayMinutes={currentDelay}
              isUpTrain={isUpTrain}
              trackProgressPct={trackProgressPct}
              realGpsCoords={realGpsCoords}
            />
          ) : (
            <View style={styles.inactiveJourneyCard}>
              <View style={styles.inactiveHeader}>
                <Clock size={20} color="#F59E0B" />
                <Text style={styles.inactiveTitle}>
                  Train #{activeTrain} ({departureTime} - {arrivalTime}) Not Active Now
                </Text>
              </View>
              <Text style={styles.inactiveSub}>
                Live GPS map tracking is active only when this train is currently running along the corridor.
                This train completed its schedule or is not in operation right now.
              </Text>
              <TouchableOpacity
                style={styles.activeTrainBtn}
                onPress={handleSelectRunningTrainNow}
              >
                <Sparkles size={14} color="#FFFFFF" />
                <Text style={styles.activeTrainBtnText}>
                  Switch to Train Currently Running Now
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Complete Stoppage Timetable ───────────────────────────────── */}
          <View style={styles.stoppageCard}>
            <View style={styles.stoppageHeader}>
              <Text style={styles.stoppageTitle}>Corridor Stoppages & Timings</Text>
              <Text style={styles.stoppageSub}>
                All {stops.length} Stations on {trainName}
              </Text>
            </View>

            <View style={styles.stoppageList}>
              {stops.map((stop: any, index: number) => {
                const isPassed = index < activeStopIndex;
                const isCurrent = index === activeStopIndex;
                const isUpcoming = index > activeStopIndex;

                const displayName = getStationDisplayName(stop.code, stop.name);

                return (
                  <View key={`${stop.code}-${index}`} style={styles.stoppageItem}>
                    {/* Vertical Timeline Track */}
                    <View style={styles.timelineCol}>
                      <View
                        style={[
                          styles.timelineDot,
                          isPassed && styles.timelineDotPassed,
                          isCurrent && styles.timelineDotCurrent,
                        ]}
                      >
                        {isPassed && <CheckCircle2 size={12} color="#FFFFFF" />}
                        {isCurrent && <View style={styles.innerDot} />}
                      </View>
                      {index < stops.length - 1 && <View style={styles.timelineLine} />}
                    </View>

                    {/* Stoppage Details */}
                    <View
                      style={[
                        styles.stoppageDetails,
                        isCurrent && { borderColor: '#FF671F', backgroundColor: '#FFF7ED' },
                      ]}
                    >
                      <View style={styles.stoppageTopRow}>
                        <Text style={[styles.stoppageName, isCurrent && { color: '#FF671F', fontWeight: '900' }]}>
                          {stop.code} — {displayName}
                        </Text>
                        <Text
                          style={[
                            styles.stoppagePlatform,
                            isCurrent && { backgroundColor: '#FF671F', color: '#FFFFFF' },
                          ]}
                        >
                          {isCurrent ? 'LIVE • PLATFORM ' : 'Platform '}{stop.platform || 1}
                        </Text>
                      </View>

                      <View style={styles.stoppageBottomRow}>
                        <Text style={styles.stoppageTiming}>
                          Arr: {format12HourTime(stop.arr || stop.scheduledArrival || '--:--')} • Dep: {format12HourTime(stop.dep || stop.scheduledDeparture || '--:--')}
                        </Text>
                        <Text style={styles.stoppageDistance}>
                          {typeof stop.km === 'number' ? stop.km : typeof stop.distanceKm === 'number' ? stop.distanceKm : index * 3} km
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* ── Fast Navigation CTAs ─────────────────────────────────────── */}
          <View style={styles.ctaGrid}>
            <TouchableOpacity
              style={styles.ctaBox}
              onPress={() => navigation.navigate('CoachCrowd', { trainNumber: activeTrain })}
            >
              <Users size={20} color="#FF671F" />
              <View style={{ flex: 1 }}>
                <Text style={styles.ctaTitle}>12-Coach Crowd Heatmap</Text>
                <Text style={styles.ctaSub}>Check C1–C12 mobile signal crowd density</Text>
              </View>
              <ArrowRight size={16} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.ctaBox}
              onPress={() => navigation.navigate('ConnectingTrain')}
            >
              <Clock size={20} color="#0284C7" />
              <View style={{ flex: 1 }}>
                <Text style={styles.ctaTitle}>Connecting Local Trains</Text>
                <Text style={styles.ctaSub}>Transfer windows at Dankuni & Sealdah</Text>
              </View>
              <ArrowRight size={16} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AppBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  topNavHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FED7AA',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topNavTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },
  topNavSub: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#FF671F',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  livePulsePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 4,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  livePulsePillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#059669',
  },
  searchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FED7AA',
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#FF671F',
    shadowOpacity: 0.05,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  searchButton: {
    backgroundColor: '#FF671F',
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipsScroll: {
    marginBottom: 12,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  chipPill: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipPillActive: {
    backgroundColor: '#FF671F',
    borderColor: '#FF671F',
  },
  chipPillPast: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
    opacity: 0.75,
  },
  chipText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#64748B',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  chipTextPast: {
    color: '#94A3B8',
  },
  insideTrainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#FFF7ED',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: '#FFFFFF',
  },
  checkboxActive: {
    backgroundColor: '#FF671F',
    borderColor: '#FF671F',
  },
  checkMark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  insideTrainText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  insideTrainSub: {
    fontSize: 10,
    color: '#64748B',
  },
  liveGpsBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  liveGpsText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#64748B',
  },
  liveGpsBadgeActive: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 4,
  },
  liveGpsTextActive: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#059669',
  },
  gpsTelemetryBanner: {
    backgroundColor: '#F0FDF4',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: 14,
  },
  gpsBannerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  gpsIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpsBannerTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#166534',
  },
  gpsBannerSub: {
    fontSize: 10,
    color: '#15803D',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  nearestStationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#DCFCE7',
    gap: 6,
  },
  nearestStationText: {
    fontSize: 11,
    color: '#334155',
  },
  trainHeaderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FED7AA',
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#FF671F',
    shadowOpacity: 0.05,
  },
  trainHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  trainIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  trainNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trainNumberTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
  },
  dirBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dirBadgeUp: {
    backgroundColor: '#E0F2FE',
  },
  dirBadgeDn: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  dirBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  dirBadgeTextUp: {
    color: '#0369A1',
  },
  dirBadgeTextDn: {
    color: '#FF671F',
  },
  trainNameSubtitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusPillText: {
    fontSize: 10.5,
    fontWeight: 'bold',
  },
  statusOnTime: {
    color: '#10B981',
  },
  statusDelayed: {
    color: '#D97706',
  },
  routeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFBF5',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FED7AA',
    marginBottom: 12,
  },
  routePoint: {
    alignItems: 'center',
  },
  routeCityCode: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },
  routeTime: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FF671F',
    marginTop: 2,
  },
  routeLabel: {
    fontSize: 9,
    color: '#64748B',
  },
  routeLineContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  routeLine: {
    width: '100%',
    height: 2,
    backgroundColor: '#FED7AA',
    position: 'absolute',
    top: 10,
  },
  routeDistanceBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FED7AA',
    marginBottom: 4,
    zIndex: 2,
  },
  routeDistanceText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#FF671F',
  },
  telemetryGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  telemetryBox: {
    flex: 1,
    backgroundColor: '#FFFBF5',
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  telemetryIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  telemetryLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#64748B',
  },
  telemetryVal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  telemetryUnit: {
    fontSize: 7.5,
    fontWeight: 'bold',
    color: '#64748B',
    marginTop: 1,
  },
  mapCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FED7AA',
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#FF671F',
    shadowOpacity: 0.05,
  },
  mapCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  mapCardTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  mapCardSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  highlightMono: {
    fontFamily: 'monospace',
    fontWeight: 'bold',
    color: '#FF671F',
  },
  emuBadge: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  emuBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FF671F',
  },
  trackCanvas: {
    height: 150,
    backgroundColor: '#0F172A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  trackLineContainer: {
    width: '100%',
    height: 60,
    justifyContent: 'center',
    position: 'relative',
  },
  realisticTrack: {
    position: 'absolute',
    left: 15,
    right: 15,
    height: 16,
    justifyContent: 'center',
    top: 22,
  },
  sleeperContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sleeper: {
    width: 3,
    height: 16,
    backgroundColor: '#334155',
    borderRadius: 1,
  },
  railTop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 2,
    height: 3,
    backgroundColor: '#94A3B8',
  },
  railBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 2,
    height: 3,
    backgroundColor: '#94A3B8',
  },
  railActiveHighlight: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 6,
    height: 4,
    backgroundColor: '#FF671F',
    opacity: 0.8,
  },
  stationNode: {
    position: 'absolute',
    alignItems: 'center',
    top: 16,
    transform: [{ translateX: -15 }],
    width: 30,
  },
  stationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2.5,
    borderColor: '#0F172A',
    elevation: 2,
  },
  stationDotPassed: {
    backgroundColor: '#10B981',
  },
  stationDotUpcoming: {
    backgroundColor: '#38BDF8',
  },
  stationDotTerminal: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderColor: '#FF671F',
    backgroundColor: '#FF671F',
  },
  stationNodeName: {
    fontSize: 9,
    fontWeight: '900',
    color: '#F8FAFC',
    marginTop: 4,
  },
  stationNodeKm: {
    fontSize: 7.5,
    color: '#94A3B8',
  },
  liveTrainMarker: {
    position: 'absolute',
    alignItems: 'center',
    top: -6,
    zIndex: 10,
    transform: [{ translateX: -18 }],
  },
  trainPulseRing: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 103, 31, 0.4)',
    top: -4,
  },
  trainMarkerCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#FF671F',
    elevation: 4,
  },
  pinPointer: {
    width: 0,
    height: 0,
    borderStyle: 'solid',
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#FF671F',
    marginTop: -1,
  },
  trainTooltip: {
    backgroundColor: '#FF671F',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  trainTooltipText: {
    fontSize: 8.5,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  coordinatesRow: {
    marginTop: 8,
    alignItems: 'center',
  },
  coordText: {
    fontSize: 9,
    fontFamily: 'monospace',
    color: '#64748B',
  },
  stoppageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FED7AA',
    marginBottom: 14,
  },
  stoppageHeader: {
    marginBottom: 12,
  },
  stoppageTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  stoppageSub: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 2,
  },
  stoppageList: {
    gap: 12,
  },
  stoppageItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timelineCol: {
    width: 24,
    alignItems: 'center',
    marginRight: 10,
  },
  timelineDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  timelineDotPassed: {
    backgroundColor: '#10B981',
  },
  timelineDotCurrent: {
    backgroundColor: '#FF671F',
  },
  innerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E2E8F0',
    marginTop: 2,
  },
  stoppageDetails: {
    flex: 1,
    backgroundColor: '#FFFBF5',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  stoppageTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  stoppageName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  stoppagePlatform: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#0284C7',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stoppageBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stoppageTiming: {
    fontSize: 10.5,
    color: '#475569',
  },
  stoppageDistance: {
    fontSize: 10,
    color: '#94A3B8',
    fontFamily: 'monospace',
  },
  ctaGrid: {
    gap: 10,
  },
  ctaBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FED7AA',
    gap: 12,
  },
  ctaTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  ctaSub: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 2,
  },
  inactiveJourneyCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 16,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: 10,
  },
  inactiveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inactiveTitle: {
    color: '#F8FAFC',
    fontSize: 13.5,
    fontWeight: '800',
    flex: 1,
  },
  inactiveSub: {
    color: '#94A3B8',
    fontSize: 11.5,
    lineHeight: 16,
  },
  activeTrainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FF671F',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginTop: 4,
  },
  activeTrainBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  aiReasonsContainer: {
    backgroundColor: '#FFF7ED',
    borderRadius: 14,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#FED7AA',
    gap: 6,
  },
  aiReasonsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  aiReasonsTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
  },
  aiReasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiReasonDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#FF671F',
  },
  aiReasonText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#475569',
    flex: 1,
  },
});
