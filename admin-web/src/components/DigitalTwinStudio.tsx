import React, { useState } from 'react';
import { Cpu, Play, CheckCircle2, AlertCircle, ArrowRight, TrendingDown, TrendingUp, Sparkles, Globe, Layers, ShieldAlert, Grid } from 'lucide-react';
import { runWhatIfSimulation } from '../services/api';
import { MatrixEngineHUD } from './MatrixEngineHUD';

export const DigitalTwinStudio: React.FC = () => {
  const [studioMode, setStudioMode] = useState<'discrete_event' | 'matrix_engine'>('matrix_engine');
  const [selectedZone, setSelectedZone] = useState<string>('NR');
  const [selectedScenario, setSelectedScenario] = useState<string>('NORTHERN_TRUNK_FOG_PRECEDENCE');
  const [loading, setLoading] = useState<boolean>(false);
  const [simulationResult, setSimulationResult] = useState<any>({
    scenario: 'NORTHERN_TRUNK_FOG_PRECEDENCE',
    zone: 'NR/NCR',
    recommendedStrategy: 'Enforce Fog Pilot Running (60 km/h) & Hold BOXN Freight at Aligarh Loop Line',
    netNetworkDelayChangeMin: -14.5,
    totalNetworkDelayMin: 28.0,
    decisionRationale: 'Severe winter fog (visibility <200m) detected on Kanpur-Prayagraj-Delhi quad trunk. Looping preceding freight at Aligarh clears green corridor for Vande Bharat Express #22436, saving 14.5 min cumulative trunk delay.',
    trainImpacts: [
      {
        trainNumber: '22436',
        trainName: 'Vande Bharat Express (#22436)',
        delayChangeMin: -12.0,
        newDelayMin: 3.0,
        statusMessage: 'Green corridor cleared through Tundla and Aligarh Jn.',
      },
      {
        trainNumber: '12301',
        trainName: 'Howrah - New Delhi Rajdhani Express (#12301)',
        delayChangeMin: -4.0,
        newDelayMin: 5.0,
        statusMessage: 'Automatic block signal headway maintained at 75 km/h.',
      },
      {
        trainNumber: '074012',
        trainName: 'BOXN Coal Freight Rake (#074012)',
        delayChangeMin: 8.5,
        newDelayMin: 18.0,
        statusMessage: 'Regulated on Loop Line 3 at Aligarh Jn for express clearance.',
      },
    ],
    affectedJunctions: ['New Delhi (NDLS)', 'Kanpur Central (CNB)', 'Prayagraj Jn (PRYJ)', 'Aligarh Jn (ALJN)'],
  });
  const [executed, setExecuted] = useState<boolean>(false);

  const scenarioCatalog = [
    {
      id: 'NORTHERN_TRUNK_FOG_PRECEDENCE',
      zone: 'NR',
      title: 'Northern Fog & Trunk Precedence',
      desc: 'Enforce 60 km/h fog safety speed and prioritize Vande Bharat over freight',
      train: '22436',
    },
    {
      id: 'CENTRAL_GHAT_BANKER_HOLD',
      zone: 'CR',
      title: 'Central Ghat Banker Coupling',
      desc: 'Simulate 1:37 Bhor Ghat incline banker loco attachment & safety clearance',
      train: '22221',
    },
    {
      id: 'GRAND_CHORD_COAL_OVERTAKE',
      zone: 'ECR',
      title: 'Grand Chord Coal Freight Siding',
      desc: 'Divert heavy mineral BOXN rake to Koderma siding to clear Rajdhani corridor',
      train: '12301',
    },
    {
      id: 'EASTERN_SUBURBAN_PEAK_PRECEDENCE',
      zone: 'ER',
      title: 'Eastern Peak Commuter Precedence',
      desc: 'Clear high-density suburban commuter local ahead of morning terminal rush',
      train: '32216',
    },
    {
      id: 'KONKAN_MONSOON_SPEED_RESTRICTION',
      zone: 'KR',
      title: 'Konkan Monsoon Safety Cap',
      desc: 'Activate 40 km/h viaduct & rockfall precautions across Sahyadri tunnels',
      train: '20607',
    },
    {
      id: 'SIGNAL_FAILURE_CASCADE',
      zone: 'ALL',
      title: 'Block Signal Aspect Failure',
      desc: 'Implement Paper Line Clear (PLC) & 25 km/h pilot run protocol',
      train: '32216',
    },
  ];

  const handleRunSimulation = async (scenarioId: string, zoneCode: string, trainNum: string) => {
    setSelectedScenario(scenarioId);
    setSelectedZone(zoneCode);
    setLoading(true);
    setExecuted(false);
    try {
      const res = await runWhatIfSimulation(scenarioId, trainNum, zoneCode);
      if (res && res.simulation) {
        setSimulationResult(res.simulation);
      }
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = () => {
    setExecuted(true);
    alert(`Operational Precedence Plan "${simulationResult.recommendedStrategy}" dispatched to Zonal Section Controller & Cabin Interlocking.`);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rail-orange to-indigo-600 flex items-center justify-center text-white shadow-md shadow-rail-orange/20">
              <Cpu className="w-6 h-6 animate-spin-slow" />
            </div>
            <div>
              <h2 className="font-heading text-xl font-bold text-slate-900 flex items-center space-x-2">
                <span>Multi-Zone Digital Twin & Matrix Operations Studio</span>
                <span className="px-2.5 py-0.5 text-xs font-bold bg-orange-50 text-rail-orange border border-orange-200 rounded-full">
                  {studioMode === 'matrix_engine' ? 'O(1) Matrix BLAS' : 'NetworkX Graph Engine'}
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Accelerated timetable scheduling, cascading delay ripple, and precedent dispatching across all 18 Indian Railways zones
              </p>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setStudioMode('matrix_engine')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                studioMode === 'matrix_engine'
                  ? 'bg-slate-900 text-cyan-400 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              Linear Algebra & Matrix HUD
            </button>
            <button
              onClick={() => setStudioMode('discrete_event')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                studioMode === 'discrete_event'
                  ? 'bg-rail-orange text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              What-If Graph Scenarios
            </button>
          </div>
        </div>

        {/* Multi-Zone Scenario Cards Grid (When in Graph mode) */}
        {studioMode === 'discrete_event' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-6">
            {scenarioCatalog.map((sc) => {
              const isSelected = selectedScenario === sc.id;
              return (
                <button
                  key={sc.id}
                  onClick={() => handleRunSimulation(sc.id, sc.zone, sc.train)}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-orange-50/70 border-orange-300 ring-2 ring-orange-400/20 shadow-sm'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 text-[9px] font-extrabold rounded bg-white text-slate-700 border border-slate-200 uppercase">
                      {sc.zone} ZONE
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">Train #{sc.train}</span>
                  </div>
                  <h4 className="text-xs font-extrabold text-slate-900 mt-2">{sc.title}</h4>
                  <p className="text-[10px] text-slate-600 mt-1 line-clamp-2">{sc.desc}</p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* MATRIX ENGINE HUD */}
      {studioMode === 'matrix_engine' && <MatrixEngineHUD />}

      {/* DISCRETE EVENT GRAPH SIMULATION RESULTS */}
      {studioMode === 'discrete_event' && (
        loading ? (
          <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-rail-orange border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-600">Running NetworkX Discrete-Event Precedence Simulation across Corridor Nodes...</p>
          </div>
        ) : simulationResult ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Strategy & Net Impact Column */}
          <div className="lg:col-span-1 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">RECOMMENDED DISPATCH PLAN</span>
              </div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 leading-snug">
                {simulationResult.recommendedStrategy}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                {simulationResult.decisionRationale}
              </p>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">Net Network Delay Change:</span>
                <span className={`text-sm font-extrabold flex items-center space-x-1 ${
                  (simulationResult.netNetworkDelayChangeMin || 0) < 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {(simulationResult.netNetworkDelayChangeMin || 0) < 0 ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                  <span>{simulationResult.netNetworkDelayChangeMin} min</span>
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">Cumulative Network Delay:</span>
                <span className="text-sm font-extrabold text-slate-800">
                  {simulationResult.totalNetworkDelayMin} min
                </span>
              </div>

              <button
                type="button"
                onClick={handleExecute}
                disabled={executed}
                className={`w-full py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all shadow-md ${
                  executed
                    ? 'bg-emerald-600 text-white cursor-default'
                    : 'bg-[#FF671F] hover:bg-[#E0530A] text-white shadow-orange-500/20 cursor-pointer'
                }`}
              >
                {executed ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Dispatched to Zonal Section Cabin</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Dispatch Precedence Plan</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Impacted Trains & Junctions Column */}
          <div className="lg:col-span-2 space-y-4">
            {/* Impacted Trains List */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                SIMULATED IMPACT ON CONCURRENT TRAINS
              </h4>
              <div className="space-y-3">
                {simulationResult.trainImpacts?.map((impact: any, i: number) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-slate-900">{impact.trainName}</span>
                        <span className="px-1.5 py-0.5 text-[9px] font-bold bg-white text-slate-600 border border-slate-200 rounded">
                          #{impact.trainNumber}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">{impact.statusMessage}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className={`text-xs font-extrabold ${impact.delayChangeMin < 0 ? 'text-emerald-600' : 'text-slate-700'}`}>
                        {impact.delayChangeMin < 0 ? `${impact.delayChangeMin} min (Saved)` : `+${impact.delayChangeMin} min`}
                      </div>
                      <div className="text-[10px] text-slate-400 font-semibold">New delay: {impact.newDelayMin} min</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Affected Interlocking Hubs */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
              <h4 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-3">
                CRITICAL INTERLOCKING JUNCTIONS COORDINATED
              </h4>
              <div className="flex flex-wrap gap-2">
                {simulationResult.affectedJunctions?.map((jn: string, i: number) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 rounded-lg bg-orange-50 text-slate-800 border border-orange-200 text-xs font-bold flex items-center space-x-1.5"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF671F]" />
                    <span>{jn}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null)}
    </div>
  );
};
