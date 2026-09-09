import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { Train, Station, CatchTrainResult, AlertItem } from '../types';

export const getHostAddress = () => {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest2?.extra?.expoClient?.hostUri ||
    (Constants as any).manifest?.debuggerHost;

  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return `http://${ip}:5000/api`;
    }
  }
  return Platform.OS === 'web' ? 'http://localhost:5000/api' : 'http://192.168.0.101:5000/api';
};

export const API_BASE_URL = getHostAddress();

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 3500,
});

// Lightweight cache to avoid duplicate API requests during screen transitions
const apiCache = new Map<string, { data: any; expiry: number }>();

export const getCachedOrFetch = async <T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> => {
  const cached = apiCache.get(key);
  const now = Date.now();
  if (cached && cached.expiry > now) {
    return cached.data as T;
  }
  const data = await fetcher();
  apiCache.set(key, { data, expiry: now + ttlMs });
  return data;
};

import rawSuburbanTrains from '../data/suburban_trains.json';

// Fallback Seed Data for 100% Guaranteed Offline Demo Mode — Powered by real Dankuni-Sealdah dataset
const fallbackTrains: Train[] = rawSuburbanTrains as unknown as Train[];

const fallbackStations: Station[] = [
  { code: 'SDAH', name: 'Sealdah', city: 'Kolkata', state: 'West Bengal', zone: 'ER', lat: 22.5675, lng: 88.3712, platforms: 21, isJunction: true },
  { code: 'BNXR', name: 'Bidhan Nagar Road', city: 'Kolkata', state: 'West Bengal', zone: 'ER', lat: 22.5898, lng: 88.3892, platforms: 4, isJunction: false },
  { code: 'DDJ', name: 'Dum Dum Junction', city: 'Kolkata', state: 'West Bengal', zone: 'ER', lat: 22.6219, lng: 88.3931, platforms: 5, isJunction: true },
  { code: 'BARN', name: 'Baranagar Road', city: 'Kolkata', state: 'West Bengal', zone: 'ER', lat: 22.6392, lng: 88.3732, platforms: 2, isJunction: false },
  { code: 'DAKE', name: 'Dakshineswar', city: 'Kolkata', state: 'West Bengal', zone: 'ER', lat: 22.6534, lng: 88.3601, platforms: 4, isJunction: false },
  { code: 'DKAE', name: 'Dankuni Junction', city: 'Hooghly', state: 'West Bengal', zone: 'ER', lat: 22.6872, lng: 88.2934, platforms: 5, isJunction: true },
];

export const searchTrainsApi = async (from: string, to: string): Promise<Train[]> => {
  try {
    const res = await api.get(`/trains?from=${from}&to=${to}`);
    if (res.data?.trains?.length > 0) return res.data.trains;
  } catch (err) {
    console.warn('[API] Using offline train search data');
  }
  const f = from.toUpperCase().trim();
  const t = to.toUpperCase().trim();
  const matched = fallbackTrains.filter(train => {
    const sFrom = train.stops.find(s => s.code === f || train.source === f);
    const sTo = train.stops.find(s => s.code === t || train.destination === t);
    return sFrom && sTo && sFrom.sequence < sTo.sequence;
  });
  return matched.length > 0 ? matched : fallbackTrains;
};

export const getTrainByNumberApi = async (trainNumber: string): Promise<Train> => {
  try {
    const res = await api.get(`/trains/${trainNumber}`);
    if (res.data?.train) return res.data.train;
  } catch (err) {
    console.warn('[API] Using offline train detail');
  }
  return fallbackTrains.find(t => t.trainNumber === trainNumber) || fallbackTrains[0];
};

export const getLiveTrainApi = async (trainNumber: string) => {
  try {
    const res = await api.get(`/trains/${trainNumber}/live`);
    if (res.data) return res.data;
  } catch (err) {
    console.warn('[API] Using offline live train');
  }
  const train = fallbackTrains.find(t => t.trainNumber === trainNumber) || fallbackTrains[0];
  return {
    trainNumber: train.trainNumber,
    name: train.name,
    liveState: train.liveState,
    stops: train.stops,
  };
};

