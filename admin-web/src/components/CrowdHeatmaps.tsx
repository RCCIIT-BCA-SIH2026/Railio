import React, { useState } from 'react';
import { Users, Eye, AlertCircle, Sparkles } from 'lucide-react';

export const CrowdHeatmaps: React.FC = () => {
  const [selectedStation, setSelectedStation] = useState<string>('HWH');

  const stationData: Record<string, any> = {
    HWH: {
      name: 'Howrah Junction',
      city: 'Kolkata',
      overall: 82,
      platforms: [
        { num: 1, density: 91, level: 'CRITICAL', count: 480, status: 'RED', notes: 'Surge near Foot-Over-Bridge entry' },
        { num: 2, density: 54, level: 'MODERATE', count: 210, status: 'YELLOW', notes: 'Normal suburban boarding' },
        { num: 3, density: 21, level: 'LOW', count: 85, status: 'GREEN', notes: 'Optimal buffer' },
        { num: 9, density: 84, level: 'HIGH', count: 410, status: 'RED', notes: 'Rajdhani boarding crowd' },
        { num: 21, density: 73, level: 'HIGH', count: 320, status: 'ORANGE', notes: 'Coromandel Express loading' },
      ],
      aiAction: 'Divert oncoming local commuter flow to Platform 3 corridor. Open secondary baggage scanner.',
    },
    NDLS: {
      name: 'New Delhi Railway Station',
      city: 'New Delhi',
      overall: 76,
      platforms: [
        { num: 1, density: 78, level: 'HIGH', count: 380, status: 'ORANGE', notes: 'Ajmeri Gate side surge' },
        { num: 5, density: 62, level: 'MODERATE', count: 260, status: 'YELLOW', notes: 'Vande Bharat transit' },
        { num: 10, density: 45, level: 'MODERATE', count: 180, status: 'YELLOW', notes: 'Pahar Ganj entry' },
        { num: 12, density: 89, level: 'CRITICAL', count: 450, status: 'RED', notes: 'Bihar Sampark Kranti boarding' },
      ],
      aiAction: 'Announce coach position markers 15 mins prior to minimize platform platform dwell.',
    },
    MMCT: {
      name: 'Mumbai Central',
      city: 'Mumbai',
      overall: 51,
      platforms: [
        { num: 1, density: 42, level: 'MODERATE', count: 150, status: 'YELLOW', notes: 'Rajdhani rake parking' },
        { num: 2, density: 38, level: 'LOW', count: 120, status: 'GREEN', notes: 'Clear flow' },
        { num: 5, density: 68, level: 'MODERATE', count: 240, status: 'YELLOW', notes: 'Gandhinagar Vande Bharat' },
      ],
      aiAction: 'All passenger escalators operational. Smooth passenger distribution.',
    },
  };

  const current = stationData[selectedStation] || stationData.HWH;

  return (
    <div className="space-y-6">
      {/* Station Selector Bar */}
      <div className="glass-panel rounded-2xl p-6 border border-rail-border shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-heading text-xl font-bold text-white flex items-center space-x-2">
              <span>Computer Vision Platform Crowd Intelligence</span>
              <span className="px-2.5 py-0.5 text-xs font-bold bg-purple-950 text-purple-400 border border-purple-500/30 rounded-full">
                YOLO CV Model Active
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Live automated person counting, platform density heatmaps, and surge detection
            </p>
          </div>
        </div>

        {/* Station Tabs */}
        <div className="flex items-center space-x-2 bg-slate-950/80 p-1.5 rounded-xl border border-rail-border">
          {Object.keys(stationData).map((code) => (
            <button
              key={code}
              onClick={() => setSelectedStation(code)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                selectedStation === code
                  ? 'bg-rail-orange text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {code} ({stationData[code].name.split(' ')[0]})
            </button>
          ))}
        </div>
      </div>

      {/* Platform Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {current.platforms.map((p: any) => {
          const isRed = p.density > 80;
          const isYellow = p.density > 45 && p.density <= 80;
          const badgeColor = isRed
            ? 'bg-red-950/80 text-red-400 border-red-500/40'
            : isYellow
            ? 'bg-amber-950/80 text-amber-400 border-amber-500/40'
            : 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40';

          return (
            <div
              key={p.num}
              className="glass-panel glass-card-hover rounded-2xl p-5 border border-rail-border shadow-xl relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-heading text-lg font-bold text-white">Platform {p.num}</span>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${badgeColor}`}>
                  {p.level} ({p.density}%)
                </span>
              </div>

              {/* Density Progress Bar */}
              <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden mb-3 border border-rail-border/60">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isRed ? 'bg-red-500' : isYellow ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                  style={{ width: `${p.density}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-slate-400">Detected Count:</span>
                <span className="font-mono font-bold text-white">{p.count} Persons</span>
              </div>

              <p className="text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-lg border border-rail-border/40">
                {p.notes}
              </p>
            </div>
          );
        })}
      </div>

      {/* AI Crowd Mitigation Recommendation */}
      <div className="glass-panel rounded-2xl p-5 border border-rail-border shadow-xl flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-rail-orange/20 border border-rail-orange/40 flex items-center justify-center text-rail-orange">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-rail-orange uppercase tracking-wider">
              AI Crowd Flow Directive
            </div>
            <div className="text-sm font-semibold text-white">{current.aiAction}</div>
          </div>
        </div>

        <button
          onClick={() => alert(`Crowd advisory broadcast to ${current.name} public address system & station display boards.`)}
          className="px-4 py-2 bg-rail-orange hover:bg-rail-saffron text-white rounded-lg text-xs font-bold transition shadow-md shadow-rail-orange/20"
        >
          Broadcast to Station PA
        </button>
      </div>
    </div>
  );
};
