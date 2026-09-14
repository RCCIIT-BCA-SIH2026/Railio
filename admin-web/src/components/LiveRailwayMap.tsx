import React, { useState, useEffect, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  Tooltip,
  useMap
} from 'react-leaflet';
import L from 'leaflet';
import {
  Train as TrainIcon,
  Navigation,
  AlertTriangle,
  ShieldCheck,
  MapPin,
  Gauge,
  Clock,
  Layers,
  Search,
  Filter,
  RefreshCw,
  Compass,
  Zap,
  Activity,
  X
} from 'lucide-react';
import { LiveTrain, TrackSection } from '../types';

interface LiveRailwayMapProps {
  trains: LiveTrain[];
  trackSections?: TrackSection[];
  onSelectTrain?: (train: LiveTrain) => void;
  selectedZone?: string;
  onSelectZone?: (zone: string) => void;
}

// User-provided LocationIQ API Key fallback (supports primary & secondary keys)
const LOCATIONIQ_KEY =
  import.meta.env.VITE_LOCATIONIQ_SECONDARY_API_KEY ||
  import.meta.env.VITE_LOCATIONIQ_API_KEY ||
  import.meta.env.VITE_LOCATION_API_KEY ||
  import.meta.env.VITE_LOCATIONIQ_PRIMARY_API_KEY ||
  'v1.public.eyJqdGkiOiI6ODI2NjIzOC0zNTAwLTQxMzctYTU2My1iNjE1NTM0ZWNlNTcifQYyrO0SdAmqOLmLmbbku8684dq5loHRoZhMfIbDN_HbHzsv0LeA5sFHtAT0fq2K0Gpi1fxogiTOjfGrz3am1FEqugznQWo-1MzZ-9fX5Qhn0QVSZM6htB58phVciJxLAbfUf_up7sl34EuToywbCDj_5dj7_4XRz0Ksll1KyfiQZS2ZrVeRZRl523REqMxnk0JyL2B4GJ64AQMHIscVYy2pGViXdOVkyToh_P8Uw-vPR3hsqx7TFJMGSinz_rPGxVl8-iw1dhyBjaz4IwLih-tc-12dK1tdJ4zsy-qiu9naA-zrEq3Q4s4YotNjal7aA5JAv-57Cg7IEaT4Bztmq1g.N2IyNTQ2ODQtOWE1YS00MmI2LTkyOTItMGJlNGMxODU1Mzc2';

// Station GPS Nodes for Sealdah - Dankuni Suburban Corridor (28.0 km)
interface StationNode {
  code: string;
  name: string;
  lat: number;
  lng: number;
  km: string;
  platforms: number;
  isJn: boolean;
  details: string;
}

const STATIONS: StationNode[] = [
  {
    code: 'SDAH',
    name: 'Sealdah Terminal',
    lat: 22.5674,
    lng: 88.3712,
    km: '0.0 km',
    platforms: 21,
    isJn: true,
    details: 'Eastern Railway HQ • 21 Platforms • Suburban Terminal'
  },
  {
    code: 'BNXR',
    name: 'Bidhan Nagar Road',
    lat: 22.5938,
    lng: 88.3842,
    km: '4.0 km',
    platforms: 4,
    isJn: false,
    details: 'High Density Commuter Exchange • 4 Platforms'
  },
  {
    code: 'DDJ',
    name: 'Dum Dum Junction',
    lat: 22.6221,
    lng: 88.3773,
    km: '7.0 km',
    platforms: 5,
    isJn: true,
    details: 'Suburban & Kolkata Metro Line 1 Interchange'
  },
  {
    code: 'BARN',
    name: 'Baranagar Road',
    lat: 22.6455,
    lng: 88.3735,
    km: '12.0 km',
    platforms: 2,
    isJn: false,
    details: 'Suburban Line Station • BT Road Access'
  },
  {
    code: 'DAKE',
    name: 'Dakshineswar',
    lat: 22.6548,
    lng: 88.3662,
    km: '15.0 km',
    platforms: 4,
    isJn: false,
    details: 'River Hooghly Bridge Approach & Metro Hub'
  },
  {
    code: 'DKAE',
    name: 'Dankuni Junction',
    lat: 22.6842,
    lng: 88.3005,
    km: '28.0 km',
    platforms: 5,
    isJn: true,
    details: 'Howrah-Sealdah Freight & Suburban Rail Junction'
  }
];

