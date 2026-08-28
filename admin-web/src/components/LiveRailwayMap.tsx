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
      <div className="lg:col-span-2 glass-panel rounded-2xl p-5 border border-rail-border shadow-2xl relative overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-rail-orange/20 border border-rail-orange/40 flex items-center justify-center text-rail-orange">
              <Navigation className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-heading text-base font-bold text-white flex items-center space-x-2">
                <span>National Railway Corridor Digital Twin</span>
                <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/40">
                  REAL-TIME GPS
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Interactive Indian Railway network topology with live train vector positions & block health
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <div className="flex items-center space-x-1.5 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span>On Time</span>
            </div>
            <div className="flex items-center space-x-1.5 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span>Delayed (&gt;5m)</span>
            </div>
            <div className="flex items-center space-x-1.5 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <span>Track Risk</span>
            </div>
          </div>
        </div>

        {/* SVG Railway Network Canvas */}
        <div className="relative flex-1 min-h-[460px] bg-slate-950/80 rounded-xl border border-rail-border/60 p-2 overflow-hidden flex items-center justify-center">
          <svg viewBox="0 0 950 680" className="w-full h-full select-none">
            <defs>
              <linearGradient id="trackGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1E4273" />
                <stop offset="100%" stopColor="#0B2545" />
              </linearGradient>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Grid Pattern */}
            <g stroke="rgba(255,255,255,0.03)" strokeWidth="1">
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
              const lineColor = isRiskSection ? '#F59E0B' : '#1E4273';

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
                    strokeOpacity={0.8}
                  />
                </g>
              );
            })}

            {/* Station Hub Nodes */}
            {stationNodes.map((s, i) => (
              <g key={i} className="cursor-pointer group">
                <circle cx={s.x} cy={s.y} r="6" fill="#0B2545" stroke="#38BDF8" strokeWidth="2.5" />
                <circle cx={s.x} cy={s.y} r="2.5" fill="#FFFFFF" />
                <text
                  x={s.x + 9}
                  y={s.y + 4}
                  fill="#94A3B8"
                  fontSize="10"
                  fontFamily="Inter"
                  fontWeight="600"
                  className="group-hover:fill-white transition-colors"
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
              const markerColor = isVandeBharat ? '#FF671F' : isDelayed ? '#F59E0B' : '#10B981';

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
                    fillOpacity={0.25}
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
                      fill="#07162C"
                      stroke={markerColor}
                      strokeWidth="1"
                      fillOpacity="0.9"
                    />
                    <text
                      x="28"
                      y="11"
                      fill="#FFFFFF"
                      fontSize="8.5"
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
          <div className="absolute bottom-3 left-3 flex items-center space-x-2 bg-slate-900/90 border border-rail-border px-3 py-1.5 rounded-lg text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-rail-orange animate-ping" />
            <span>Digital Twin Active ({trains.length} Rakes Tracked)</span>
          </div>
        </div>
      </div>

      {/* Selected Train Live Telemetry & XAI Breakdown Card */}
      <div className="glass-panel rounded-2xl p-5 border border-rail-border shadow-2xl flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between border-b border-rail-border/60 pb-3 mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-rail-orange/20 border border-rail-orange/30 flex items-center justify-center text-rail-orange">
                <TrainIcon className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-heading font-bold text-white text-sm">
                  {selectedTrain?.name || 'Vande Bharat Express'}
                </h4>
                <p className="text-[11px] text-slate-400">Train #{selectedTrain?.trainNumber || '22436'}</p>
              </div>
            </div>
            <span
              className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                selectedTrain && selectedTrain.delayMinutes > 5
                  ? 'bg-amber-950/70 border-amber-500/40 text-amber-400'
                  : 'bg-emerald-950/70 border-emerald-500/40 text-emerald-400'
              }`}
            >
              {selectedTrain && selectedTrain.delayMinutes > 0 ? `+${selectedTrain.delayMinutes}m Delay` : 'On Time'}
            </span>
          </div>

          {/* Live Telemetry Metrics */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-slate-900/80 rounded-xl p-3 border border-rail-border">
              <div className="flex items-center space-x-1.5 text-slate-400 text-xs mb-1">
                <Gauge className="w-3.5 h-3.5 text-rail-cyan" />
                <span>Live Speed</span>
              </div>
              <div className="text-xl font-heading font-extrabold text-white">
                {selectedTrain?.speed || 118} <span className="text-xs font-normal text-slate-400">km/h</span>
              </div>
            </div>

            <div className="bg-slate-900/80 rounded-xl p-3 border border-rail-border">
              <div className="flex items-center space-x-1.5 text-slate-400 text-xs mb-1">
                <Clock className="w-3.5 h-3.5 text-rail-orange" />
                <span>Predicted Delay</span>
              </div>
              <div className="text-xl font-heading font-extrabold text-white">
                +{selectedTrain?.predictedDelay || 6} <span className="text-xs font-normal text-slate-400">min</span>
              </div>
            </div>
          </div>

          {/* Section & Location Info */}
          <div className="space-y-2 text-xs mb-4">
            <div className="flex items-center justify-between py-1.5 border-b border-rail-border/40">
              <span className="text-slate-400">Current Block Section:</span>
              <span className="font-mono font-bold text-slate-200">{selectedTrain?.currentSection || 'CNB-PRYJ-S1'}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-rail-border/40">
              <span className="text-slate-400">AI Confidence Index:</span>
              <span className="font-bold text-emerald-400">94.2%</span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-slate-400">Traction Status:</span>
              <span className="font-semibold text-slate-200">25 kV AC Overhead 100% OK</span>
            </div>
          </div>

          {/* Explainable AI Delay Attribution Section */}
          <div className="bg-slate-900/90 rounded-xl p-3.5 border border-rail-border/80">
            <h5 className="text-xs font-bold text-slate-200 mb-2 flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-rail-orange" />
              <span>Explainable AI (XAI) Attribution</span>
            </h5>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between text-slate-300">
                <span>• Junction Interlocking Switch:</span>
                <span className="font-mono font-bold text-amber-400">+3 min</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>• Weather & Headway Buffer:</span>
                <span className="font-mono font-bold text-slate-400">+1 min</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>• Dwell Overshoot:</span>
                <span className="font-mono font-bold text-slate-400">0 min</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="mt-4 pt-3 border-t border-rail-border/60 flex space-x-2">
          <button
            onClick={() => alert(`Broadcasting speed advisory to Driver of Train ${selectedTrain?.trainNumber}`)}
            className="flex-1 py-2 px-3 bg-rail-orange hover:bg-rail-saffron text-white rounded-lg text-xs font-bold transition shadow-lg shadow-rail-orange/20"
          >
            Issue Speed Advisory
          </button>
          <button
            onClick={() => alert(`Precedence simulator opened for ${selectedTrain?.trainNumber}`)}
            className="py-2 px-3 bg-rail-card hover:bg-slate-800 text-slate-200 rounded-lg text-xs font-semibold border border-rail-border transition"
          >
            Simulate Priority
          </button>
        </div>
      </div>
    </div>
  );
};