export const calculateCatchProbabilityApi = async (params: {
  trainNumber: string;
  roadDistanceKm: number;
  trafficCondition: string;
  stationEntryBufferMin: number;
}): Promise<CatchTrainResult> => {
  try {
    const res = await api.post('/catch-probability', params);
    if (res.data?.data) return res.data.data;
  } catch (err) {
    console.warn('[API] Using offline catch probability calculation');
  }
  
  const dist = params.roadDistanceKm || 5;
  const trafficMult = params.trafficCondition === 'LOW' ? 1.0 : params.trafficCondition === 'MODERATE' ? 1.3 : params.trafficCondition === 'HEAVY' ? 1.8 : 2.2;
  const roadTime = Math.round((dist / 30) * 60 * trafficMult);
  const stationBuffer = params.stationEntryBufferMin || 5;
  const reqTime = roadTime + stationBuffer + 3;
  const availTime = Math.round(dist * 3.0 + 6);
  const margin = availTime - reqTime;

  let pct = 92;
  let statusRisk: 'LOW_RISK' | 'MODERATE_RISK' | 'HIGH_RISK' | 'CRITICAL' = 'LOW_RISK';
  let rec = '🟢 High probability you can catch your train. Leave now.';

  if (margin >= 8) {
    pct = 92;
    statusRisk = 'LOW_RISK';
    rec = '🟢 High probability you can catch your train. Leave now.';
  } else if (margin >= 0) {
    pct = 68;
    statusRisk = 'MODERATE_RISK';
    rec = '🟡 Tight schedule. Start immediately towards station.';
  } else {
    pct = 22;
    statusRisk = 'CRITICAL';
    rec = '🔴 You may miss this train. Recommended: Take next Dankuni Local (#32218).';
  }

  const tNum = params.trainNumber || '32216';
  const foundTrain = fallbackTrains.find(t => t.trainNumber === tNum) || fallbackTrains[0];

  return {
    trainNumber: foundTrain.trainNumber,
    trainName: foundTrain.name,
    predictedDeparture: foundTrain.departureTime,
    roadTravelMinutes: roadTime,
    stationEntryBufferMinutes: stationBuffer,
    requiredMinutes: reqTime,
    availableMinutes: availTime,
    catchProbabilityPct: pct,
    statusRisk,
    recommendation: rec,
    alternativeTrain: pct < 50 ? {
      trainNumber: '32218',
      name: 'Dankuni - Sealdah Local',
      departureTime: '07:00'
    } : undefined,
    breakdown: {
      roadTime,
      stationBuffer,
      safetyMargin: 3,
      trafficDelay: Math.round(roadTime * 0.25),
      delayProbability: 0.12
    }
  };
};

export const getStationArrivalsApi = async (stationCode: string) => {
  try {
    const res = await api.get(`/stations/${stationCode}/arrivals`);
    if (res.data) return res.data;
  } catch (err) {
    console.warn('[API] Using offline station arrivals');
  }
  // STRICT DATASET ONLY — no hardcoded arrivals returned when backend is unavailable
  return {
    station: { code: stationCode, name: `${stationCode} Station`, platforms: 10 },
    arrivals: []
  };
};

export const getCoachCrowdApi = async (trainNumber: string) => {
  try {
    const res = await api.get(`/crowd/train/${trainNumber}`);
    if (res.data?.coachCrowd) return res.data.coachCrowd;
  } catch (err) {}
  return {
    coaches: [
      { coach: 'C1', density: 32, status: 'GREEN' },
      { coach: 'C2', density: 45, status: 'GREEN' },
      { coach: 'C3', density: 22, status: 'GREEN' },
      { coach: 'C4', density: 68, status: 'YELLOW' },
      { coach: 'C5', density: 78, status: 'YELLOW' },
      { coach: 'C6', density: 88, status: 'RED' },
      { coach: 'C7', density: 55, status: 'YELLOW' },
      { coach: 'C8', density: 30, status: 'GREEN' },
      { coach: 'C9', density: 25, status: 'GREEN' },
      { coach: 'C10', density: 42, status: 'GREEN' },
      { coach: 'C11', density: 28, status: 'GREEN' },
      { coach: 'C12', density: 36, status: 'GREEN' },
    ],
    recommendedCoach: 'C3',
    reason: 'Lowest estimated crowd density (22% load) via mobile signal density.'
  };
};

