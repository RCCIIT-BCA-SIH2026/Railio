import React, { useState } from 'react';
import { Train as TrainIcon, Navigation, AlertTriangle, ShieldCheck, MapPin, Gauge, Clock } from 'lucide-react';
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

  // Scaled coordinates mapping for Indian Railway Corridors (SVG Viewbox: 0 0 1000 700)
  const stationNodes = [
    { code: 'NDLS', name: 'New Delhi', x: 260, y: 150, zone: 'NR' },
    { code: 'CNB', name: 'Kanpur Central', x: 400, y: 220, zone: 'NCR' },
    { code: 'PRYJ', name: 'Prayagraj Jn', x: 480, y: 260, zone: 'NCR' },
    { code: 'DDU', name: 'Pt Deen Dayal Upadhyaya', x: 550, y: 275, zone: 'ECR' },
    { code: 'BSB', name: 'Varanasi', x: 540, y: 250, zone: 'NR' },
    { code: 'PNBE', name: 'Patna', x: 650, y: 270, zone: 'ECR' },
    { code: 'HWH', name: 'Howrah (Kolkata)', x: 780, y: 350, zone: 'ER' },
    { code: 'SDAH', name: 'Sealdah', x: 790, y: 365, zone: 'ER' },
    { code: 'BBS', name: 'Bhubaneswar', x: 720, y: 440, zone: 'ECoR' },
    { code: 'MAS', name: 'Chennai Central', x: 520, y: 600, zone: 'SR' },
    { code: 'SBC', name: 'KSR Bengaluru', x: 440, y: 610, zone: 'SWR' },
    { code: 'MMCT', name: 'Mumbai Central', x: 200, y: 430, zone: 'WR' },
    { code: 'ST', name: 'Surat', x: 210, y: 370, zone: 'WR' },
    { code: 'BRC', name: 'Vadodara', x: 230, y: 320, zone: 'WR' },
    { code: 'ADI', name: 'Ahmedabad', x: 200, y: 280, zone: 'WR' },
    { code: 'JP', name: 'Jaipur', x: 240, y: 210, zone: 'NWR' },
    { code: 'LKO', name: 'Lucknow', x: 430, y: 200, zone: 'NR' },
    { code: 'RNC', name: 'Ranchi', x: 680, y: 330, zone: 'SER' },
  ];

  // Primary railway corridor lines
  const corridors = [
    { from: 'NDLS', to: 'CNB', id: 'CNB-NDLS' },
    { from: 'CNB', to: 'PRYJ', id: 'CNB-PRYJ-S1' },
    { from: 'PRYJ', to: 'DDU', id: 'DDU-PRYJ-B17' },
    { from: 'DDU', to: 'BSB', id: 'DDU-BSB' },
    { from: 'DDU', to: 'PNBE', id: 'DDU-PNBE' },
    { from: 'PNBE', to: 'HWH', id: 'PNBE-HWH' },
    { from: 'HWH', to: 'BBS', id: 'HWH-BBS' },
    { from: 'BBS', to: 'MAS', id: 'BBS-PSA-SEC4' },
    { from: 'MAS', to: 'SBC', id: 'MAS-SBC' },
    { from: 'NDLS', to: 'JP', id: 'NDLS-JP' },
    { from: 'NDLS', to: 'MMCT', id: 'NDLS-MMCT' },
    { from: 'MMCT', to: 'ST', id: 'MMCT-ST' },
    { from: 'ST', to: 'BRC', id: 'ST-BRC-VB8' },
    { from: 'BRC', to: 'ADI', id: 'BRC-ADI' },
    { from: 'CNB', to: 'LKO', id: 'CNB-LKO' },
    { from: 'HWH', to: 'RNC', id: 'HWH-RNC' },
  ];

  // Calculate pixel positions for live trains
  const getTrainCoord = (train: LiveTrain, index: number) => {
    // Coordinate interpolation matching Indian geography
    const lat = train?.lat || 22.58;
    const lng = train?.lng || 88.34;
    // Map Lat (10 to 30) -> Y (650 to 100), Lng (70 to 92) -> X (150 to 850)
    const x = Math.max(120, Math.min(880, 150 + ((lng - 72) / (90 - 72)) * 680));
    const y = Math.max(80, Math.min(640, 620 - ((lat - 12) / (29 - 12)) * 500));
    return { x, y };
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
                <span>National Railway Corridor Digital Twin</span>
                <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  REAL-TIME GPS
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Interactive Indian Railway network topology with live train vector positions & block health
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
              <span>Delayed (&gt;5m)</span>
            </div>
            <div className="flex items-center space-x-1.5 text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>Track Risk</span>
            </div>
          </div>
        </div>

        {/* SVG Railway Network Canvas */}
        <div className="relative flex-1 min-h-[460px] bg-[#F1F5F9] rounded-xl border border-slate-200 p-2 overflow-hidden flex items-center justify-center">
          <svg viewBox="0 0 950 680" className="w-full h-full select-none">
            <defs>
              <linearGradient id="trackGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#94A3B8" />
                <stop offset="100%" stopColor="#64748B" />
              </linearGradient>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Grid Pattern */}
            <g stroke="rgba(0,0,0,0.04)" strokeWidth="1">
              {Array.from({ length: 15 }).map((_, i) => (
                <line key={`h-${i}`} x1="0" y1={i * 50} x2="950" y2={i * 50} />
              ))}
              {Array.from({ length: 20 }).map((_, i) => (
                <line key={`v-${i}`} x1={i * 50} y1="0" x2={i * 50} y2="680" />
              ))}
            </g>

            {/* Track Corridor Lines */}
            {corridors.map((c, i) => {
              const nodeA = stationNodes.find((n) => n.code === c.from);
              const nodeB = stationNodes.find((n) => n.code === c.to);
              if (!nodeA || !nodeB) return null;

              const isRiskSection = c.id === 'CNB-PRYJ-S1' || c.id === 'DDU-PRYJ-B17';
              const lineColor = isRiskSection ? '#EA580C' : '#94A3B8';

              return (
                <g key={i}>
                  <line
                    x1={nodeA.x}
                    y1={nodeA.y}
                    x2={nodeB.x}
                    y2={nodeB.y}
                    stroke={lineColor}
                    strokeWidth={isRiskSection ? 3.5 : 2.5}
                    strokeDasharray={isRiskSection ? '6 4' : undefined}
                    strokeOpacity={0.9}
                  />
                </g>
              );
            })}

            {/* Station Hub Nodes */}
            {stationNodes.map((s, i) => (
              <g key={i} className="cursor-pointer group">
                <circle cx={s.x} cy={s.y} r="6" fill="#FFFFFF" stroke="#0284C7" strokeWidth="2.5" />
                <circle cx={s.x} cy={s.y} r="2.5" fill="#0284C7" />
                <text
                  x={s.x + 9}
                  y={s.y + 4}
                  fill="#475569"
                  fontSize="10"
                  fontFamily="Inter"
                  fontWeight="700"
                  className="group-hover:fill-slate-900 transition-colors"
                >
                  {s.code}
                </text>
              </g>
            ))}

            {/* Live Moving Train Markers */}
            {trains.map((train, i) => {
              const coord = getTrainCoord(train, i);
              const isSelected = selectedTrain?.trainNumber === train.trainNumber;
              const isDelayed = (train.delayMinutes || 0) > 5;
              const isVandeBharat = (train.type || train.name || '').toLowerCase().includes('vande');
              const markerColor = isVandeBharat ? '#FF671F' : isDelayed ? '#D97706' : '#10B981';

              return (
                <g
                  key={train.trainNumber}
                  className="cursor-pointer transition-all duration-700"
                  onClick={() => setSelectedTrain(train)}
                >
                  {/* Outer Pulsing Aura */}
                  <circle
                    cx={coord.x}
                    cy={coord.y}
                    r={isSelected ? 16 : 11}
                    fill={markerColor}
                    fillOpacity={0.2}
                    className="animate-pulse-glow"
                  />
                  <circle
                    cx={coord.x}
                    cy={coord.y}
                    r={isSelected ? 8 : 6}
                    fill={markerColor}
                    stroke="#FFFFFF"
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    filter="url(#glow)"
                  />

                  {/* Train Label Badge */}
                  <g transform={`translate(${coord.x - 28}, ${coord.y - 26})`}>
                    <rect
                      width="56"
                      height="16"
                      rx="4"
                      fill="#FFFFFF"
                      stroke={markerColor}
                      strokeWidth="1.5"
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
            <span className="font-medium">Digital Twin Active ({trains.length} Rakes Tracked)</span>
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
                  {selectedTrain?.name || 'Vande Bharat Express'}
                </h4>
                <p className="text-[11px] text-slate-500">Train #{selectedTrain?.trainNumber || '22436'}</p>
              </div>
            </div>
            <span
              className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                selectedTrain && selectedTrain.delayMinutes > 5
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
                <span>Live Speed</span>
              </div>
              <div className="text-xl font-heading font-extrabold text-slate-900">
                {selectedTrain?.speed || 118} <span className="text-xs font-normal text-slate-500">km/h</span>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
              <div className="flex items-center space-x-1.5 text-slate-500 text-xs mb-1">
                <Clock className="w-3.5 h-3.5 text-rail-orange" />
                <span>Predicted Delay</span>
              </div>
              <div className="text-xl font-heading font-extrabold text-slate-900">
                +{selectedTrain?.predictedDelay || 6} <span className="text-xs font-normal text-slate-500">min</span>
              </div>
            </div>
          </div>

          {/* Section & Location Info */}
          <div className="space-y-2 text-xs mb-4">
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Current Block Section:</span>
              <span className="font-mono font-bold text-slate-800">{selectedTrain?.currentSection || 'CNB-PRYJ-S1'}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">AI Confidence Index:</span>
              <span className="font-bold text-emerald-600">94.2%</span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-slate-500">Traction Status:</span>
              <span className="font-semibold text-slate-800">25 kV AC Overhead 100% OK</span>
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
                <span>• Junction Interlocking Switch:</span>
                <span className="font-mono font-bold text-amber-700">+3 min</span>
              </div>
              <div className="flex items-center justify-between text-slate-700">
                <span>• Weather & Headway Buffer:</span>
                <span className="font-mono font-bold text-slate-500">+1 min</span>
              </div>
              <div className="flex items-center justify-between text-slate-700">
                <span>• Dwell Overshoot:</span>
                <span className="font-mono font-bold text-slate-500">0 min</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex space-x-2">
          <button
            onClick={() => alert(`Broadcasting speed advisory to Driver of Train ${selectedTrain?.trainNumber}`)}
            className="flex-1 py-2 px-3 bg-rail-orange hover:bg-rail-saffron text-white rounded-lg text-xs font-bold transition shadow-sm"
          >
            Issue Speed Advisory
          </button>
          <button
            onClick={() => alert(`Precedence simulator opened for ${selectedTrain?.trainNumber}`)}
            className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 transition"
          >
            Simulate Priority
          </button>
        </div>
      </div>
    </div>
  );
};
