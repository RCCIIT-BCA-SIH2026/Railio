import React, { useState } from 'react';
import { Users, Eye, AlertCircle, Sparkles } from 'lucide-react';

export const CrowdHeatmaps: React.FC = () => {
  const [selectedStation, setSelectedStation] = useState<string>('SDAH');

  const stationData: Record<string, any> = {
    SDAH: {
      name: 'Sealdah Terminal',
      city: 'Kolkata',
      overall: 78,
      platforms: [
        { num: 1, density: 88, level: 'CRITICAL', count: 480, status: 'RED', notes: 'Peak morning commuter surge near Foot-Over-Bridge' },
        { num: 2, density: 72, level: 'HIGH', count: 350, status: 'ORANGE', notes: 'Dankuni Local #32211 boarding crowd' },
        { num: 3, density: 45, level: 'MODERATE', count: 180, status: 'YELLOW', notes: 'Normal suburban passenger flow' },
        { num: 4, density: 25, level: 'LOW', count: 90, status: 'GREEN', notes: 'Optimal buffer platform' },
        { num: 5, density: 60, level: 'MODERATE', count: 240, status: 'YELLOW', notes: 'Incoming rake disembarkation' },
      ],
      aiAction: 'Announce middle coach position markers 5 mins prior to boarding to distribute platform load.',
    },
    DDJ: {
      name: 'Dum Dum Junction',
      city: 'Kolkata',
      overall: 82,
      platforms: [
        { num: 1, density: 92, level: 'CRITICAL', count: 510, status: 'RED', notes: 'Metro interchange passenger crossover' },
        { num: 2, density: 68, level: 'HIGH', count: 320, status: 'ORANGE', notes: 'Dankuni - Sealdah Chord Local #32216 boarding' },
        { num: 3, density: 55, level: 'MODERATE', count: 210, status: 'YELLOW', notes: 'Standard suburban transfer buffer' },
        { num: 4, density: 35, level: 'LOW', count: 120, status: 'GREEN', notes: 'Clear passenger flow' },
      ],
      aiAction: 'Deploy station assistants to FOB staircases. Open secondary exit gates.',
    },
    DAKE: {
      name: 'Dakshineswar',
      city: 'Kolkata',
      overall: 64,
      platforms: [
        { num: 1, density: 75, level: 'HIGH', count: 290, status: 'ORANGE', notes: 'Pilgrim & commuter surge at Vivekananda Setu entry' },
        { num: 2, density: 58, level: 'MODERATE', count: 190, status: 'YELLOW', notes: 'Sealdah bound Local #32218 waiting flow' },
        { num: 3, density: 30, level: 'LOW', count: 85, status: 'GREEN', notes: 'Optimal buffer' },
      ],
      aiAction: 'Guide passengers towards Coaches C1-C3 and C10-C12 using LED indicators.',
    },
    DKAE: {
      name: 'Dankuni Junction',
      city: 'Hooghly',
      overall: 58,
      platforms: [
        { num: 1, density: 65, level: 'MODERATE', count: 220, status: 'YELLOW', notes: 'Morning outbound Sealdah Local #32214 loading' },
        { num: 2, density: 42, level: 'LOW', count: 130, status: 'GREEN', notes: 'Clear transfer line' },
        { num: 3, density: 68, level: 'MODERATE', count: 240, status: 'YELLOW', notes: 'Rake turnaround inspection bay' },
      ],
      aiAction: 'All turnstiles and ticket vending machines operational. Rapid 15-min rake turnaround active.',
    },
  };

  const current = stationData[selectedStation] || stationData.SDAH;

  return (
    <div className="space-y-6">
      {/* Station Selector Bar */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-500/20">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-heading text-xl font-bold text-slate-900 flex items-center space-x-2">
              <span>Computer Vision Platform Crowd Intelligence</span>
              <span className="px-2.5 py-0.5 text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 rounded-full">
                YOLO CV Model Active
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Live CCTV edge inference & passenger density monitoring across Sealdah–Dankuni suburban corridor
            </p>
          </div>
        </div>

        {/* Station Tabs */}
        <div className="flex items-center space-x-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          {Object.keys(stationData).map((code) => (
            <button
              key={code}
              onClick={() => setSelectedStation(code)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                selectedStation === code
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {code} ({stationData[code].name.split(' ')[0]})
            </button>
          ))}
        </div>
      </div>

      {/* Station Summary & AI Action Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-purple-300 text-xs font-bold uppercase tracking-wider">
            <Eye className="w-4 h-4" />
            <span>Station Density Overview</span>
          </div>
          <h3 className="font-heading text-2xl font-bold text-white">
            {current.name} ({selectedStation})
          </h3>
          <p className="text-xs text-slate-300">
            Corridor: Sealdah ⇄ Dankuni Chord Line • Zone: Eastern Railway (ER)
          </p>
        </div>

        <div className="flex items-center space-x-6">
          <div className="text-right">
            <div className="text-xs text-purple-300 font-semibold">Overall Station Load</div>
            <div className="text-3xl font-extrabold font-mono text-purple-200">{current.overall}%</div>
          </div>
          <div className="h-12 w-px bg-white/20" />
          <div className="max-w-xs text-xs text-slate-200 bg-white/10 p-3 rounded-xl border border-white/15">
            <div className="flex items-center space-x-1 font-bold text-amber-300 mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Crowd Action Recommendation:</span>
            </div>
            {current.aiAction}
          </div>
        </div>
      </div>

      {/* Platform Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {current.platforms.map((pf: any) => {
          const isCritical = pf.status === 'RED';
          const isHigh = pf.status === 'ORANGE';
          const isModerate = pf.status === 'YELLOW';
          const color = isCritical
            ? 'text-red-600 bg-red-50 border-red-200'
            : isHigh
            ? 'text-orange-600 bg-orange-50 border-orange-200'
            : isModerate
            ? 'text-amber-600 bg-amber-50 border-amber-200'
            : 'text-emerald-600 bg-emerald-50 border-emerald-200';

          return (
            <div
              key={pf.num}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4 hover:shadow-md transition"
            >
              <div className="flex items-center justify-between">
                <div className="font-heading font-bold text-slate-900 text-lg">
                  Platform {pf.num}
                </div>
                <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${color}`}>
                  {pf.density}% Density
                </span>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isCritical
                        ? 'bg-red-500'
                        : isHigh
                        ? 'bg-orange-500'
                        : isModerate
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${pf.density}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>Capacity</span>
                  <span>Est. {pf.count} Persons</span>
                </div>
              </div>

              <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span className="leading-snug">{pf.notes}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
