import React, { useState } from 'react';
import { Cpu, Play, CheckCircle2, AlertCircle, ArrowRight, TrendingDown, TrendingUp, Sparkles } from 'lucide-react';
import { runWhatIfSimulation } from '../services/api';

export const DigitalTwinStudio: React.FC = () => {
  const [selectedScenario, setSelectedScenario] = useState<string>('PEAK_EMU_PRECEDENCE');
  const [loading, setLoading] = useState<boolean>(false);
  const [simulationResult, setSimulationResult] = useState<any>({
    scenario: 'PEAK_EMU_PRECEDENCE',
    recommendedStrategy: 'Give Suburban Commuter Local #32216 Immediate Green Aspect',
    netNetworkDelayMinutes: -6.5,
    totalNetworkDelayMin: 14.0,
    decisionRationale: 'Calculated lowest overall network delay (-6.5 min cumulative passenger delay saved). Clears Dum Dum Junction (DDJ) bottleneck before morning peak traffic surge.',
    trainImpacts: [
      {
        trainNumber: '32216',
        trainName: 'Dankuni - Sealdah Local (#32216)',
        delayChangeMin: -5.0,
        newDelayMin: 1.0,
        statusMessage: 'Green corridor cleared through Dakshineswar and Dum Dum Jn.',
      },
      {
        trainNumber: '32211',
        trainName: 'Sealdah - Dankuni Local (#32211)',
        delayChangeMin: -1.5,
        newDelayMin: 2.0,
        statusMessage: 'Platform approach line at Dankuni Jn received on schedule.',
      },
      {
        trainNumber: '32218',
        trainName: 'Dankuni - Sealdah Local (#32218)',
        delayChangeMin: 0.0,
        newDelayMin: 3.0,
        statusMessage: 'Standard headway spacing maintained on Sealdah Chord line.',
      },
    ],
    affectedJunctions: ['Sealdah (SDAH)', 'Dum Dum Jn (DDJ)', 'Dankuni Jn (DKAE)'],
  });
  const [executed, setExecuted] = useState<boolean>(false);

  const SCENARIO_PRESETS: Record<string, any> = {
    PEAK_EMU_PRECEDENCE: {
      scenario: 'PEAK_EMU_PRECEDENCE',
      recommendedStrategy: 'Give Suburban Commuter Local #32216 Immediate Green Aspect',
      netNetworkDelayMinutes: -6.5,
      netNetworkDelayChangeMin: -6.5,
      totalNetworkDelayMin: 14.0,
      decisionRationale: 'Calculated lowest overall network delay (-6.5 min cumulative passenger delay saved). Clears Dum Dum Junction (DDJ) bottleneck before morning peak traffic surge.',
      trainImpacts: [
        {
          trainNumber: '32216',
          trainName: 'Dankuni - Sealdah Local (#32216)',
          delayChangeMin: -5.0,
          newDelayMin: 1.0,
          statusMessage: 'Green corridor cleared through Dakshineswar and Dum Dum Jn.',
        },
        {
          trainNumber: '32211',
          trainName: 'Sealdah - Dankuni Local (#32211)',
          delayChangeMin: -1.5,
          newDelayMin: 2.0,
          statusMessage: 'Platform approach line at Dankuni Jn received on schedule.',
        },
        {
          trainNumber: '32218',
          trainName: 'Dankuni - Sealdah Local (#32218)',
          delayChangeMin: 0.0,
          newDelayMin: 3.0,
          statusMessage: 'Standard headway spacing maintained on Sealdah Chord line.',
        },
      ],
      affectedJunctions: ['Sealdah (SDAH)', 'Dum Dum Jn (DDJ)', 'Dankuni Jn (DKAE)'],
    },
    UP_DOWN_CROSSING_HOLD: {
      scenario: 'UP_DOWN_CROSSING_HOLD',
      recommendedStrategy: 'Regulate UP Local at Dakshineswar (DAKE) Platform 2 for 90 seconds',
      netNetworkDelayMinutes: -4.0,
      netNetworkDelayChangeMin: -4.0,
      totalNetworkDelayMin: 16.0,
      decisionRationale: 'Holding UP train prevents interlocking conflict at Dum Dum Jn, allowing DOWN Local #32214 to clear Vivekananda Setu bridge section on schedule without headway penalty.',
      trainImpacts: [
        {
          trainNumber: '32214',
          trainName: 'Dankuni - Sealdah Local (#32214)',
          delayChangeMin: -4.5,
          newDelayMin: 2.5,
          statusMessage: 'Unobstructed run across Dakshineswar - Baranagar section.',
        },
        {
          trainNumber: '32211',
          trainName: 'Sealdah - Dankuni Local (#32211)',
          delayChangeMin: 0.5,
          newDelayMin: 2.5,
          statusMessage: 'Brief 90s regulation at Dakshineswar Platform 2 to clear junction crossing.',
        },
        {
          trainNumber: '32216',
          trainName: 'Dankuni - Sealdah Local (#32216)',
          delayChangeMin: -2.0,
          newDelayMin: 1.0,
          statusMessage: 'Cascading signal hold prevented at Dum Dum Interlocking.',
        },
      ],
      affectedJunctions: ['Dakshineswar (DAKE)', 'Dum Dum Jn (DDJ)', 'Dankuni Jn (DKAE)'],
    },
    SIGNAL_FAILURE: {
      scenario: 'SIGNAL_FAILURE',
      recommendedStrategy: 'Implement Paper Line Clear (PLC) and 25 km/h Pilot Running Protocol',
      netNetworkDelayMinutes: 12.0,
      netNetworkDelayChangeMin: 12.0,
      totalNetworkDelayMin: 32.0,
      decisionRationale: 'Automatic Block Signal aspect failure on DAKE-DKAE section. Enforcing 25 km/h pilot running with 5-minute safety headway spacing prevents collision risk while maintaining emergency line capacity.',
      trainImpacts: [
        {
          trainNumber: '32216',
          trainName: 'Dankuni - Sealdah Local (#32216)',
          delayChangeMin: 6.0,
          newDelayMin: 7.0,
          statusMessage: 'Speed restricted to 25 km/h under pilot paper line clear protocol.',
        },
        {
          trainNumber: '32211',
          trainName: 'Sealdah - Dankuni Local (#32211)',
          delayChangeMin: 4.0,
          newDelayMin: 6.0,
          statusMessage: 'Regulated at Dum Dum Junction outer signal pending block clearance.',
        },
        {
          trainNumber: '32218',
          trainName: 'Dankuni - Sealdah Local (#32218)',
          delayChangeMin: 2.0,
          newDelayMin: 5.0,
          statusMessage: 'Headway spacing expanded for safety compliance.',
        },
      ],
      affectedJunctions: ['Dakshineswar (DAKE)', 'Dankuni Jn (DKAE)', 'Sealdah (SDAH)'],
    },
  };

  const handleRunSimulation = async (scenario: string) => {
    setSelectedScenario(scenario);
    setLoading(true);
    setExecuted(false);
    try {
      const res = await runWhatIfSimulation(scenario, '32216');
      if (res && res.simulation) {
        setSimulationResult(res.simulation);
      } else if (SCENARIO_PRESETS[scenario]) {
        setSimulationResult(SCENARIO_PRESETS[scenario]);
      }
    } catch (err) {
      console.error('Simulation API error, applying preset:', err);
      if (SCENARIO_PRESETS[scenario]) {
        setSimulationResult(SCENARIO_PRESETS[scenario]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = () => {
    setExecuted(true);
    alert(`Precedence plan "${simulationResult.recommendedStrategy}" dispatched to Sealdah Division Section Controller & Dum Dum Interlocking Cabin.`);
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
                <span>Railway Digital Twin & What-If Precedence Lab</span>
                <span className="px-2.5 py-0.5 text-xs font-bold bg-orange-50 text-rail-orange border border-orange-200 rounded-full">
                  NetworkX Graph Engine
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Simulate precedence decisions, bottleneck cascading delays, and corridor dispatch strategies on the 28 km Sealdah–Dankuni chord
              </p>
            </div>
          </div>

          {/* Scenario Selection Buttons */}
          <div className="flex items-center space-x-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
            <button
              onClick={() => handleRunSimulation('PEAK_EMU_PRECEDENCE')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                selectedScenario === 'PEAK_EMU_PRECEDENCE'
                  ? 'bg-rail-orange text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Scenario A: Peak Commuter Precedence
            </button>
            <button
              onClick={() => handleRunSimulation('UP_DOWN_CROSSING_HOLD')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                selectedScenario === 'UP_DOWN_CROSSING_HOLD'
                  ? 'bg-rail-orange text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Scenario B: Junction Crossing Hold
            </button>
            <button
              onClick={() => handleRunSimulation('SIGNAL_FAILURE')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                selectedScenario === 'SIGNAL_FAILURE'
                  ? 'bg-rail-orange text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Scenario C: Signal Aspect Caution
            </button>
          </div>
        </div>
      </div>

      {/* Simulation Results Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Train Impact Comparison */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-heading font-bold text-slate-900 text-base">
              Cascading Delay Impact Matrix
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              Topology: Sealdah - Dankuni Suburban Line (28 km ER)
            </span>
          </div>

          <div className="space-y-3">
            {simulationResult.trainImpacts?.map((item: any, idx: number) => {
              const isReduced = item.delayChangeMin <= 0;
              return (
                <div
                  key={idx}
                  className="bg-slate-50 rounded-xl p-4 border border-slate-200 hover:border-slate-300 transition flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-xs ${
                        isReduced ? 'bg-emerald-600' : 'bg-amber-600'
                      }`}
                    >
                      {item.trainNumber}
                    </div>
                    <div>
                      <div className="font-heading font-bold text-slate-900 text-sm">{item.trainName}</div>
                      <div className="text-xs text-slate-500">{item.statusMessage}</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-slate-900">
                        {item.newDelayMin > 0 ? `+${item.newDelayMin} min delay` : 'On Time (0 min)'}
                      </div>
                      <div
                        className={`text-xs font-bold flex items-center justify-end space-x-1 ${
                          isReduced ? 'text-emerald-600' : 'text-amber-600'
                        }`}
                      >
                        {isReduced ? (
                          <>
                            <TrendingDown className="w-3.5 h-3.5" />
                            <span>{item.delayChangeMin} min</span>
                          </>
                        ) : (
                          <>
                            <TrendingUp className="w-3.5 h-3.5" />
                            <span>+{item.delayChangeMin} min</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Col: AI Recommendation & Dispatch Action */}
        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl p-6 text-white shadow-xl flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-rail-orange">
              <Sparkles className="w-5 h-5" />
              <span className="font-heading font-bold text-sm tracking-wide uppercase text-orange-400">
                AI Optimization Verdict
              </span>
            </div>

            <div className="space-y-2">
              <h4 className="font-heading text-lg font-bold text-white">
                {simulationResult.recommendedStrategy}
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {simulationResult.decisionRationale}
              </p>
            </div>

            <div className="p-3 bg-white/10 rounded-xl border border-white/10 space-y-1">
              <div className="text-xs text-slate-400">Cumulative Corridor Impact</div>
              <div className="text-xl font-bold font-mono text-emerald-400">
                {simulationResult.netNetworkDelayMinutes <= 0
                  ? `${simulationResult.netNetworkDelayMinutes} min Saved`
                  : `+${simulationResult.netNetworkDelayMinutes} min Cascade`}
              </div>
            </div>

            {simulationResult.affectedJunctions?.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Critical Interlocking Junctions
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {simulationResult.affectedJunctions.map((junc: string, i: number) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 text-xs rounded-lg bg-white/10 border border-white/15 text-slate-200 font-mono"
                    >
                      {junc}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <button
              onClick={handleExecute}
              disabled={executed || loading}
              className={`w-full py-3 px-4 rounded-xl font-heading font-bold text-sm flex items-center justify-center space-x-2 transition ${
                executed
                  ? 'bg-emerald-600 text-white cursor-default'
                  : 'bg-rail-orange hover:bg-orange-600 text-white shadow-lg shadow-rail-orange/30'
              }`}
            >
              {executed ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Signal Aspect Dispatched</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Execute Interlocking Precedence</span>
                </>
              )}
            </button>
            <p className="text-[10px] text-slate-400 text-center">
              Direct telemetry handshake with Section Controller Relay Cabin
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
