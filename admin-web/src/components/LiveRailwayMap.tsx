import React, { useState } from 'react';
import { Train as TrainIcon, Navigation, AlertTriangle, ShieldCheck, MapPin, Gauge, Clock, Layers } from 'lucide-react';
import { LiveTrain, TrackSection } from '../types';

interface LiveRailwayMapProps {
  trains: LiveTrain[];
  trackSections: TrackSection[];
  onSelectTrain?: (train: LiveTrain) => void;
}

export const LiveRailwayMap: React.FC<LiveRailwayMapProps> = ({ trains, trackSections, onSelectTrain }) => {
  const [selectedTrain, setSelectedTrain] = useState<LiveTrain | null>(trains[0] || null);

  // Auto-select first train when list loads if none is selected
  React.useEffect(() => {
    if (!selectedTrain && trains.length > 0) {
      setSelectedTrain(trains[0]);
    }
  }, [trains, selectedTrain]);

  // Sealdah - Dankuni Suburban Corridor Stations (28.0 km SSOT)
  const stationNodes = [
    { code: 'SDAH', name: 'Sealdah Terminal', x: 100, y: 280, km: '0.0 km', platforms: 21, isJn: true },
    { code: 'BNXR', name: 'Bidhan Nagar Road', x: 245, y: 280, km: '4.0 km', platforms: 4, isJn: false },
    { code: 'DDJ', name: 'Dum Dum Junction', x: 400, y: 280, km: '7.0 km', platforms: 5, isJn: true },
    { code: 'BARN', name: 'Baranagar Road', x: 550, y: 280, km: '12.0 km', platforms: 2, isJn: false },
    { code: 'DAKE', name: 'Dakshineswar', x: 700, y: 280, km: '15.0 km', platforms: 4, isJn: false },
    { code: 'DKAE', name: 'Dankuni Junction', x: 860, y: 280, km: '28.0 km', platforms: 5, isJn: true },
  ];

  // 5 Block Sections along the corridor
  const sections = [
    { id: 'SDAH-BNXR-SUB1', from: 'SDAH', to: 'BNXR', length: '4.0 km', x1: 100, x2: 245 },
    { id: 'BNXR-DDJ-SUB2', from: 'BNXR', to: 'DDJ', length: '3.0 km', x1: 245, x2: 400 },
    { id: 'DDJ-BARN-SUB3', from: 'DDJ', to: 'BARN', length: '5.0 km', x1: 400, x2: 550 },
    { id: 'BARN-DAKE-SUB4', from: 'BARN', to: 'DAKE', length: '3.0 km', x1: 550, x2: 700 },
    { id: 'DAKE-DKAE-SUB5', from: 'DAKE', to: 'DKAE', length: '13.0 km', x1: 700, x2: 860 },
  ];

  // Calculate pixel positions for live trains along UP/DOWN tracks
  const getTrainCoord = (train: LiveTrain, index: number) => {
    const isUp = (train.trainNumber ? parseInt(train.trainNumber, 10) % 2 === 1 : index % 2 === 1) ||
                 (train.direction === 'UP') ||
                 (train.name && train.name.includes('Dankuni Local'));
    
    // UP trains run on top track (y: 250), DOWN trains run on bottom track (y: 310)
    const yTrack = isUp ? 248 : 312;

    const sec = sections.find((s) => s.id === train.currentSection) || sections[index % sections.length];
    // Spread trains along section if multiple are present
    const progressOffset = 0.25 + ((index * 0.35) % 0.5);
    const xTrack = sec.x1 + (sec.x2 - sec.x1) * (isUp ? progressOffset : (1 - progressOffset));

    return { x: xTrack, y: yTrack, isUp };
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Interactive Map Visualizer */}
      <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-rail-orange shadow-sm">
              <Navigation className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-heading text-base font-bold text-slate-900 flex items-center space-x-2">
                <span>Sealdah – Dankuni Suburban Corridor Digital Twin</span>
                <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  REAL-TIME EMU GPS
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                28.0 km high-density electrified EMU corridor (6 Stations • 5 Block Sections • 40 Daily Locals)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <div className="flex items-center space-x-1.5 text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>On Time</span>
            </div>
            <div className="flex items-center space-x-1.5 text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>Delayed (&gt;3m)</span>
            </div>
            <div className="flex items-center space-x-1.5 text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>Track Alert</span>
            </div>
          </div>
        </div>

        {/* SVG Railway Network Canvas */}
        <div className="relative flex-1 min-h-[460px] bg-[#F8FAFC] rounded-xl border border-slate-200 p-2 overflow-hidden flex items-center justify-center">
          <svg viewBox="0 0 960 480" className="w-full h-full select-none">
            <defs>
              <linearGradient id="trackGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0284C7" />
                <stop offset="50%" stopColor="#0EA5E9" />
                <stop offset="100%" stopColor="#0284C7" />
              </linearGradient>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Grid Pattern */}
            <g stroke="rgba(0,0,0,0.03)" strokeWidth="1">
              {Array.from({ length: 10 }).map((_, i) => (
                <line key={`h-${i}`} x1="0" y1={i * 50} x2="960" y2={i * 50} />
              ))}
              {Array.from({ length: 20 }).map((_, i) => (
                <line key={`v-${i}`} x1={i * 50} y1="0" x2={i * 50} y2={480} />
              ))}
            </g>

            {/* Line Category Headers */}
            <g transform="translate(40, 190)">
              <rect width="180" height="24" rx="6" fill="#0284C7" fillOpacity="0.1" />
              <text x="10" y="16" fill="#0369A1" fontSize="11" fontWeight="bold" fontFamily="Inter">
                ▲ UP LINE (Sealdah ➔ Dankuni)
              </text>
            </g>
            <g transform="translate(40, 360)">
              <rect width="180" height="24" rx="6" fill="#EA580C" fillOpacity="0.1" />
              <text x="10" y="16" fill="#C2410C" fontSize="11" fontWeight="bold" fontFamily="Inter">
                ▼ DOWN LINE (Dankuni ➔ Sealdah)
              </text>
            </g>

            {/* Track Sections (UP & DOWN Double Track lines) */}
            {sections.map((sec, i) => {
              const hasAlert = sec.id === 'DAKE-DKAE-SUB5';
              return (
                <g key={sec.id}>
                  {/* UP Line Track Section */}
                  <line
                    x1={sec.x1}
                    y1={248}
                    x2={sec.x2}
                    y2={248}
                    stroke={hasAlert ? '#F97316' : '#94A3B8'}
                    strokeWidth={hasAlert ? 4 : 3}
                    strokeDasharray={hasAlert ? '6 4' : undefined}
                  />

                  {/* DOWN Line Track Section */}
                  <line
                    x1={sec.x1}
                    y1={312}
                    x2={sec.x2}
                    y2={312}
                    stroke={hasAlert ? '#F97316' : '#94A3B8'}
                    strokeWidth={hasAlert ? 4 : 3}
                    strokeDasharray={hasAlert ? '6 4' : undefined}
                  />

                  {/* Section Label & Distance */}
                  <g transform={`translate(${(sec.x1 + sec.x2) / 2}, 280)`}>
                    <rect x="-42" y="-10" width="84" height="20" rx="4" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1" />
                    <text
                      x="0"
                      y="4"
                      textAnchor="middle"
                      fill="#64748B"
                      fontSize="9"
                      fontFamily="Inter"
                      fontWeight="bold"
                    >
                      {sec.length}
                    </text>
                  </g>

                  {/* Block Section Code Below */}
                  <text
                    x={(sec.x1 + sec.x2) / 2}
                    y="348"
                    textAnchor="middle"
                    fill="#94A3B8"
                    fontSize="8.5"
                    fontFamily="monospace"
                  >
                    {sec.id}
                  </text>
                </g>
              );
            })}

            {/* Station Hub Nodes */}
            {stationNodes.map((s, i) => (
              <g key={s.code} className="cursor-pointer group">
                {/* Station Pillar Line */}
                <line x1={s.x} y1={215} x2={s.x} y2={345} stroke="#CBD5E1" strokeWidth="2" strokeDasharray="2 2" />

                {/* Upper Track Node */}
                <circle cx={s.x} cy={248} r="6" fill="#FFFFFF" stroke="#0284C7" strokeWidth="2.5" />
                <circle cx={s.x} cy={248} r="2.5" fill="#0284C7" />

                {/* Lower Track Node */}
                <circle cx={s.x} cy={312} r="6" fill="#FFFFFF" stroke="#EA580C" strokeWidth="2.5" />
                <circle cx={s.x} cy={312} r="2.5" fill="#EA580C" />

                {/* Station Name & Info Header */}
                <g transform={`translate(${s.x}, 145)`}>
                  <rect
                    x={s.isJn ? -48 : -40}
                    y="-22"
                    width={s.isJn ? 96 : 80}
                    height="36"
                    rx="6"
                    fill="#FFFFFF"
                    stroke={s.isJn ? '#0284C7' : '#E2E8F0'}
                    strokeWidth={s.isJn ? 1.5 : 1}
                    className="shadow-sm group-hover:stroke-rail-orange transition"
                  />
                  <text
                    x="0"
                    y="-7"
                    textAnchor="middle"
                    fill="#0F172A"
                    fontSize="11"
                    fontFamily="Inter"
                    fontWeight="800"
                  >
                    {s.code}
                  </text>
                  <text
                    x="0"
                    y="7"
                    textAnchor="middle"
                    fill="#64748B"
                    fontSize="8"
                    fontFamily="Inter"
                  >
                    {s.km} • {s.platforms} PF
                  </text>
                </g>

                {/* Station Full Name Below */}
                <text
                  x={s.x}
                  y={385}
                  textAnchor="middle"
                  fill="#334155"
                  fontSize="10"
                  fontFamily="Inter"
                  fontWeight="600"
                  className="group-hover:fill-rail-orange transition"
                >
                  {s.name}
                </text>
              </g>
            ))}

            {/* Live Moving Train Markers */}
            {trains.map((train, i) => {
              const coord = getTrainCoord(train, i);
              const isSelected = selectedTrain?.trainNumber === train.trainNumber;
              const isDelayed = (train.delayMinutes || 0) > 3;
              const markerColor = isDelayed ? '#D97706' : '#10B981';

              return (
                <g
                  key={train.trainNumber || i}
                  className="cursor-pointer transition-all duration-700"
                  onClick={() => setSelectedTrain(train)}
                >
                  {/* Outer Pulsing Aura */}
                  <circle
                    cx={coord.x}
                    cy={coord.y}
                    r={isSelected ? 18 : 12}
                    fill={markerColor}
                    fillOpacity={0.2}
                    className="animate-pulse-glow"
                  />
                  <circle
                    cx={coord.x}
                    cy={coord.y}
                    r={isSelected ? 9 : 7}
                    fill={markerColor}
                    stroke="#FFFFFF"
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    filter="url(#glow)"
                  />

                  {/* Train Label Badge */}
                  <g transform={`translate(${coord.x - 28}, ${coord.y + (coord.isUp ? -24 : 14)})`}>
                    <rect
                      width="56"
                      height="16"
                      rx="4"
                      fill="#FFFFFF"
                      stroke={isSelected ? '#FF671F' : markerColor}
                      strokeWidth={isSelected ? 2 : 1.5}
                      className="shadow-sm"
                    />
                    <text
                      x="28"
                      y="11.5"
                      fill="#0F172A"
                      fontSize="9"
                      fontFamily="Inter"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {train.trainNumber}
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>

          {/* Map Controls Floating Badge */}
          <div className="absolute bottom-3 left-3 flex items-center space-x-2 bg-white/95 border border-slate-200 px-3 py-1.5 rounded-lg text-xs text-slate-700 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-rail-orange animate-ping" />
            <span className="font-medium">Corridor Digital Twin Active ({trains.length} EMU Rakes Tracked)</span>
          </div>
        </div>
      </div>

      {/* Selected Train Live Telemetry & XAI Breakdown Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center text-rail-orange shadow-sm">
                <TrainIcon className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-heading font-bold text-slate-900 text-sm">
                  {selectedTrain?.name || 'Sealdah - Dankuni Local'}
                </h4>
                <p className="text-[11px] text-slate-500">EMU Local #{selectedTrain?.trainNumber || '32211'} (12 Coaches C1-C12)</p>
              </div>
            </div>
            <span
              className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                selectedTrain && selectedTrain.delayMinutes > 3
                  ? 'bg-amber-50 border-amber-200 text-amber-700'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700'
              }`}
            >
              {selectedTrain && selectedTrain.delayMinutes > 0 ? `+${selectedTrain.delayMinutes}m Delay` : 'On Time'}
            </span>
          </div>

          {/* Live Telemetry Metrics */}
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

          {/* Section & Location Info */}
          <div className="space-y-2 text-xs mb-4">
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Current Block Section:</span>
              <span className="font-mono font-bold text-slate-800">{selectedTrain?.currentSection || 'SDAH-BNXR-SUB1'}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">AI Model R² Accuracy:</span>
              <span className="font-bold text-emerald-600">0.9862 (98.6%)</span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-slate-500">OHE Traction Status:</span>
              <span className="font-semibold text-slate-800">25 kV AC Suburban OHE Active</span>
            </div>
          </div>

          {/* Explainable AI Delay Attribution Section */}
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

        {/* Action Controls */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex space-x-2">
          <button
            onClick={() => alert(`Broadcasting speed advisory to Motorman of EMU Local ${selectedTrain?.trainNumber}`)}
            className="flex-1 py-2 px-3 bg-rail-orange hover:bg-rail-saffron text-white rounded-lg text-xs font-bold transition shadow-sm"
          >
            Issue Motorman Advisory
          </button>
          <button
            onClick={() => alert(`Precedence simulator opened for EMU Local ${selectedTrain?.trainNumber}`)}
            className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 transition"
          >
            Simulate Precedence
          </button>
        </div>
      </div>
    </div>
  );
};

