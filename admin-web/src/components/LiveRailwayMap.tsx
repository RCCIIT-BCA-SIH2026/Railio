import React, { useState, useMemo } from 'react';
import { 
  Train as TrainIcon, Navigation, AlertTriangle, ShieldCheck, MapPin, 
  Gauge, Clock, Layers, Globe, Filter, Zap, Activity
} from 'lucide-react';
import { LiveTrain, TrackSection } from '../types';

interface LiveRailwayMapProps {
  trains: LiveTrain[];
  trackSections?: TrackSection[];
  onSelectTrain?: (train: LiveTrain) => void;
  selectedZone?: string;
  onSelectZone?: (zone: string) => void;
}

export const LiveRailwayMap: React.FC<LiveRailwayMapProps> = ({ 
  trains, 
  trackSections = [], 
  onSelectTrain,
  selectedZone: propZone,
  onSelectZone
}) => {
  const [activeZoneFilter, setActiveZoneFilter] = useState<string>(propZone || 'ALL');
  const [trainTypeFilter, setTrainTypeFilter] = useState<string>('ALL');
  const [selectedTrain, setSelectedTrain] = useState<LiveTrain | null>(trains[0] || null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const currentZone = propZone || activeZoneFilter;

  const handleZoneChange = (zone: string) => {
    setActiveZoneFilter(zone);
    if (onSelectZone) onSelectZone(zone);
  };

  // Nationwide Major Hub Stations for SVG Mapping
  const nationalHubs = useMemo(() => [
    { code: 'NDLS', name: 'New Delhi', zone: 'NR', x: 420, y: 150, isJn: true },
    { code: 'CNB', name: 'Kanpur', zone: 'NCR', x: 490, y: 185, isJn: true },
    { code: 'PRYJ', name: 'Prayagraj', zone: 'NCR', x: 530, y: 205, isJn: true },
    { code: 'DDU', name: 'Pt Deen Dayal Upadhyaya', zone: 'ECR', x: 565, y: 215, isJn: true },
    { code: 'DHN', name: 'Dhanbad', zone: 'ECR', x: 620, y: 235, isJn: true },
    { code: 'ASN', name: 'Asansol', zone: 'ER', x: 650, y: 240, isJn: true },
    { code: 'BWN', name: 'Barddhaman', zone: 'ER', x: 680, y: 248, isJn: true },
    { code: 'HWH', name: 'Howrah / Kolkata', zone: 'ER', x: 720, y: 260, isJn: true },
    { code: 'SDAH', name: 'Sealdah', zone: 'ER', x: 730, y: 265, isJn: true },
    { code: 'GHY', name: 'Guwahati', zone: 'NFR', x: 820, y: 175, isJn: true },
    { code: 'JP', name: 'Jaipur', zone: 'NWR', x: 380, y: 180, isJn: true },
    { code: 'ADI', name: 'Ahmedabad', zone: 'WR', x: 310, y: 240, isJn: true },
    { code: 'BRC', name: 'Vadodara', zone: 'WR', x: 330, y: 260, isJn: true },
    { code: 'ST', name: 'Surat', zone: 'WR', x: 330, y: 290, isJn: true },
    { code: 'MMCT', name: 'Mumbai Central', zone: 'WR', x: 320, y: 330, isJn: true },
    { code: 'CSMT', name: 'Mumbai CSMT', zone: 'CR', x: 330, y: 335, isJn: true },
    { code: 'PUNE', name: 'Pune', zone: 'CR', x: 360, y: 355, isJn: true },
    { code: 'BSL', name: 'Bhusawal', zone: 'CR', x: 420, y: 285, isJn: true },
    { code: 'NGP', name: 'Nagpur', zone: 'CR', x: 490, y: 280, isJn: true },
    { code: 'BPL', name: 'Bhopal', zone: 'WCR', x: 440, y: 240, isJn: true },
    { code: 'BSP', name: 'Bilaspur', zone: 'SECR', x: 580, y: 275, isJn: true },
    { code: 'BBS', name: 'Bhubaneswar', zone: 'ECoR', x: 670, y: 310, isJn: true },
    { code: 'VSKP', name: 'Visakhapatnam', zone: 'ECoR', x: 620, y: 370, isJn: true },
    { code: 'SC', name: 'Secunderabad', zone: 'SCR', x: 470, y: 375, isJn: true },
    { code: 'BZA', name: 'Vijayawada', zone: 'SCR', x: 530, y: 400, isJn: true },
    { code: 'MAS', name: 'Chennai Central', zone: 'SR', x: 520, y: 460, isJn: true },
    { code: 'SBC', name: 'Bengaluru', zone: 'SWR', x: 440, y: 470, isJn: true },
    { code: 'MYS', name: 'Mysuru', zone: 'SWR', x: 420, y: 490, isJn: true },
    { code: 'MAO', name: 'Madgaon (Goa)', zone: 'KR', x: 330, y: 420, isJn: true },
    { code: 'TVC', name: 'Thiruvananthapuram', zone: 'SR', x: 410, y: 560, isJn: true },
  ], []);

  // Trunk Corridors Connections (Golden Quadrilateral & Diagonals)
  const trunkConnections = useMemo(() => [
    // Delhi - Kolkata Trunk
    { u: 'NDLS', v: 'CNB' }, { u: 'CNB', v: 'PRYJ' }, { u: 'PRYJ', v: 'DDU' },
    { u: 'DDU', v: 'DHN' }, { u: 'DHN', v: 'ASN' }, { u: 'ASN', v: 'BWN' },
    { u: 'BWN', v: 'HWH' }, { u: 'BWN', v: 'SDAH' }, { u: 'HWH', v: 'GHY' },
    
    // Delhi - Mumbai Trunk
    { u: 'NDLS', v: 'JP' }, { u: 'JP', v: 'ADI' }, { u: 'ADI', v: 'BRC' },
    { u: 'BRC', v: 'ST' }, { u: 'ST', v: 'MMCT' }, { u: 'NDLS', v: 'BPL' },
    
    // Central & Southern Diagonal
    { u: 'BPL', v: 'BSL' }, { u: 'BSL', v: 'NGP' }, { u: 'NGP', v: 'BSP' },
    { u: 'MMCT', v: 'CSMT' }, { u: 'CSMT', v: 'PUNE' }, { u: 'PUNE', v: 'SC' },
    { u: 'NGP', v: 'SC' }, { u: 'SC', v: 'BZA' }, { u: 'BZA', v: 'MAS' },
    { u: 'MAS', v: 'SBC' }, { u: 'SBC', v: 'MYS' }, { u: 'SBC', v: 'TVC' },
    
    // Coastal Trunks
    { u: 'HWH', v: 'BBS' }, { u: 'BBS', v: 'VSKP' }, { u: 'VSKP', v: 'BZA' },
    { u: 'CSMT', v: 'MAO' }, { u: 'MAO', v: 'SBC' }
  ], []);

  // Filtered Trains
  const filteredTrains = useMemo(() => {
    return trains.filter((t) => {
      if (currentZone !== 'ALL' && t.zone?.toUpperCase() !== currentZone.toUpperCase()) {
        return false;
      }
      if (trainTypeFilter !== 'ALL' && t.type?.toUpperCase() !== trainTypeFilter.toUpperCase()) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          t.trainNumber.toLowerCase().includes(q) ||
          t.name.toLowerCase().includes(q) ||
          (t.source && t.source.toLowerCase().includes(q)) ||
          (t.destination && t.destination.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [trains, currentZone, trainTypeFilter, searchQuery]);

  // Project GPS Lat/Lng to SVG Canvas Coordinates (Mercator Approximation for India)
  // Lat: ~8°N to 34°N -> Y: 570 to 110
  // Lng: ~68°E to 96°E -> X: 220 to 860
  const projectCoords = (lat: number, lng: number) => {
    const minLat = 7.5, maxLat = 33.5;
    const minLng = 68.0, maxLng = 94.0;
    const x = 220 + ((lng - minLng) / (maxLng - minLng)) * 640;
    const y = 570 - ((lat - minLat) / (maxLat - minLat)) * 460;
    return { x: Math.max(80, Math.min(900, x)), y: Math.max(60, Math.min(580, y)) };
  };

  const zonesMenu = [
    { code: 'ALL', name: 'All 18 Zones' },
    { code: 'NR', name: 'Northern (NR)' },
    { code: 'ER', name: 'Eastern (ER)' },
    { code: 'WR', name: 'Western (WR)' },
    { code: 'CR', name: 'Central (CR)' },
    { code: 'SR', name: 'Southern (SR)' },
    { code: 'SCR', name: 'South Central' },
    { code: 'SWR', name: 'South Western' },
    { code: 'ECR', name: 'East Central' },
    { code: 'NCR', name: 'North Central' },
    { code: 'NWR', name: 'North Western' },
    { code: 'NFR', name: 'Northeast Frontier' },
    { code: 'SER', name: 'South Eastern' },
    { code: 'SECR', name: 'South East Central' },
    { code: 'ECoR', name: 'East Coast' },
    { code: 'WCR', name: 'West Central' },
    { code: 'KR', name: 'Konkan Railway' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Interactive Map Visualizer */}
      <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden flex flex-col">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-rail-orange shadow-sm shrink-0">
              <Globe className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-heading text-base font-bold text-slate-900 flex items-center space-x-2">
                <span>Nationwide Multi-Zone Train Radar</span>
                <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {filteredTrains.length.toLocaleString()} ACTIVE
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Golden Quadrilateral & Regional Network • 18 Operational Zones • Vectorized Telemetry
              </p>
            </div>
          </div>

          {/* Zone & Category Selector */}
          <div className="flex items-center space-x-2 shrink-0">
            <select
              value={currentZone}
              onChange={(e) => handleZoneChange(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#FF671F] cursor-pointer"
            >
              {zonesMenu.map((z) => (
                <option key={z.code} value={z.code}>
                  {z.name}
                </option>
              ))}
            </select>

            <select
              value={trainTypeFilter}
              onChange={(e) => setTrainTypeFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#FF671F] cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              <option value="VANDE_BHARAT">Vande Bharat</option>
              <option value="RAJDHANI">Rajdhani / SF</option>
              <option value="SUBURBAN_EMU">Suburban Local</option>
              <option value="FREIGHT_BOXN">BOXN Freight</option>
            </select>
          </div>
        </div>

        {/* SVG Railway Network Canvas */}
        <div className="relative flex-1 min-h-[500px] bg-[#0F172A] rounded-xl border border-slate-800 p-2 overflow-hidden flex items-center justify-center shadow-inner">
          <svg viewBox="0 0 960 620" className="w-full h-full select-none">
            <defs>
              <linearGradient id="trunkGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#FF671F" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0.8" />
              </linearGradient>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Background Grid Pattern */}
            <g opacity="0.08">
              {Array.from({ length: 20 }).map((_, i) => (
                <line key={`grid-x-${i}`} x1={i * 50} y1="0" x2={i * 50} y2="620" stroke="#94A3B8" strokeWidth="1" />
              ))}
              {Array.from({ length: 14 }).map((_, i) => (
                <line key={`grid-y-${i}`} x1="0" y1={i * 50} x2="960" y2={i * 50} stroke="#94A3B8" strokeWidth="1" />
              ))}
            </g>

            {/* Nationwide Trunk Railway Lines */}
            <g>
              {trunkConnections.map((conn, idx) => {
                const uStn = nationalHubs.find((h) => h.code === conn.u);
                const vStn = nationalHubs.find((h) => h.code === conn.v);
                if (!uStn || !vStn) return null;
                return (
                  <g key={`trunk-${idx}`}>
                    {/* Track Bed Base */}
                    <line
                      x1={uStn.x}
                      y1={uStn.y}
                      x2={vStn.x}
                      y2={vStn.y}
                      stroke="#1E293B"
                      strokeWidth="6"
                      strokeLinecap="round"
                    />
                    {/* Live Electrified Rail Track */}
                    <line
                      x1={uStn.x}
                      y1={uStn.y}
                      x2={vStn.x}
                      y2={vStn.y}
                      stroke="#334155"
                      strokeWidth="2.5"
                    />
                    {/* Telemetry Pulse Line */}
                    <line
                      x1={uStn.x}
                      y1={uStn.y}
                      x2={vStn.x}
                      y2={vStn.y}
                      stroke="url(#trunkGlow)"
                      strokeWidth="1.2"
                      strokeDasharray="4 6"
                      opacity="0.6"
                    />
                  </g>
                );
              })}
            </g>

            {/* Junction Station Nodes */}
            <g>
              {nationalHubs.map((hub) => (
                <g key={`hub-${hub.code}`} className="cursor-pointer group">
                  {/* Outer Radar Ring */}
                  <circle
                    cx={hub.x}
                    cy={hub.y}
                    r="8"
                    fill="none"
                    stroke="#FF671F"
                    strokeWidth="1"
                    opacity="0.3"
                    className="animate-ping"
                  />
                  {/* Station Node Base */}
                  <circle
                    cx={hub.x}
                    cy={hub.y}
                    r="5"
                    fill="#0F172A"
                    stroke="#FF671F"
                    strokeWidth="2"
                  />
                  <circle
                    cx={hub.x}
                    cy={hub.y}
                    r="2.5"
                    fill="#38BDF8"
                  />
                  {/* Station Code Label */}
                  <text
                    x={hub.x}
                    y={hub.y - 8}
                    textAnchor="middle"
                    fill="#E2E8F0"
                    fontSize="9.5"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {hub.code}
                  </text>
                </g>
              ))}
            </g>

            {/* Active Moving Trains Across India */}
            <g>
              {filteredTrains.slice(0, 350).map((train, idx) => {
                const pos = projectCoords(train.lat || 22.57, train.lng || 88.36);
                const isSelected = selectedTrain?.trainNumber === train.trainNumber;
                const isDelayed = train.delayMinutes > 5;
                const isCritical = train.delayMinutes > 30;

                const trainColor = isCritical ? '#EF4444' : (isDelayed ? '#F59E0B' : '#10B981');

                return (
                  <g
                    key={`train-marker-${train.trainNumber}-${idx}`}
                    transform={`translate(${pos.x}, ${pos.y})`}
                    onClick={() => {
                      setSelectedTrain(train);
                      if (onSelectTrain) onSelectTrain(train);
                    }}
                    className="cursor-pointer transition-all duration-300"
                  >
                    {/* Selected Halo */}
                    {isSelected && (
                      <circle
                        cx="0"
                        cy="0"
                        r="14"
                        fill="none"
                        stroke="#38BDF8"
                        strokeWidth="2"
                        strokeDasharray="3 3"
                        className="animate-spin-slow"
                      />
                    )}

                    {/* Speed Glow Halo */}
                    <circle
                      cx="0"
                      cy="0"
                      r="7"
                      fill={trainColor}
                      opacity="0.25"
                    />

                    {/* Train Marker Bullet */}
                    <circle
                      cx="0"
                      cy="0"
                      r="4"
                      fill={trainColor}
                      stroke="#FFFFFF"
                      strokeWidth="1.2"
                    />

                    {/* Hover Tooltip / Mini Label */}
                    {isSelected && (
                      <g transform="translate(0, -14)">
                        <rect
                          x="-45"
                          y="-16"
                          width="90"
                          height="16"
                          rx="4"
                          fill="#1E293B"
                          stroke="#38BDF8"
                          strokeWidth="1"
                        />
                        <text
                          x="0"
                          y="-5"
                          textAnchor="middle"
                          fill="#FFFFFF"
                          fontSize="8.5"
                          fontWeight="bold"
                        >
                          #{train.trainNumber} ({train.speed} km/h)
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Bottom Live Legend Overlay */}
          <div className="absolute bottom-3 left-3 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl px-3 py-1.5 flex items-center space-x-4 text-[10px] text-slate-300">
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>On-Time (&lt;5m)</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Delayed (5-30m)</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Critical (&gt;30m)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Train Telemetry & Operational Profile Drawer */}
      <div className="space-y-4">
        {selectedTrain ? (
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-orange-50 text-rail-orange flex items-center justify-center font-bold text-xs">
                  <TrainIcon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">#{selectedTrain.trainNumber}</h4>
                  <p className="text-[10px] text-slate-500 font-semibold">{selectedTrain.name}</p>
                </div>
              </div>
              <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full ${
                selectedTrain.delayMinutes <= 5 
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                  : (selectedTrain.delayMinutes > 30 ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-amber-50 text-amber-700 border border-amber-200')
              }`}>
                {selectedTrain.delayMinutes > 0 ? `+${selectedTrain.delayMinutes}m DELAY` : 'ON TIME'}
              </span>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                <div className="text-[9px] font-bold text-slate-400 uppercase">ZONE</div>
                <div className="text-xs font-extrabold text-slate-800">{selectedTrain.zone || 'NR'}</div>
              </div>
              <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                <div className="text-[9px] font-bold text-slate-400 uppercase">SPEED</div>
                <div className="text-xs font-extrabold text-indigo-600">{selectedTrain.speed} km/h</div>
              </div>
              <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                <div className="text-[9px] font-bold text-slate-400 uppercase">SECTION</div>
                <div className="text-xs font-extrabold text-slate-700 truncate">{selectedTrain.currentSection || 'BLK-01'}</div>
              </div>
            </div>

            {/* Explanations & Delay Attributions */}
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">XAI DELAY ATTRIBUTION</label>
              <div className="mt-1.5 space-y-1.5">
                {selectedTrain.delayReasons && selectedTrain.delayReasons.length > 0 ? (
                  selectedTrain.delayReasons.map((r, i) => (
                    <div key={i} className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <span className="text-slate-700 font-medium text-[11px]">{r.factor}</span>
                      <span className="text-amber-600 font-bold text-[11px]">+{r.impactMin}m</span>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-500 bg-emerald-50 text-emerald-700 p-2 rounded-lg border border-emerald-100 font-medium text-[11px]">
                    Track is green with nominal physics kinematics. No caution orders active.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center text-slate-400 text-xs">
            Select any live train marker on the radar to inspect telemetry and AI delay attribution.
          </div>
        )}

        {/* High-Speed Fleet Density Distribution */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-2">
          <h4 className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
            <Layers className="w-3.5 h-3.5 text-[#FF671F]" />
            <span>Zone Fleet Distribution</span>
          </h4>
          <div className="grid grid-cols-3 gap-1.5 text-[10px]">
            <div className="bg-blue-50 text-blue-800 p-1.5 rounded-lg text-center font-bold">NR: 820 trains</div>
            <div className="bg-emerald-50 text-emerald-800 p-1.5 rounded-lg text-center font-bold">ER: 740 trains</div>
            <div className="bg-amber-50 text-amber-800 p-1.5 rounded-lg text-center font-bold">WR: 680 trains</div>
            <div className="bg-rose-50 text-rose-800 p-1.5 rounded-lg text-center font-bold">CR: 620 trains</div>
            <div className="bg-purple-50 text-purple-800 p-1.5 rounded-lg text-center font-bold">SR: 540 trains</div>
            <div className="bg-cyan-50 text-cyan-800 p-1.5 rounded-lg text-center font-bold">SCR: 490 trains</div>
          </div>
        </div>
      </div>
    </div>
  );
};