// UP Line Track Polyline (Sealdah -> Dankuni)
const UP_TRACK_PATH: [number, number][] = [
  [22.5674, 88.3712], // SDAH
  [22.5805, 88.3775],
  [22.5938, 88.3842], // BNXR
  [22.6085, 88.3822],
  [22.6221, 88.3773], // DDJ
  [22.6345, 88.3752],
  [22.6455, 88.3735], // BARN
  [22.6508, 88.3698],
  [22.6548, 88.3662], // DAKE
  [22.6575, 88.3585],
  [22.6680, 88.3310],
  [22.6842, 88.3005]  // DKAE
];

// DOWN Line Track Polyline (Dankuni -> Sealdah, slightly offset for double-track visual)
const DOWN_TRACK_PATH: [number, number][] = UP_TRACK_PATH.map(([lat, lng]) => [
  lat - 0.0007,
  lng + 0.0007
]);

// Center point for Corridor
const CORRIDOR_CENTER: [number, number] = [22.6258, 88.3458];

// Helper to create Station Icons
const createStationIcon = (code: string, isJn: boolean, isSelected: boolean) => {
  return L.divIcon({
    className: 'station-div-icon',
    html: `
      <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer; transition: transform 0.2s;">
        <div style="
          background: ${isJn ? '#0284C7' : '#FFFFFF'};
          color: ${isJn ? '#FFFFFF' : '#0F172A'};
          border: ${isSelected ? '2.5px solid #FF671F' : '1.5px solid #0284C7'};
          padding: 2px 7px;
          border-radius: 6px;
          font-weight: 800;
          font-size: 10.5px;
          font-family: Outfit, Inter, sans-serif;
          box-shadow: 0 4px 10px rgba(0,0,0,0.18);
          white-space: nowrap;
          transform: ${isSelected ? 'scale(1.15)' : 'scale(1)'};
        ">
          ${code}
        </div>
        <div style="
          width: ${isJn ? '12px' : '10px'};
          height: ${isJn ? '12px' : '10px'};
          background: ${isJn ? '#0284C7' : '#EA580C'};
          border: 2px solid #FFFFFF;
          border-radius: 50%;
          margin-top: 3px;
          box-shadow: 0 0 8px ${isJn ? 'rgba(2,132,199,0.8)' : 'rgba(234,88,12,0.8)'};
        "></div>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 38]
  });
};

// Helper to create Dynamic Train Marker Icons
const createTrainIcon = (train: LiveTrain, isSelected: boolean) => {
  const isDelayed = (train.delayMinutes || 0) > 3;
  const isAlert = (train.delayMinutes || 0) > 10 || train.status === 'CRITICAL_DELAY';
  const color = isAlert ? '#EF4444' : isDelayed ? '#F59E0B' : '#10B981';
  const isUp = train.direction === 'UP' || (train.trainNumber && parseInt(train.trainNumber, 10) % 2 === 1);

  return L.divIcon({
    className: 'train-div-icon',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
        <!-- Train Number Pill -->
        <div style="
          position: absolute;
          top: -22px;
          background: #FFFFFF;
          border: ${isSelected ? '2px solid #FF671F' : `1.5px solid ${color}`};
          padding: 1px 6px;
          border-radius: 5px;
          font-weight: 800;
          font-size: 10px;
          color: #0F172A;
          font-family: Inter, sans-serif;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 3px;
        ">
          <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:${color}"></span>
          #${train.trainNumber} (${train.speed || 58} km/h)
        </div>

        <!-- Pulsing Outer Aura -->
        <div style="
          position: absolute;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: ${color}33;
          animation: pulse-glow 2s infinite ease-in-out;
        "></div>

        <!-- Train Main Badge Pin -->
        <div style="
          position: relative;
          z-index: 2;
          width: 30px;
          height: 30px;
          background: ${color};
          border: 2.5px solid #FFFFFF;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #FFFFFF;
          box-shadow: 0 4px 14px ${color}80;
          transform: ${isSelected ? 'scale(1.2)' : 'scale(1)'};
          transition: transform 0.2s;
        ">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="4" y="3" width="16" height="16" rx="2"/>
            <path d="M4 11h16"/>
            <path d="M12 3v8"/>
            <path d="m8 19-2 3"/>
            <path d="m18 22-2-3"/>
            <circle cx="8" cy="15" r="1"/>
            <circle cx="16" cy="15" r="1"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [36, 50],
    iconAnchor: [18, 28]
  });
};

// Map Recenter Component
const MapViewAdjuster: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.2 });
  }, [center, zoom, map]);
  return null;
};

// Fallback Default Live Trains along Corridor
const DEFAULT_CORRIDOR_TRAINS: LiveTrain[] = [
  {
    trainNumber: '32211',
    name: 'Sealdah - Dankuni EMU Local',
    type: 'SUBURBAN',
    lat: 22.5938,
    lng: 88.3842,
    speed: 62,
    heading: 45,
    currentSection: 'BNXR-DDJ-SUB2',
    delayMinutes: 0,
    predictedDelay: 1,
    status: 'ON_TIME',
    direction: 'UP',
    source: 'Sealdah (SDAH)',
    destination: 'Dankuni Jn (DKAE)'
  },
  {
    trainNumber: '32216',
    name: 'Dankuni - Sealdah EMU Local',
    type: 'SUBURBAN',
    lat: 22.6548,
    lng: 88.3662,
    speed: 48,
    heading: 225,
    currentSection: 'BARN-DAKE-SUB4',
    delayMinutes: 4,
    predictedDelay: 5,
    status: 'DELAYED',
    direction: 'DOWN',
    source: 'Dankuni Jn (DKAE)',
    destination: 'Sealdah (SDAH)'
  },
  {
    trainNumber: '32213',
    name: 'Sealdah - Dankuni EMU Local',
    type: 'SUBURBAN',
    lat: 22.6345,
    lng: 88.3752,
    speed: 55,
    heading: 30,
    currentSection: 'DDJ-BARN-SUB3',
    delayMinutes: 1,
    predictedDelay: 2,
    status: 'ON_TIME',
    direction: 'UP',
    source: 'Sealdah (SDAH)',
    destination: 'Dankuni Jn (DKAE)'
  },
  {
    trainNumber: '32218',
    name: 'Dankuni - Sealdah EMU Local',
    type: 'SUBURBAN',
    lat: 22.6680,
    lng: 88.3310,
    speed: 35,
    heading: 180,
    currentSection: 'DAKE-DKAE-SUB5',
    delayMinutes: 12,
    predictedDelay: 14,
    status: 'CRITICAL_DELAY',
    direction: 'DOWN',
    source: 'Dankuni Jn (DKAE)',
    destination: 'Sealdah (SDAH)'
  }
];

export const LiveRailwayMap: React.FC<LiveRailwayMapProps> = ({
  trains = [],
  trackSections = [],
  onSelectTrain
}) => {
  // Layer Selection State
  const [mapTileStyle, setMapTileStyle] = useState<'google' | 'locationiq' | 'satellite'>('google');
  const [showRailwayOverlay, setShowRailwayOverlay] = useState<boolean>(true);
  const [filterDirection, setFilterDirection] = useState<'ALL' | 'UP' | 'DOWN' | 'DELAYED'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Map center and selection
  const [mapCenter, setMapCenter] = useState<[number, number]>(CORRIDOR_CENTER);
  const [mapZoom, setMapZoom] = useState<number>(12);

  // Combine props trains with fallback corridor trains
  const activeTrainList = useMemo(() => {
    const rawList = trains.length > 0 ? trains : DEFAULT_CORRIDOR_TRAINS;
    // Map missing coordinates onto corridor track polylines if needed
    return rawList.map((t, index) => {
      let lat = t.lat;
      let lng = t.lng;
      if (!lat || !lng || (lat === 0 && lng === 0)) {
        const isUp = t.direction === 'UP' || index % 2 === 0;
        const poly = isUp ? UP_TRACK_PATH : DOWN_TRACK_PATH;
        const point = poly[index % poly.length];
        lat = point[0];
        lng = point[1];
      }
      return { ...t, lat, lng };
    });
  }, [trains]);

  const [selectedTrain, setSelectedTrain] = useState<LiveTrain | null>(
    activeTrainList[0] || null
  );
  const [selectedStation, setSelectedStation] = useState<StationNode | null>(null);

  // Dynamic Metrics for Filter Pills
  const upTrainCount = useMemo(
    () => activeTrainList.filter((t) => t.direction === 'UP' || !t.direction).length,
    [activeTrainList]
  );
  const downTrainCount = useMemo(
    () => activeTrainList.filter((t) => t.direction === 'DOWN').length,
    [activeTrainList]
  );
  const delayedTrainCount = useMemo(
    () => activeTrainList.filter((t) => (t.delayMinutes || 0) > 3).length,
    [activeTrainList]
  );

  // Auto select first train on load
  useEffect(() => {
    if (!selectedTrain && activeTrainList.length > 0) {
      setSelectedTrain(activeTrainList[0]);
    }
  }, [activeTrainList, selectedTrain]);

  // Filtered Trains based on UI controls
  const filteredTrains = useMemo(() => {
    return activeTrainList.filter((t) => {
      if (filterDirection === 'UP' && t.direction !== 'UP') return false;
      if (filterDirection === 'DOWN' && t.direction !== 'DOWN') return false;
      if (filterDirection === 'DELAYED' && (t.delayMinutes || 0) <= 3) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          t.trainNumber.toLowerCase().includes(q) ||
          t.name.toLowerCase().includes(q) ||
          (t.currentSection && t.currentSection.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [activeTrainList, filterDirection, searchQuery]);

  // Handle train click
  const handleTrainClick = (train: LiveTrain) => {
    setSelectedTrain(train);
    setSelectedStation(null);
    if (train.lat && train.lng) {
      setMapCenter([train.lat, train.lng]);
      setMapZoom(14);
    }
    if (onSelectTrain) {
      onSelectTrain(train);
    }
  };

  // Handle station click
  const handleStationClick = (stn: StationNode) => {
    setSelectedStation(stn);
    setMapCenter([stn.lat, stn.lng]);
    setMapZoom(14);
  };

  // Reset View to whole corridor
  const handleResetView = () => {
    setMapCenter(CORRIDOR_CENTER);
    setMapZoom(12);
    setSelectedStation(null);
  };

  // Tile URL Resolvers
  const getTileLayer = () => {
    switch (mapTileStyle) {
      case 'locationiq':
        return {
          url: `https://{s}-tiles.locationiq.com/v3/streets/r/{z}/{x}/{y}.png?key=${LOCATIONIQ_KEY}`,
          subdomains: ['a', 'b', 'c'],
          attribution: '&copy; <a href="https://locationiq.com/">LocationIQ</a> &copy; OpenStreetMap'
        };
      case 'satellite':
        return {
          url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
          subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
          attribution: '&copy; Google Maps Satellite'
        };
      case 'google':
      default:
        return {
          url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
          subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
          attribution: '&copy; Google Maps'
        };
    }
  };

  const tileConfig = getTileLayer();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Interactive Leaflet Dynamic Google Map Container */}
      <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden flex flex-col">
        {/* Premium Command Header Bar with Live Telemetry Badge */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3.5 mb-4 p-1">
          <div className="flex items-start sm:items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 text-white flex items-center justify-center shadow-md shadow-orange-500/20 shrink-0">
              <Navigation className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-heading text-base font-extrabold text-slate-900 tracking-tight">
                  Sealdah – Dankuni Suburban Corridor Dynamic Map
                </h3>
                <span className="px-2.5 py-0.5 text-[10px] font-extrabold rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-500/30 flex items-center gap-1.5 shadow-2xs">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  LIVE TELEMETRY
                </span>
              </div>
              <p className="text-xs font-medium text-slate-500 mt-0.5">
                Google Maps & OpenRailwayMap Track Engine (28.0 km Electrified Double-Line Corridor)
              </p>
            </div>
          </div>

          {/* Quick Search & Reset Controls */}
          <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 absolute left-3 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search train or station..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-8 py-2 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-none focus:border-[#FF671F] focus:ring-2 focus:ring-[#FF671F]/15 bg-slate-50/80 hover:bg-slate-50 transition-all w-48 sm:w-56 shadow-2xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 p-0.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition"
                  title="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <button
              onClick={handleResetView}
              title="Reset View to Corridor Center"
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-orange-50 hover:border-orange-200 text-slate-700 hover:text-[#FF671F] transition-all flex items-center space-x-1.5 shadow-2xs font-bold text-xs cursor-pointer"
            >
              <Compass className="w-4 h-4 text-rail-orange" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>
        </div>

        {/* Dynamic Filter Pills & Map Style Switcher Row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 mb-4 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/90 text-xs">
          {/* Dynamic Filter Pills */}
          <div className="flex items-center overflow-x-auto p-0.5 gap-1.5 no-scrollbar">
            <button
              onClick={() => setFilterDirection('ALL')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
                filterDirection === 'ALL'
                  ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20'
                  : 'bg-white/80 text-slate-700 hover:bg-white border border-slate-200/60'
              }`}
            >
              <span>All Rakes</span>
              <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-black ${
                filterDirection === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
              }`}>
                {activeTrainList.length}
              </span>
            </button>

            <button
              onClick={() => setFilterDirection('UP')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
                filterDirection === 'UP'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                  : 'bg-white/80 text-slate-700 hover:bg-white border border-slate-200/60'
              }`}
            >
              <span className="text-sky-400 font-extrabold">▲</span>
              <span>UP Line</span>
              <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-black ${
                filterDirection === 'UP' ? 'bg-white/20 text-white' : 'bg-sky-50 text-sky-700'
              }`}>
                {upTrainCount}
              </span>
            </button>

            <button
              onClick={() => setFilterDirection('DOWN')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
                filterDirection === 'DOWN'
                  ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20'
                  : 'bg-white/80 text-slate-700 hover:bg-white border border-slate-200/60'
              }`}
            >
              <span className="text-orange-300 font-extrabold">▼</span>
              <span>DOWN Line</span>
              <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-black ${
                filterDirection === 'DOWN' ? 'bg-white/20 text-white' : 'bg-orange-50 text-orange-700'
              }`}>
                {downTrainCount}
              </span>
            </button>

            <button
              onClick={() => setFilterDirection('DELAYED')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
                filterDirection === 'DELAYED'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                  : 'bg-white/80 text-slate-700 hover:bg-white border border-slate-200/60'
              }`}
            >
              <span>⚠️ Delayed (&gt;3m)</span>
              <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-black ${
                filterDirection === 'DELAYED' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
              }`}>
                {delayedTrainCount}
              </span>
            </button>
          </div>

          {/* Map Layer Switcher */}
          <div className="flex items-center overflow-x-auto p-0.5 gap-1.5 border-t lg:border-t-0 pt-1 lg:pt-0 border-slate-200/60 no-scrollbar">
            <span className="text-[10px] font-extrabold tracking-wider text-slate-600 uppercase px-1 hidden xl:inline">
              Map View:
            </span>
            <button
              onClick={() => setMapTileStyle('google')}
              className={`px-2.5 py-1 rounded-xl font-extrabold border transition-all cursor-pointer whitespace-nowrap ${
                mapTileStyle === 'google'
                  ? 'bg-white border-[#FF671F] text-[#FF671F] shadow-2xs'
                  : 'bg-transparent border-transparent text-slate-600 hover:bg-white/60'
              }`}
            >
              🗺️ Google Maps
            </button>
            <button
              onClick={() => setMapTileStyle('locationiq')}
              className={`px-2.5 py-1 rounded-xl font-extrabold border transition-all cursor-pointer whitespace-nowrap ${
                mapTileStyle === 'locationiq'
                  ? 'bg-white border-[#FF671F] text-[#FF671F] shadow-2xs'
                  : 'bg-transparent border-transparent text-slate-600 hover:bg-white/60'
              }`}
            >
              📍 LocationIQ
            </button>
            <button
              onClick={() => setMapTileStyle('satellite')}
              className={`px-2.5 py-1 rounded-xl font-extrabold border transition-all cursor-pointer whitespace-nowrap ${
                mapTileStyle === 'satellite'
                  ? 'bg-white border-[#FF671F] text-[#FF671F] shadow-2xs'
                  : 'bg-transparent border-transparent text-slate-600 hover:bg-white/60'
              }`}
            >
              🛰️ Satellite
            </button>

            <button
              onClick={() => setShowRailwayOverlay(!showRailwayOverlay)}
              className={`px-2.5 py-1 rounded-xl font-extrabold border transition-all cursor-pointer whitespace-nowrap flex items-center space-x-1 ${
                showRailwayOverlay
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-700 shadow-2xs'
                  : 'bg-slate-200/60 border-transparent text-slate-600'
              }`}
              title="Toggle Railway Tracks Overlay"
            >
              <span>🛤️ Rail Tracks</span>
              <span className={`px-1.5 py-0.2 text-[9px] rounded-full font-black ${
                showRailwayOverlay ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-600'
              }`}>
                {showRailwayOverlay ? 'ON' : 'OFF'}
              </span>
            </button>
          </div>
        </div>

        {/* Dynamic Leaflet Map Canvas */}
        <div className="relative flex-1 min-h-[480px] rounded-xl border border-slate-200 overflow-hidden shadow-inner">
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%', minHeight: '480px' }}
          >
            <MapViewAdjuster center={mapCenter} zoom={mapZoom} />

            {/* Base Vector / Raster Tile Layer */}
            <TileLayer
              url={tileConfig.url}
              subdomains={tileConfig.subdomains}
              attribution={tileConfig.attribution}
              maxZoom={19}
            />

            {/* OpenRailwayMap Dedicated Infrastructure Overlay Layer */}
            {showRailwayOverlay && (
              <TileLayer
                url="https://{s}.tile.openrailwaymap.org/standard/{z}/{x}/{y}.png"
                subdomains={['a', 'b', 'c']}
                attribution="&copy; OpenRailwayMap contributors"
                maxZoom={19}
                opacity={0.85}
              />
            )}

            {/* UP Line Polyline Track (Blue Track) */}
            <Polyline
              positions={UP_TRACK_PATH}
              pathOptions={{
                color: '#0284C7',
                weight: 5,
                opacity: 0.9,
                dashArray: undefined
              }}
            >
              <Tooltip sticky>▲ UP LINE Track (Sealdah ➔ Dankuni)</Tooltip>
            </Polyline>

            {/* DOWN Line Polyline Track (Orange Track) */}
            <Polyline
              positions={DOWN_TRACK_PATH}
              pathOptions={{
                color: '#EA580C',
                weight: 5,
                opacity: 0.9
              }}
            >
              <Tooltip sticky>▼ DOWN LINE Track (Dankuni ➔ Sealdah)</Tooltip>
            </Polyline>

            {/* Station Hub Markers */}
            {STATIONS.map((stn) => {
              const isSelected = selectedStation?.code === stn.code;
              return (
                <Marker
                  key={stn.code}
                  position={[stn.lat, stn.lng]}
                  icon={createStationIcon(stn.code, stn.isJn, isSelected)}
                  eventHandlers={{
                    click: () => handleStationClick(stn)
                  }}
                >
                  <Popup>
                    <div className="p-3 max-w-xs font-sans">
                      <div className="flex items-center space-x-2 border-b border-slate-100 pb-2 mb-2">
                        <MapPin className="w-4 h-4 text-sky-600" />
                        <div>
                          <h4 className="font-heading font-extrabold text-sm text-slate-900">
                            {stn.name} ({stn.code})
                          </h4>
                          <p className="text-[11px] text-slate-500">{stn.km} from Sealdah</p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-700 leading-snug mb-2">{stn.details}</p>
                      <div className="bg-slate-50 rounded-lg p-2 text-[11px] text-slate-600 flex justify-between">
                        <span>Platforms: <b>{stn.platforms} PF</b></span>
                        <span>Type: <b>{stn.isJn ? 'Junction Hub' : 'Suburban Halt'}</b></span>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* Moving Train Markers */}
            {filteredTrains.map((train) => {
              const isSelected = selectedTrain?.trainNumber === train.trainNumber;
              return (
                <Marker
                  key={train.trainNumber}
                  position={[train.lat, train.lng]}
                  icon={createTrainIcon(train, isSelected)}
                  eventHandlers={{
                    click: () => handleTrainClick(train)
                  }}
                >
                  <Popup>
                    <div className="p-3 max-w-xs font-sans">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                        <div className="flex items-center space-x-2">
                          <TrainIcon className="w-4 h-4 text-rail-orange" />
                          <div>
                            <h4 className="font-heading font-bold text-sm text-slate-900">
                              #{train.trainNumber}
                            </h4>
                            <p className="text-[11px] text-slate-500">{train.name}</p>
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            (train.delayMinutes || 0) > 3
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {(train.delayMinutes || 0) > 0
                            ? `+${train.delayMinutes}m`
                            : 'On Time'}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-700 mb-3">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Live Speed:</span>
                          <span className="font-mono font-bold text-slate-900">{train.speed || 58} km/h</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Current Section:</span>
                          <span className="font-mono text-slate-800">{train.currentSection || 'SDAH-BNXR-SUB1'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Direction:</span>
                          <span className="font-bold text-sky-700">{train.direction || 'UP Line'}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleTrainClick(train)}
                        className="w-full py-1.5 bg-rail-orange text-white rounded-lg text-xs font-bold shadow-sm hover:bg-orange-600 transition"
                      >
                        Inspect Telemetry & XAI
                      </button>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>

          {/* Floating Map Legend Footer */}
          <div className="absolute bottom-3 left-3 z-[400] flex items-center space-x-3 bg-white/95 backdrop-blur-md border border-slate-200 px-3 py-1.5 rounded-xl text-xs text-slate-700 shadow-md">
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-1 bg-[#0284C7] rounded-full"></span>
              <span className="font-medium text-[11px]">UP Track</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-1 bg-[#EA580C] rounded-full"></span>
              <span className="font-medium text-[11px]">DOWN Track</span>
            </div>
            <div className="h-3 w-px bg-slate-200"></div>
            <div className="flex items-center space-x-1 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>On Time</span>
            </div>
            <div className="flex items-center space-x-1 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>Delayed</span>
            </div>
            <div className="flex items-center space-x-1 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span>Alert</span>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Train Telemetry & XAI Breakdown Sidebar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
        <div>
          {/* Header Card */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-rail-orange shadow-sm">
                <TrainIcon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-heading font-bold text-slate-900 text-sm">
                  {selectedTrain?.name || selectedStation?.name || 'Sealdah - Dankuni Local'}
                </h4>
                <p className="text-[11px] text-slate-500">
                  {selectedStation
                    ? `Station Code: ${selectedStation.code} • ${selectedStation.km}`
                    : `EMU Local #${selectedTrain?.trainNumber || '32211'} (12 Coaches C1-C12)`}
                </p>
              </div>
            </div>
            {selectedTrain && (
              <span
                className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                  selectedTrain.delayMinutes > 3
                    ? 'bg-amber-50 border-amber-200 text-amber-700'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                }`}
              >
                {selectedTrain.delayMinutes > 0
                  ? `+${selectedTrain.delayMinutes}m Delay`
                  : 'On Time'}
              </span>
            )}
          </div>

          {/* Telemetry Grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
              <div className="flex items-center space-x-1.5 text-slate-500 text-xs mb-1">
                <Gauge className="w-3.5 h-3.5 text-sky-600" />
                <span>Live EMU Speed</span>
              </div>
              <div className="text-xl font-heading font-extrabold text-slate-900">
                {selectedTrain?.speed || 58} <span className="text-xs font-normal text-slate-500">km/h</span>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
              <div className="flex items-center space-x-1.5 text-slate-500 text-xs mb-1">
                <Clock className="w-3.5 h-3.5 text-rail-orange" />
                <span>Predicted Delay</span>
              </div>
              <div className="text-xl font-heading font-extrabold text-slate-900">
                +{selectedTrain?.predictedDelay || 2} <span className="text-xs font-normal text-slate-500">min</span>
              </div>
            </div>
          </div>

          {/* Detailed Specifications */}
          <div className="space-y-2 text-xs mb-4">
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Current Block Section:</span>
              <span className="font-mono font-bold text-slate-800">
                {selectedTrain?.currentSection || 'SDAH-BNXR-SUB1'}
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Track Geometry Status:</span>
              <span className="font-bold text-emerald-600">Optimal (0.02 mm rms)</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">OHE Traction Status:</span>
              <span className="font-semibold text-slate-800">25 kV AC Suburban Overhead Line</span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-slate-500">Map API Provider:</span>
              <span className="font-bold text-sky-700">LocationIQ & OpenRailwayMap</span>
            </div>
          </div>

          {/* Explainable AI Delay Attribution Panel */}
          <div className="bg-orange-50/60 rounded-xl p-3.5 border border-orange-100">
            <h5 className="text-xs font-bold text-slate-900 mb-2 flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-rail-orange" />
              <span>Explainable AI (XAI) Attribution</span>
            </h5>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between text-slate-700">
                <span>• Platform Dwell Time Overshoot:</span>
                <span className="font-mono font-bold text-amber-700">+1.5 min</span>
              </div>
              <div className="flex items-center justify-between text-slate-700">
                <span>• Dum Dum Junction Interlocking Hold:</span>
                <span className="font-mono font-bold text-slate-500">+0.5 min</span>
              </div>
              <div className="flex items-center justify-between text-slate-700">
                <span>• Bally Bridge TSR Impact:</span>
                <span className="font-mono font-bold text-slate-500">0.0 min</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dispatch Action Buttons */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex space-x-2">
          <button
            onClick={() =>
              alert(
                `Broadcasting speed advisory to Motorman of EMU Local ${selectedTrain?.trainNumber || '32211'}`
              )
            }
            className="flex-1 py-2.5 px-3 bg-rail-orange hover:bg-rail-saffron text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center space-x-1.5"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Issue Motorman Advisory</span>
          </button>
          <button
            onClick={() =>
              alert(
                `Precedence simulator opened for EMU Local ${selectedTrain?.trainNumber || '32211'}`
              )
            }
            className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition"
          >
            Simulate Precedence
          </button>
        </div>
      </div>
    </div>
  );
};