export const getWeatherApi = async () => {
  // 1. Prioritize Secure Backend Proxy
  try {
    const res = await api.get('/weather');
    if (res.data?.weather) return res.data.weather;
  } catch (err) {}

  // 2. Direct OpenWeatherMap fallback if key is configured in environment
  const apiKey = process.env.EXPO_PUBLIC_WEATHER_API_KEY;
  if (apiKey) {
    try {
      const fetchCityWeather = async (city: string) => {
        const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`);
        const data = await res.json();
        if (data.cod && data.cod !== 200) {
          throw new Error(data.message || 'API error');
        }
        return data;
      };

      const [sdahData, dkaeData] = await Promise.all([
        fetchCityWeather('Kolkata'),
        fetchCityWeather('Dankuni')
      ]);

      const formatWeather = (data: any, name: string) => ({
        city: name,
        tempC: Math.round(data.main?.temp || 0),
        condition: data.weather?.[0]?.main || 'Clear',
        rainMm: data.rain?.['1h'] || data.rain?.['3h'] || 0,
        windKmh: Math.round((data.wind?.speed || 0) * 3.6),
        humidityPct: data.main?.humidity || 0,
        visibilityKm: (data.visibility || 10000) / 1000,
        railImpact: (data.rain?.['1h'] || 0) > 5 ? 'Precautionary speed restriction: +2 to +4 min delay.' : 'Optimal corridor running conditions.'
      });

      return {
        SDAH: formatWeather(sdahData, 'Sealdah (Kolkata)'),
        DKAE: formatWeather(dkaeData, 'Dankuni')
      };
    } catch (err) {
      console.warn('Live weather direct fetch error, falling back to cached model:', err);
    }
  }

  // 3. Deterministic corridor fallback
  return {
    SDAH: { city: 'Sealdah (Kolkata)', tempC: 31, condition: 'Heavy Rain', rainMm: 42.5, windKmh: 28, humidityPct: 88, visibilityKm: 3.5, railImpact: 'Precautionary speed restriction: +2 to +4 min delay.' },
    DKAE: { city: 'Dankuni', tempC: 30, condition: 'Moderate Rain', rainMm: 18.0, windKmh: 20, humidityPct: 82, visibilityKm: 5.0, railImpact: 'Optimal corridor running conditions.' }
  };
};

export const getAlertsApi = async (): Promise<AlertItem[]> => {
  return getCachedOrFetch('alerts', 10000, async () => {
    try {
      const res = await api.get('/admin/alerts');
      if (res.data?.alerts) return res.data.alerts;
    } catch (err) {}
    return [
      {
        id: 'ALT-001',
        title: 'Track Anomaly Detected on Section B-17',
        category: 'TRACK_ANOMALY',
        severity: 'HIGH_RISK',
        affectedTrain: '32216',
        description: 'ESP32 MPU6050 vibration RMS measured 3.42g on Dankuni chord (Threshold 2.4g). Deterioration risk 78/100.',
        recommendedAction: 'Impose 30 km/h caution order.',
        timestamp: '10 min ago',
        active: true
      }
    ];
  });
};

/**
 * Fetches verified real-time Indian Railways facts & data from the web (Wikipedia Train API & Open Search).
 */
export const fetchWebTrainData = async (query: string): Promise<string> => {
  try {
    const matchNumber = query.match(/\b\d{5}\b/);
    const searchTerm = matchNumber ? `${matchNumber[0]} train` : `${query} train Indian Railways`;

    const wikiSearchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchTerm)}&format=json&origin=*`;
    const res = await fetch(wikiSearchUrl, { headers: { 'User-Agent': 'RailSathiApp/1.0 (contact@railio.ai)' } });
    if (!res.ok) return '';
    const data = await res.json();
    const results = data.query?.search;
    if (results && results.length > 0) {
      let matchedTitle = results[0].title;
      if (matchNumber) {
        const found = results.find((r: any) => r.snippet?.includes(matchNumber[0]) || r.title?.includes(matchNumber[0]));
        if (found) matchedTitle = found.title;
      }
      const sumUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(matchedTitle)}`;
      const sumRes = await fetch(sumUrl, { headers: { 'User-Agent': 'RailSathiApp/1.0 (contact@railio.ai)' } });
      if (sumRes.ok) {
        const sumData = await sumRes.json();
        return sumData.extract || '';
      }
    }
  } catch (err) {
    console.warn('[AI] Web train data fetch error:', err);
  }
  return '';
};

export const chatAIApi = async (query: string, history: any[] = []) => {
  const cleanQuery = query.replace(/["'']/g, '').trim();
  const lowerQuery = cleanQuery.toLowerCase();

  // ── 1. FAST PATH: Multilingual Greeting Detection (Instant Response) ──
  const greetings = ['hi','hello','hey','namaste','namaskar','সালাম','হ্যালো','নমস্কার','নমস্তে', 'ki obostha', 'kemon acho', 'how are you'];
  if (greetings.includes(lowerQuery)) {
    return {
      answer: "Hello! How are you? Welcome to Railio 🚆 Your smart railway assistant. How can I help you with your journey today?",
      toolsExecuted: [],
      confidence: 1.0
    };
  }

  // ── 2. INTENT ROUTING: Train Query (ML Backend) vs Conversational ──
  const railwayKeywords = [
    'train', 'local', 'express', 'ticket', 'pnr', 'station', 'platform', 'delay', 'status', 'route', 'time', 'now',
    'sealdah', 'howrah', 'dankuni', 'bandel', 'barddhaman', 'naihati', 'dum dum', 'dake', 'barasat', 'bangaon',
    'theke', 'jabo', 'jete', 'somoy', 'tarikh', 'kothay', 'sokale', 'bikele', 'raat', 'agamikal', 'kakhon',
    'kalke', 'kal', 'kaal', 'aaj', 'aajke', 'today', 'tomorrow',
    'থেকে', 'যাব', 'যেতে', 'সময়', 'তারিখ', 'কোথায়', 'সকালে', 'বিকেলে', 'রাতে', 'আগামীকাল', 'কখন', 'কালকে', 'কাল',
    'से', 'जाना', 'समय', 'तारीख', 'कहाँ', 'सुबह', 'शाम', 'रात', 'कल', 'कब'
  ];
  const hasRailwayIntent = railwayKeywords.some(kw => lowerQuery.includes(kw)) || /\b\d{1,2}:\d{2}\b/.test(lowerQuery) || /\b\d{5}\b/.test(lowerQuery)
    || /\b\d{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(cleanQuery)
    || /\b\d{1,2}[\/\-]\d{1,2}\b/.test(cleanQuery);


  // If it's a Train Query, try the primary ML Backend first
  if (hasRailwayIntent) {
    try {
      const res = await api.post('/ai/chat', {
        message: cleanQuery,
        session_id: 'mobile_client_session',
        client_timestamp: new Date().toISOString(),
        history
      }, { timeout: 15000 });
      if (res.data?.success && res.data?.data?.answer) {
        let cleanAnswer = res.data.data.answer;
        cleanAnswer = cleanAnswer.replace(/User Safety:.*?\n?/gi, '');
        cleanAnswer = cleanAnswer.replace(/Response Safety:.*?\n?/gi, '');
        cleanAnswer = cleanAnswer.replace(/safety status:.*?\n?/gi, '');
        cleanAnswer = cleanAnswer.trim();
        return {
          answer: cleanAnswer,
          toolsExecuted: res.data.data.toolsExecuted || [],
          confidence: res.data.data.confidence || 0.95
        };
      }
    } catch (err) {
      console.warn('Backend ML offline, falling through to local offline fallback');
    }
  }

  // ── 3. STRICT LOCAL DATASET FALLBACK (NO OPENROUTER / NO GEMINI AI) ──
  const hasBengaliScript = /[\u0980-\u09FF]/.test(cleanQuery);
  const hasDevanagari    = /[\u0900-\u097F]/.test(cleanQuery);
  const hasLatin         = /[a-zA-Z]/.test(cleanQuery);
  const banglishSignals  = ['theke','jabo','jete','ami','amar','apnar','chai','kothay','kono',
                             'somoy','tarikh','sokale','bikele','raat','agamikal','lagbe','ache'];
  const hasBanglish      = banglishSignals.some(w => lowerQuery.includes(w));

  type LangStyle = 'en'|'bn'|'hi'|'banglish'|'mixed';
  let style: LangStyle = 'en';
  if (hasBengaliScript && hasLatin) style = 'mixed';
  else if (hasDevanagari)           style = 'hi';
  else if (hasBengaliScript)        style = 'bn';
  else if (hasBanglish)             style = 'banglish';

  const STATION_ALIASES: Record<string,string> = {
    'কলকাতা':'Kolkata','calcutta':'Kolkata','kolkatha':'Kolkata','kolkota':'Kolkata',
    'দিল্লি':'Delhi','দিল্লী':'Delhi','new delhi':'Delhi','dilli':'Delhi','dilhi':'Delhi',
    'শিয়ালদা':'Sealdah','শিয়ালদহ':'Sealdah','sealda':'Sealdah','sealdah':'Sealdah',
    'ডানকুনি':'Dankuni','dankuni':'Dankuni','dankun':'Dankuni',
    'হাওড়া':'Howrah','howrah':'Howrah','howra':'Howrah',
    'ব্যান্ডেল':'Bandel','bandel':'Bandel',
  };
  const normalizeStation = (s: string): string => {
    const lo = s.toLowerCase().trim().replace(/["'']/g, '');
    for (const [alias, canon] of Object.entries(STATION_ALIASES)) {
      if (lo === alias.toLowerCase()) return canon;
    }
    return s.trim().charAt(0).toUpperCase() + s.trim().slice(1).toLowerCase();
  };

  const TMPL: Record<string, Record<LangStyle,string>> = {
    ROUTE: {
      en:        "No problem 🚆 Where would you like to travel from and to?",
      bn:        "অবশ্যই 🚆 কোথা থেকে কোথায় যেতে চান?",
      hi:        "ज़रूर 🚆 आप कहाँ से कहाँ जाना चाहते हैं?",
      banglish:  "Sure 🚆 Kothay theke kothay jete chao?",
      mixed:     "অবশ্যই 🚆 কোথা থেকে কোথায় যেতে চান?",
    },
    DATE: {
      en:        "Got it. What date would you like to travel?",
      bn:        "ঠিক আছে। কোন তারিখে যেতে চান?",
      hi:        "ठीक है। आप किस तारीख को यात्रा करना चाहते हैं?",
      banglish:  "Okay 🚆 Kono tarikhey jete chao?",
      mixed:     "ঠিক আছে। কোন date-এ যেতে চান?",
    },
    DEPTIME: {
      en:        "What time would you prefer to leave?",
      bn:        "কখনের দিকে রওনা দিতে চান?",
      hi:        "आप कितने बजे निकलना चाहते हैं?",
      banglish:  "Kakhon rowana dite chao?",
      mixed:     "কখন রওনা দিতে চান?",
    },
    DEADLINE: {
      en:        "Do you need to reach your destination by a specific time?",
      bn:        "কোন সময়ের মধ্যে পৌঁছাতে চান?",
      hi:        "आपको किस समय तक पहुँचना है?",
      banglish:  "Koto tar modhye pouchate hobe?",
      mixed:     "কত টার মধ্যে পৌঁছাতে চান?",
    },
  };
  const t = (key: string) => TMPL[key][style] ?? TMPL[key]['en'];

  // ── Parse all text history + current query for persistent offline context ──
  const historyText = history.map((m: any) => m.text).join(' ');
  const combinedText = `${historyText} ${cleanQuery}`.replace(/["'']/g, '');
  const combinedLower = combinedText.toLowerCase();

  // ── Multilingual Route Extraction ──
  let origin = '';
  let destination = '';
  const skipWords = new Set(['find','need','train','want','search','know','number','dont',
                              'go','the','a','hi','hello','from','ami','amar','mujhe','mujhko',
                              'kono','kothay','jao','lagbe','chahiye','local']);

  // Pattern A: "X theke/থেকে/সে Y"
  const patA = combinedText.match(/([\w\u0980-\u09FF]+)\s+(?:theke|থেকে|সে)\s+([\w\u0980-\u09FF]+)/i);
  // Pattern B: "X to/jabo/jete/যাব Y"
  const patB = combinedText.match(/(?:from\s+)?([\w\u0980-\u09FF]+)\s+(?:to|jabo|jete\s*(?:chai)?|->|⇄)\s+([\w\u0980-\u09FF]+)/i);
  // Pattern C: Bengali script "X থেকে Y"
  const patC = combinedText.match(/([\u0980-\u09FF\w]+)\s+থেকে\s+([\u0980-\u09FF\w]+)/);
  // Pattern D: Hindi Devanagari "X से Y"
  const patD = combinedText.match(/([\u0900-\u097F\w]+)\s+से\s+([\u0900-\u097F\w]+)/);

  for (const pat of [patA, patC, patD, patB]) {
    if (pat && !origin) {
      const g1 = (pat[1] || '').trim();
      const g2 = (pat[2] || '').trim();
      if (!skipWords.has(g1.toLowerCase()) && !skipWords.has(g2.toLowerCase())) {
        origin      = normalizeStation(g1);
        destination = normalizeStation(g2);
        break;
      }
    }
  }

  // Pattern F: Dataset Station Scanner fallback
  if (!origin || !destination) {
    const tokens = combinedText.split(/[\s,]+/);
    const knownStations = ['sealdah', 'dankuni', 'howrah', 'bandel', 'barddhaman', 'naihati', 'dum dum'];
    const found: string[] = [];
    for (const tok of tokens) {
      const cleanTok = tok.trim().toLowerCase();
      if (knownStations.includes(cleanTok) && !found.includes(cleanTok)) {
        found.push(cleanTok);
      }
    }
    if (found.length >= 2) {
      // Check if found[1] was followed by 'theke'
      const st1isFrom = new RegExp(`${found[0]}\\s+(?:theke|থেকে|from)`, 'i').test(combinedText);
      const st2isFrom = new RegExp(`${found[1]}\\s+(?:theke|থেকে|from)`, 'i').test(combinedText);
      if (st2isFrom && !st1isFrom) {
        origin = normalizeStation(found[1]);
        destination = normalizeStation(found[0]);
      } else {
        origin = normalizeStation(found[0]);
        destination = normalizeStation(found[1]);
      }
    }
  }


  // ── Multilingual Date Extraction ──
  let travelDate = '';
  const tomorrowWords = ['tomorrow','agamikal','agami kal','kalke','kal','kaal','আগামীকাল','আগামী কাল','কালকে','কাল','कल'];
  const todayWords    = ['today','aaj','aajke','aj','আজ','আজকে','আজই','आज'];
  if (tomorrowWords.some(w => combinedLower.includes(w))) travelDate = 'Tomorrow';
  else if (todayWords.some(w => combinedLower.includes(w)))    travelDate = 'Today';
  else if (combinedLower.includes('next monday') || combinedLower.includes('porer sombar')) travelDate = 'Next Monday';
  // Explicit date: "10th september", "10 sep", "10/9"
  else if (/\b\d{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(combinedText) ||
           /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{1,2}/i.test(combinedText) ||
           /\b\d{1,2}[\/\-]\d{1,2}\b/.test(combinedText)) {
    travelDate = combinedText.trim();
  }


  // Extract Departure Time
  let depTime = '';
  const morningWords   = ['morning','sokale','sakal','সকালে','সকাল','subah','सुबह','bhor'];
  const afternoonWords = ['afternoon','bikele','bikel','বিকেলে','বিকেল','dopahar','दोपहर'];
  const eveningWords   = ['evening','night','rate','raat','রাতে','রাত','সন্ধ্যায়','shaam','रात','शाम'];
  if (morningWords.some(w => combinedLower.includes(w)) || combinedLower.includes('8 am'))
    depTime = 'Morning (08:00 AM - 12:00 PM)';
  else if (afternoonWords.some(w => combinedLower.includes(w)))
    depTime = 'Afternoon (12:00 PM - 05:00 PM)';
  else if (eveningWords.some(w => combinedLower.includes(w)))
    depTime = 'Evening/Night (05:00 PM - 11:00 PM)';

  // ── Multilingual Arrival Deadline Extraction ──
  let deadline = '';
  // "before 10 pm", "by 10 pm"
  const dlEn   = combinedLower.match(/(?:before|by)\s+(\d{1,2})\s*(am|pm)/i);
  // Banglish: "10 tar modhye / 10 tar age"
  const dlBn   = combinedLower.match(/(\d{1,2})\s*(?:tar|টার)\s*(?:modhye|মধ্যে|age|আগে)/i);
  // Hindi: "10 baje tak"
  const dlHi   = combinedLower.match(/(\d{1,2})\s*(?:baje\s*tak|बजे\s*तक)/i);
  // Plain "10 pm"
  const dlPlain = combinedLower.match(/\b(\d{1,2})\s*(am|pm)\b/i);
  if (dlEn)    deadline = `${dlEn[1]} ${dlEn[2].toUpperCase()}`;
  else if (dlBn)    deadline = `${dlBn[1]} PM`;
  else if (dlHi)    deadline = `${dlHi[1]} PM`;
  else if (dlPlain) deadline = `${dlPlain[1]} ${dlPlain[2].toUpperCase()}`;
  else if (combinedLower.includes('22:00')) deadline = '10 PM';

  // ── Missing Field Prompts (multilingual, per-turn style) ──
  if (!origin || !destination) {
    return {
      answer: t('ROUTE'),
      toolsExecuted: [{ tool: 'OfflineRailwayAssistant', status: 'SUCCESS' }],
      confidence: 0.90
    };
  }

  if (!travelDate) {
    return {
      answer: t('DATE'),
      toolsExecuted: [{ tool: 'OfflineRailwayAssistant', status: 'SUCCESS' }],
      confidence: 0.90
    };
  }

  if (!depTime) {
    return {
      answer: t('DEPTIME'),
      toolsExecuted: [{ tool: 'OfflineRailwayAssistant', status: 'SUCCESS' }],
      confidence: 0.90
    };
  }

  // Ask deadline only once (check if we just replied with dep-time prompt)
  const askedDepTime = history.some((m: any) =>
    ['what time would you prefer','kakhon rowana','kखनके बजे','কখনের মধ্যে','কখন রওনা']
      .some(sig => (m.text || '').toLowerCase().includes(sig.toLowerCase()))
  );
  if (!deadline && askedDepTime) {
    return {
      answer: t('DEADLINE'),
      toolsExecuted: [{ tool: 'OfflineRailwayAssistant', status: 'SUCCESS' }],
      confidence: 0.90
    };
  }

  // ── All fields collected → Multilingual Result ──
  const deadlineStr = deadline || '10 PM';

  const resultHeaders: Record<LangStyle, string> = {
    en:       `🚆 I found 3 suitable trains for your journey from ${origin} to ${destination}.`,
    bn:       `🚆 আপনার ${origin} থেকে ${destination} যাত্রার জন্য 3টি suitable train পেয়েছি।`,
    hi:       `🚆 ${origin} से ${destination} के लिए 3 trains मिलीं।`,
    banglish: `🚆 Apnar ${origin} theke ${destination} journey-er jonno 3ta train paisi.`,
    mixed:    `🚆 আপনার ${origin} থেকে ${destination} এর জন্য 3টি train পেয়েছি।`,
  };
  const dlLine = (meets: boolean): string => {
    const m: Record<LangStyle,string> = {
      en:       meets ? `✅ Likely to reach before your ${deadlineStr} deadline.` : `⚠️ May miss your deadline.`,
      bn:       meets ? `✅ ${deadlineStr}-এর মধ্যে পৌঁছানোর সম্ভাবনা আছে।`       : `⚠️ Deadline miss হতে পারে।`,
      hi:       meets ? `✅ ${deadlineStr} से पहले पहुँचने की संभावना है।`          : `⚠️ Deadline miss हो सकती है।`,
      banglish: meets ? `✅ ${deadlineStr}-er modhye pouchabe probably.`           : `⚠️ Deadline miss hote pare.`,
      mixed:    meets ? `✅ ${deadlineStr}-এর মধ্যে পৌঁছানোর সম্ভাবনা আছে।`       : `⚠️ Deadline miss হতে পারে।`,
    };
    return m[style] ?? m['en'];
  };
  const othersLabel: Record<LangStyle,string> = {
    en:'Other options:', bn:'আরও options:', hi:'अन्य विकल्प:',
    banglish:'Aro options:', mixed:'Other options:'
  };

  // All fields collected but no backend available — strict dataset-only enforcement
  const offlineMsg: Record<LangStyle, string> = {
    en:       `I found your route from ${origin} to ${destination} on ${travelDate} around ${depTime}. However, I need a live connection to the backend to fetch real train numbers, schedules, and delay predictions from the dataset. Please check your connection and try again.`,
    bn:       `আপনার ${origin} থেকে ${destination} রুটটি পেয়েছি (${travelDate}, ${depTime})। কিন্তু real train numbers এবং delay prediction দিতে backend connection দরকার। Please একটু পরে আবার try করুন।`,
    hi:       `${origin} से ${destination} का रूट मिला (${travelDate}, ${depTime})। लेकिन असली ट्रेन नंबर और delay prediction के लिए backend connection चाहिए। कृपया थोड़ी देर बाद दोबारा कोशिश करें।`,
    banglish: `Apnar ${origin} theke ${destination} route paisi (${travelDate}, ${depTime}). Kintu real train ar delay dekhate backend connection dorkar. Ektu pore try korun.`,
    mixed:    `আপনার ${origin} থেকে ${destination} route পেয়েছি (${travelDate}, ${depTime})। কিন্তু real train data দিতে backend connection দরকার। Please retry করুন।`,
  };

  return {
    answer: offlineMsg[style] ?? offlineMsg['en'],
    toolsExecuted: [{ tool: 'OfflineRailwayAssistant', status: 'NO_DATA' }],
    confidence: 0.5
  };
};

export const getAllStationsApi = async (): Promise<Station[]> => {
  try {
    const res = await api.get('/stations');
    if (res.data?.stations?.length > 0) return res.data.stations;
  } catch (err) {}
  return fallbackStations;
};

export const getUpcomingSuburbanTrainsApi = async (from: string = 'DAKE', to: string = 'SDAH', time?: string, forceOffline: boolean = false) => {
  try {
    if (!forceOffline) {
      const timeParam = time ? `&time=${encodeURIComponent(time)}` : '';
      const res = await api.get(`/suburban/upcoming?from=${from}&to=${to}${timeParam}`);
      if (res.data?.trains) {
        console.log('[API] TRAIN DATA SOURCE = REAL');
        return res.data;
      }
    }
  } catch (err) {
    console.warn(`[API] Suburban API fetch failed for ${from} to ${to}:`, err);
  }

  // Use offline generator only if explicitly enabled (e.g. development testing)
  // __DEV__ is true in Metro development bundler
  if (!forceOffline && !(typeof __DEV__ !== 'undefined' && __DEV__)) {
    throw new Error("No real suburban trains found and offline fallback is disabled in normal mode.");
  }
  
  console.warn('[API] Using offline fallback, but we MUST NOT invent fake schedules! Throwing error to preserve Strict Dataset Only rule.');
  throw new Error("No real suburban trains found in the dataset for this route and time. (STRICT DATASET ONLY RULE ENFORCED)");
};

export const getSuburbanCoachCrowdApi = async (trainNumber: string) => {
  try {
    const res = await api.get(`/suburban/crowd-telemetry/${trainNumber}`);
    if (res.data?.telemetry) return res.data.telemetry;
    // Return the full response body if telemetry is nested differently
    if (res.data?.coaches) return res.data;
  } catch (err) {
    throw new Error(`[STRICT DATASET ONLY] Could not fetch coach crowd telemetry for train ${trainNumber} from backend. No hardcoded fallback allowed.`);
  }
  throw new Error(`[STRICT DATASET ONLY] Backend returned no coach crowd telemetry for train ${trainNumber}.`);
};

export const getSuburbanCorridorsApi = async () => {
  return getCachedOrFetch('suburban_corridors', 60000, async () => {
    try {
      const res = await api.get('/suburban/corridors');
      if (res.data?.corridors) return res.data.corridors;
    } catch (err) {}
    return [
      { id: 'DAKE-SDAH', name: 'Dakshineswar ⇄ Sealdah Local', from: 'DAKE', to: 'SDAH', frequencyMin: 15, dailyTrains: 58, isPopular: true, stations: ['DKAE', 'DAKE', 'BARN', 'DDJ', 'BNXR', 'SDAH'] },
      { id: 'DKAE-SDAH', name: 'Dankuni ⇄ Sealdah Chord Local', from: 'DKAE', to: 'SDAH', frequencyMin: 18, dailyTrains: 46, isPopular: true, stations: ['DKAE', 'DAKE', 'BARN', 'DDJ', 'BNXR', 'SDAH'] },
      { id: 'DDJ-SDAH', name: 'Dum Dum Jn ⇄ Sealdah Local', from: 'DDJ', to: 'SDAH', frequencyMin: 6, dailyTrains: 184, isPopular: true, stations: ['DDJ', 'BNXR', 'SDAH'] },
    ];
  });
};

