import React, { useState } from 'react';
import { Search, ArrowRightLeft, Calendar, ShieldCheck, Cpu, Radio, Activity, Clock, Ticket, Sparkles, MapPin, Headphones, LayoutGrid } from 'lucide-react';
import bgOrange from '../assets/bg_vande_orange.jpg';

interface HeroSectionProps {
  onNavigateTab: (tab: string) => void;
  onFilterSearch?: (from: string, to: string) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onNavigateTab, onFilterSearch }) => {
  const [activeSearchTab, setActiveSearchTab] = useState<'search' | 'pnr' | 'live'>('search');
  const [fromStation, setFromStation] = useState('Sealdah (SDAH)');
  const [toStation, setToStation] = useState('Dankuni (DKAE)');
  const [journeyDate, setJourneyDate] = useState('2026-09-09');
  const [pnrInput, setPnrInput] = useState('8452109876');

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
    // Switch to Map / Operations view
    onNavigateTab('map');
  };

  return (
    <div className="space-y-4">
      {/* Main Hero Card Container */}
      <div className="relative rounded-3xl bg-white border border-slate-200/80 shadow-xl shadow-slate-200/50 overflow-hidden min-h-[380px] flex flex-col justify-between">
        {/* Background Train Image on the Right with Smooth Left Fade */}
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

        {/* Content Container (Left-aligned over white background) */}
        <div className="relative z-10 p-6 sm:p-8 lg:p-10 max-w-2xl">
          {/* Main Headline */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight font-heading leading-[1.15]">
            India Moves <br />
            <span className="text-[#FF671F]">With Progress</span>
          </h1>

          {/* Subtitle */}
          <p className="text-slate-600 text-xs sm:text-sm mt-3 max-w-lg leading-relaxed font-medium">
            Smart Journey. Stronger Connections. Real-time train updates, seamless booking, and a better travel experience for every Indian.
          </p>

          {/* Interactive Search / Status Card */}
          <div className="mt-6 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-lg shadow-slate-200/60 max-w-xl">
            {/* Search Tabs */}
            <div className="flex items-center space-x-6 border-b border-slate-100 pb-3 mb-4 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveSearchTab('search')}
                className={`flex items-center space-x-1.5 pb-1 transition-all ${
                  activeSearchTab === 'search'
                    ? 'text-[#FF671F] border-b-2 border-[#FF671F] font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                <span>Search Trains</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSearchTab('pnr')}
                className={`flex items-center space-x-1.5 pb-1 transition-all ${
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
                className={`flex items-center space-x-1.5 pb-1 transition-all ${
                  activeSearchTab === 'live'
                    ? 'text-[#FF671F] border-b-2 border-[#FF671F] font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Live Status</span>
              </button>
            </div>

            {/* Tab 1: Search Trains Form */}
            {activeSearchTab === 'search' && (
              <form onSubmit={handleSearch} className="space-y-3">
                {/* Station Inputs Row */}
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <div className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus-within:border-[#FF671F] focus-within:bg-white transition-all">
                    <label className="block text-[9px] uppercase font-bold text-slate-600 tracking-wider">FROM</label>
                    <div className="flex items-center space-x-1">
                      <input
                        type="text"
                        value={fromStation}
                        onChange={(e) => setFromStation(e.target.value)}
                        className="w-full bg-transparent text-xs font-bold text-slate-800 focus:outline-none"
                        placeholder="Station or code"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSwap}
                    className="p-2 rounded-full bg-slate-100 hover:bg-orange-50 hover:text-[#FF671F] border border-slate-200 text-slate-500 transition-all shrink-0"
                    title="Swap stations"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus-within:border-[#FF671F] focus-within:bg-white transition-all">
                    <label className="block text-[9px] uppercase font-bold text-slate-600 tracking-wider">TO</label>
                    <div className="flex items-center space-x-1">
                      <input
                        type="text"
                        value={toStation}
                        onChange={(e) => setToStation(e.target.value)}
                        className="w-full bg-transparent text-xs font-bold text-slate-800 focus:outline-none"
                        placeholder="Destination"
                      />
                      <MapPin className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                    </div>
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
                    <span>Search Trains</span>
                  </button>
                </div>
              </form>
            )}

            {/* Tab 2: PNR Status Form */}
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
                  <span>Check PNR Status</span>
                </button>
              </div>
            )}

            {/* Tab 3: Live Status Form */}
            {activeSearchTab === 'live' && (
              <div className="space-y-3">
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus-within:border-[#FF671F] focus-within:bg-white transition-all">
                  <label className="block text-[9px] uppercase font-bold text-slate-600 tracking-wider">TRAIN NUMBER OR NAME</label>
                  <input
                    type="text"
                    defaultValue="32216 - Dankuni - Sealdah Local"
                    className="w-full bg-transparent text-xs font-bold text-slate-800 focus:outline-none"
                    placeholder="e.g. 32216 or 32211"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateTab('map')}
                  className="w-full bg-[#FF671F] hover:bg-[#E0530A] text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center space-x-2 shadow-md shadow-[#FF671F]/25 transition-all"
                >
                  <Activity className="w-4 h-4" />
                  <span>Track Live Train GPS</span>
                </button>
              </div>
            )}

            {/* Sub-card Trust Badges */}
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-600 font-medium">
              <div className="flex items-center space-x-1.5 text-emerald-600 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Official IRCTC & Indian Railways Data Gateway</span>
              </div>
              <div className="text-slate-600 font-medium hidden sm:block">
                100% Real IoT & AI Ingestion
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5-Card Quick Service Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Card 1: Live Train Status */}
        <button
          type="button"
          onClick={() => onNavigateTab('map')}
          className="bg-white hover:bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 flex items-center space-x-3 text-left transition-all hover:-translate-y-0.5 shadow-sm shadow-slate-200/40 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600 shrink-0 group-hover:scale-105 transition-transform">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-extrabold text-slate-800 group-hover:text-[#FF671F] transition-colors">Live Train Status</h4>
            <p className="text-[10px] text-slate-600 line-clamp-1">Get real-time updates on your train</p>
          </div>
        </button>

        {/* Card 2: PNR Enquiry */}
        <button
          type="button"
          onClick={() => onNavigateTab('overview')}
          className="bg-white hover:bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 flex items-center space-x-3 text-left transition-all hover:-translate-y-0.5 shadow-sm shadow-slate-200/40 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shrink-0 group-hover:scale-105 transition-transform">
            <Ticket className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-extrabold text-slate-800 group-hover:text-[#FF671F] transition-colors">PNR Enquiry</h4>
            <p className="text-[10px] text-slate-600 line-clamp-1">Check your PNR status instantly</p>
          </div>
        </button>

        {/* Card 3: Seat Availability */}
        <button
          type="button"
          onClick={() => onNavigateTab('digital-twin')}
          className="bg-white hover:bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 flex items-center space-x-3 text-left transition-all hover:-translate-y-0.5 shadow-sm shadow-slate-200/40 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-full bg-teal-50 border border-teal-200/60 flex items-center justify-center text-teal-600 shrink-0 group-hover:scale-105 transition-transform">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-extrabold text-slate-800 group-hover:text-[#FF671F] transition-colors">Seat Availability</h4>
            <p className="text-[10px] text-slate-600 line-clamp-1">Digital Twin & availability</p>
          </div>
        </button>

        {/* Card 4: Station Info */}
        <button
          type="button"
          onClick={() => onNavigateTab('crowd')}
          className="bg-white hover:bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 flex items-center space-x-3 text-left transition-all hover:-translate-y-0.5 shadow-sm shadow-slate-200/40 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-full bg-orange-50 border border-orange-200/60 flex items-center justify-center text-[#FF671F] shrink-0 group-hover:scale-105 transition-transform">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-extrabold text-slate-800 group-hover:text-[#FF671F] transition-colors">Station Info</h4>
            <p className="text-[10px] text-slate-600 line-clamp-1">Explore stations & facilities</p>
          </div>
        </button>

        {/* Card 5: 24/7 Support */}
        <button
          type="button"
          onClick={() => onNavigateTab('alerts')}
          className="bg-white hover:bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 flex items-center space-x-3 text-left transition-all hover:-translate-y-0.5 shadow-sm shadow-slate-200/40 cursor-pointer group col-span-2 sm:col-span-1"
        >
          <div className="w-10 h-10 rounded-full bg-sky-50 border border-sky-200/60 flex items-center justify-center text-sky-600 shrink-0 group-hover:scale-105 transition-transform">
            <Headphones className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-extrabold text-slate-800 group-hover:text-[#FF671F] transition-colors">24/7 Support</h4>
            <p className="text-[10px] text-slate-600 line-clamp-1">Safety alerts & IoT monitor</p>
          </div>
        </button>
      </div>
    </div>
  );
};
