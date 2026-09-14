import React, { useState, useEffect } from 'react';
import { 
  Search, ArrowRightLeft, Calendar, ShieldCheck, Cpu, Radio, Activity, 
  Clock, Ticket, Sparkles, MapPin, Headphones, LayoutGrid, Zap, Gauge, Server, Layers, Globe
} from 'lucide-react';
import { setSimulationScaleApi, fetchEngineStats } from '../services/api';
import bgOrange from '../assets/bg_vande_orange.jpg';

interface HeroSectionProps {
  onNavigateTab: (tab: string) => void;
  onFilterSearch?: (from: string, to: string) => void;
  selectedZone?: string;
  onSelectZone?: (zone: string) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ 
  onNavigateTab, 
  onFilterSearch,
  selectedZone = 'ALL',
  onSelectZone
}) => {
  const [activeSearchTab, setActiveSearchTab] = useState<'search' | 'pnr' | 'live' | 'scale'>('search');
  const [fromStation, setFromStation] = useState('New Delhi (NDLS)');
  const [toStation, setToStation] = useState('Howrah (HWH)');
  const [journeyDate, setJourneyDate] = useState('2026-09-13');
  const [pnrInput, setPnrInput] = useState('8452109876');

  // Multi-Zone & Scale State
  const [activeScale, setActiveScale] = useState<number>(1000);
  const [engineStats, setEngineStats] = useState<{
    throughputTPS: number;
    mlBatchDurationMs: number;
    activeTrains: number;
    totalFleet: number;
    memoryMB: number;
  }>({
    throughputTPS: 334,
    mlBatchDurationMs: 24,
    activeTrains: 1000,
    totalFleet: 5548,
    memoryMB: 182,
  });

  const zonesList = [
    { code: 'ALL', name: 'All 18 Zones (Nationwide)', color: '#FF671F' },
    { code: 'NR', name: 'Northern (Delhi/NR)', color: '#3B82F6' },
    { code: 'ER', name: 'Eastern (Kolkata/ER)', color: '#10B981' },
    { code: 'WR', name: 'Western (Mumbai/WR)', color: '#F59E0B' },
    { code: 'CR', name: 'Central (Mumbai/CR)', color: '#EF4444' },
    { code: 'SR', name: 'Southern (Chennai/SR)', color: '#8B5CF6' },
    { code: 'SCR', name: 'South Central (Secunderabad)', color: '#06B6D4' },
    { code: 'SWR', name: 'South Western (Bengaluru)', color: '#EC4899' },
    { code: 'ECR', name: 'East Central (Hajipur/DDU)', color: '#14B8A6' },
    { code: 'NCR', name: 'North Central (Prayagraj)', color: '#6366F1' },
    { code: 'NWR', name: 'North Western (Jaipur)', color: '#D97706' },
    { code: 'NFR', name: 'Northeast Frontier (Guwahati)', color: '#059669' },
    { code: 'SER', name: 'South Eastern (Kharagpur)', color: '#2563EB' },
    { code: 'SECR', name: 'South East Central (Bilaspur)', color: '#7C3AED' },
    { code: 'ECoR', name: 'East Coast (Bhubaneswar)', color: '#0EA5E9' },
    { code: 'WCR', name: 'West Central (Jabalpur)', color: '#475569' },
    { code: 'NER', name: 'North Eastern (Gorakhpur)', color: '#84CC16' },
    { code: 'KR', name: 'Konkan Railway (Navi Mumbai)', color: '#F43F5E' },
    { code: 'METRO', name: 'Kolkata Metro Transit', color: '#0D9488' },
  ];

  useEffect(() => {
    const updateStats = async () => {
      try {
        const data = await fetchEngineStats();
        if (data && data.success) {
          setEngineStats({
            throughputTPS: data.throughputTPS || Math.round(data.activeTrains / 3.0),
            mlBatchDurationMs: data.mlBatchDurationMs || 22,
            activeTrains: data.activeTrains || activeScale,
            totalFleet: data.totalFleet || 5548,
            memoryMB: data.memoryMB || 180,
          });
        }
      } catch (err) {
        // Fallback
      }
    };
    updateStats();
    const interval = setInterval(updateStats, 4000);
    return () => clearInterval(interval);
  }, [activeScale]);

  const handleScaleChange = async (newScale: number) => {
    setActiveScale(newScale);
    try {
      await setSimulationScaleApi(newScale);
    } catch (err) {
      console.error('Scale adjust error:', err);
    }
  };

  const handleSwap = () => {
    const temp = fromStation;
    setFromStation(toStation);
    setToStation(temp);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (onFilterSearch) {
      onFilterSearch(fromStation, toStation);
    }
    onNavigateTab('map');
  };

  return (
    <div className="space-y-4">
      {/* Main Hero Card Container */}
      <div className="relative rounded-3xl bg-white border border-slate-200/80 shadow-xl shadow-slate-200/50 overflow-hidden min-h-[410px] flex flex-col justify-between">
        {/* Background Train Image */}
        <div 
          className="absolute inset-0 z-0 pointer-events-none hidden md:block"
          style={{
            backgroundImage: `url(${bgOrange})`,
            backgroundPosition: 'right center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'contain',
            maskImage: 'linear-gradient(to right, transparent 0%, transparent 22%, rgba(0,0,0,0.5) 42%, rgba(0,0,0,1) 65%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, transparent 22%, rgba(0,0,0,0.5) 42%, rgba(0,0,0,1) 65%)',
          }}
        />

        {/* Decorative Tricolor Top Gradient Accent */}
        <div className="absolute top-0 right-0 w-80 h-2 bg-gradient-to-r from-transparent via-[#FF671F] to-[#046A38] opacity-80 z-10" />

        {/* Content Container */}
        <div className="relative z-10 p-6 sm:p-8 lg:p-10 max-w-3xl">
          {/* Main Headline */}
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-1 text-[11px] font-bold bg-orange-50 text-rail-orange border border-orange-200 rounded-lg uppercase tracking-wider flex items-center space-x-1.5">
              <Zap className="w-3.5 h-3.5" />
              <span>HIGH-CONCURRENCY NATIONWIDE ENGINE (5,500+ TRAINS)</span>
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight font-heading leading-[1.15] mt-2">
            India Moves <br />
            <span className="text-[#FF671F]">With AI Precision</span>
          </h1>

          {/* Subtitle */}
          <p className="text-slate-600 text-xs sm:text-sm mt-2 max-w-xl leading-relaxed font-medium">
            Scalable digital twin & real-time telemetry across all 18 Indian Railways operational zones. 
            Vectorized ML delay prediction evaluates 5,000+ simultaneous trains in under 30ms.
          </p>

          {/* Interactive Search / Multi-Zone Command HUD */}
          <div className="mt-5 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-lg shadow-slate-200/60 max-w-2xl">
            {/* Search / Scale Tabs */}
            <div className="flex items-center space-x-4 sm:space-x-6 border-b border-slate-100 pb-3 mb-4 text-xs font-semibold overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveSearchTab('search')}
                className={`flex items-center space-x-1.5 pb-1 transition-all shrink-0 ${
                  activeSearchTab === 'search'
                    ? 'text-[#FF671F] border-b-2 border-[#FF671F] font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                <span>Search All-India</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSearchTab('scale')}
                className={`flex items-center space-x-1.5 pb-1 transition-all shrink-0 ${
                  activeSearchTab === 'scale'
                    ? 'text-[#FF671F] border-b-2 border-[#FF671F] font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Gauge className="w-3.5 h-3.5" />
                <span>Scale Controller (5k Trains)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSearchTab('pnr')}
                className={`flex items-center space-x-1.5 pb-1 transition-all shrink-0 ${
                  activeSearchTab === 'pnr'
                    ? 'text-[#FF671F] border-b-2 border-[#FF671F] font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Ticket className="w-3.5 h-3.5" />
                <span>PNR Status</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSearchTab('live')}
                className={`flex items-center space-x-1.5 pb-1 transition-all shrink-0 ${
                  activeSearchTab === 'live'
                    ? 'text-[#FF671F] border-b-2 border-[#FF671F] font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Live GPS Feed</span>
              </button>
            </div>

            {/* Tab 1: Nationwide Search Form */}
            {activeSearchTab === 'search' && (
              <form onSubmit={handleSearch} className="space-y-3">
                {/* Zone Filter Dropdown */}
                <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                  <span className="text-[10px] font-bold uppercase text-slate-500 flex items-center space-x-1">
                    <Globe className="w-3 h-3 text-[#FF671F]" />
                    <span>OPERATIONAL ZONE:</span>
                  </span>
                  <select
                    value={selectedZone}
                    onChange={(e) => onSelectZone && onSelectZone(e.target.value)}
                    className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                  >
                    {zonesList.map((z) => (
                      <option key={z.code} value={z.code}>
                        {z.code} — {z.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 relative">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                    <label className="block text-[9px] uppercase font-bold text-slate-600 tracking-wider">FROM STATION</label>
                    <input
                      type="text"
                      value={fromStation}
                      onChange={(e) => setFromStation(e.target.value)}
                      className="w-full bg-transparent text-xs font-bold text-slate-800 focus:outline-none"
                      placeholder="e.g. New Delhi (NDLS)"
                    />
                  </div>

                  {/* Swap Button */}
                  <button
                    type="button"
                    onClick={handleSwap}
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-600 hover:text-[#FF671F] hover:scale-110 transition-all hidden sm:flex cursor-pointer"
                  >
                    <ArrowRightLeft className="w-3 h-3" />
                  </button>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                    <label className="block text-[9px] uppercase font-bold text-slate-600 tracking-wider">TO STATION</label>
                    <input
                      type="text"
                      value={toStation}
                      onChange={(e) => setToStation(e.target.value)}
                      className="w-full bg-transparent text-xs font-bold text-slate-800 focus:outline-none"
                      placeholder="e.g. Howrah (HWH)"
                    />
                  </div>
                </div>

                {/* Date and CTA Row */}
                <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                  <div className="w-full sm:w-1/2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 flex items-center justify-between">
                    <div>
                      <label className="block text-[9px] uppercase font-bold text-slate-600 tracking-wider">JOURNEY DATE</label>
                      <input
                        type="date"
                        value={journeyDate}
                        onChange={(e) => setJourneyDate(e.target.value)}
                        className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                      />
                    </div>
                    <Calendar className="w-4 h-4 text-slate-600 shrink-0" />
                  </div>

                  <button
                    type="submit"
                    className="w-full sm:w-1/2 bg-[#FF671F] hover:bg-[#E0530A] active:scale-[0.98] text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center space-x-2 shadow-md shadow-[#FF671F]/25 transition-all cursor-pointer"
                  >
                    <Search className="w-4 h-4" />
                    <span>Search Across 5k+ Trains</span>
                  </button>
                </div>
              </form>
            )}

            {/* Tab 2: Scale Controller HUD */}
            {activeSearchTab === 'scale' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Simultaneous Fleet Scale Control</h4>
                    <p className="text-[10px] text-slate-500">Scale active simulation load from demo size to full nationwide fleet.</p>
                  </div>
                  <div className="px-3 py-1 bg-orange-50 border border-orange-200 rounded-lg text-xs font-extrabold text-[#FF671F]">
                    {activeScale.toLocaleString()} Active Trains
                  </div>
                </div>

                {/* Range Slider */}
                <div className="space-y-1">
                  <input
                    type="range"
                    min="50"
                    max="5548"
                    step="50"
                    value={activeScale}
                    onChange={(e) => handleScaleChange(parseInt(e.target.value, 10))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#FF671F]"
                  />
                  <div className="flex justify-between text-[9px] font-bold text-slate-400">
                    <span>50 Trains (Dev)</span>
                    <span>1,000 Trains</span>
                    <span>2,500 Trains</span>
                    <span>5,548 Trains (Full IR)</span>
                  </div>
                </div>

                {/* Live Engine Metrics Matrix */}
                <div className="grid grid-cols-4 gap-2 pt-1">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
                    <div className="text-[9px] font-bold text-slate-500 uppercase">THROUGHPUT</div>
                    <div className="text-sm font-extrabold text-emerald-600">{engineStats.throughputTPS} <span className="text-[9px]">TPS</span></div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
                    <div className="text-[9px] font-bold text-slate-500 uppercase">ML BATCH</div>
                    <div className="text-sm font-extrabold text-sky-600">{engineStats.mlBatchDurationMs} <span className="text-[9px]">ms</span></div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
                    <div className="text-[9px] font-bold text-slate-500 uppercase">TOTAL FLEET</div>
                    <div className="text-sm font-extrabold text-indigo-600">{engineStats.totalFleet}</div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
                    <div className="text-[9px] font-bold text-slate-500 uppercase">RAM HEAP</div>
                    <div className="text-sm font-extrabold text-slate-700">{engineStats.memoryMB} <span className="text-[9px]">MB</span></div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: PNR Status Form */}
            {activeSearchTab === 'pnr' && (
              <div className="space-y-3">
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus-within:border-[#FF671F] focus-within:bg-white transition-all">
                  <label className="block text-[9px] uppercase font-bold text-slate-600 tracking-wider">10-DIGIT PNR NUMBER</label>
                  <input
                    type="text"
                    value={pnrInput}
                    onChange={(e) => setPnrInput(e.target.value)}
                    maxLength={10}
                    className="w-full bg-transparent text-xs font-bold text-slate-800 focus:outline-none"
                    placeholder="Enter 10-digit PNR"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateTab('overview')}
                  className="w-full bg-[#FF671F] hover:bg-[#E0530A] text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center space-x-2 shadow-md shadow-[#FF671F]/25 transition-all"
                >
                  <Ticket className="w-4 h-4" />
                  <span>Check PNR Status Across India</span>
                </button>
              </div>
            )}

            {/* Tab 4: Live Status Form */}
            {activeSearchTab === 'live' && (
              <div className="space-y-3">
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus-within:border-[#FF671F] focus-within:bg-white transition-all">
                  <label className="block text-[9px] uppercase font-bold text-slate-600 tracking-wider">TRAIN NUMBER OR NAME</label>
                  <input
                    type="text"
                    defaultValue="22436 - Vande Bharat Express"
                    className="w-full bg-transparent text-xs font-bold text-slate-800 focus:outline-none"
                    placeholder="e.g. 22436, 12301, 32216"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateTab('map')}
                  className="w-full bg-[#FF671F] hover:bg-[#E0530A] text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center space-x-2 shadow-md shadow-[#FF671F]/25 transition-all"
                >
                  <Activity className="w-4 h-4" />
                  <span>Track Live Train GPS Telemetry</span>
                </button>
              </div>
            )}

            {/* Sub-card Trust Badges */}
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-600 font-medium">
              <div className="flex items-center space-x-1.5 text-emerald-600 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>18 Indian Railways Operational Zones Active</span>
              </div>
              <div className="text-slate-600 font-medium hidden sm:block">
                ISRO NavIC + NTES Live Ingestion
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5-Card Quick Service Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <button
          type="button"
          onClick={() => onNavigateTab('map')}
          className="bg-white hover:bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 flex items-center space-x-3 text-left transition-all hover:-translate-y-0.5 shadow-sm shadow-slate-200/40 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600 shrink-0 group-hover:scale-105 transition-transform">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-extrabold text-slate-800 group-hover:text-[#FF671F] transition-colors">Live Network Map</h4>
            <p className="text-[10px] text-slate-600 line-clamp-1">All-India live train radar</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('digital-twin')}
          className="bg-white hover:bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 flex items-center space-x-3 text-left transition-all hover:-translate-y-0.5 shadow-sm shadow-slate-200/40 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-full bg-teal-50 border border-teal-200/60 flex items-center justify-center text-teal-600 shrink-0 group-hover:scale-105 transition-transform">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-extrabold text-slate-800 group-hover:text-[#FF671F] transition-colors">Multi-Zone Twin</h4>
            <p className="text-[10px] text-slate-600 line-clamp-1">What-If Dispatching Lab</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('track-health')}
          className="bg-white hover:bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 flex items-center space-x-3 text-left transition-all hover:-translate-y-0.5 shadow-sm shadow-slate-200/40 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shrink-0 group-hover:scale-105 transition-transform">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-extrabold text-slate-800 group-hover:text-[#FF671F] transition-colors">Track Health & IoT</h4>
            <p className="text-[10px] text-slate-600 line-clamp-1">ESP32 vibration telemetry</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('crowd')}
          className="bg-white hover:bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 flex items-center space-x-3 text-left transition-all hover:-translate-y-0.5 shadow-sm shadow-slate-200/40 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-full bg-orange-50 border border-orange-200/60 flex items-center justify-center text-[#FF671F] shrink-0 group-hover:scale-105 transition-transform">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-extrabold text-slate-800 group-hover:text-[#FF671F] transition-colors">Station Crowd</h4>
            <p className="text-[10px] text-slate-600 line-clamp-1">Cellular device density</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('alerts')}
          className="bg-white hover:bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 flex items-center space-x-3 text-left transition-all hover:-translate-y-0.5 shadow-sm shadow-slate-200/40 cursor-pointer group col-span-2 sm:col-span-1"
        >
          <div className="w-10 h-10 rounded-full bg-sky-50 border border-sky-200/60 flex items-center justify-center text-sky-600 shrink-0 group-hover:scale-105 transition-transform">
            <Headphones className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-extrabold text-slate-800 group-hover:text-[#FF671F] transition-colors">Incident Hub</h4>
            <p className="text-[10px] text-slate-600 line-clamp-1">TSR & crew risk control</p>
          </div>
        </button>
      </div>
    </div>
  );
};
