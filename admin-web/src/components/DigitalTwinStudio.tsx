import React, { useState } from 'react';
import { Cpu, Play, CheckCircle2, AlertCircle, ArrowRight, TrendingDown, TrendingUp, Sparkles } from 'lucide-react';
import { runWhatIfSimulation } from '../services/api';

export const DigitalTwinStudio: React.FC = () => {
  const [selectedScenario, setSelectedScenario] = useState<string>('VANDE_BHARAT_PRIORITY');
  const [loading, setLoading] = useState<boolean>(false);
  const [simulationResult, setSimulationResult] = useState<any>({
    scenario: 'VANDE_BHARAT_PRIORITY',
    recommendedStrategy: 'Give Vande Bharat 22436 Precedence',
    netNetworkDelayMinutes: -2,
    totalNetworkDelayMin: 24,
    decisionRationale: 'Calculated lowest overall network delay (-2 min total passenger delay saved). Vande Bharat maintains 130 km/h schedule and clears Kanpur bottleneck rapidly.',
    trainImpacts: [
      {
        trainNumber: '22436',
        trainName: 'Vande Bharat Express (NDLS -> BSB)',
        delayChangeMin: -8,
        newDelayMin: 0,
        statusMessage: 'Green corridor cleared through Kanpur Junction without stop.',
      },
      {
        trainNumber: '12301',
        trainName: 'Howrah Rajdhani Express',
        delayChangeMin: 4,
        newDelayMin: 16,
        statusMessage: 'Held at outer loop for 4 min to allow Vande Bharat overtake.',
      },
      {
        trainNumber: '12004',
        trainName: 'Lucknow Shatabdi',
        delayChangeMin: 2,
        newDelayMin: 10,
        statusMessage: 'Platform 1 arrival sequence maintained smoothly.',
      },
    ],
    affectedJunctions: ['Kanpur Central (CNB)', 'Prayagraj Jn (PRYJ)'],
  });
  const [executed, setExecuted] = useState<boolean>(false);

  const handleRunSimulation = async (scenario: string) => {
    setSelectedScenario(scenario);
    setLoading(true);
    setExecuted(false);
    try {
      const res = await runWhatIfSimulation(scenario, '22436');
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
    alert(`Precedence plan "${simulationResult.recommendedStrategy}" dispatched to Kanpur Signal Interlocking Cabin.`);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="glass-panel rounded-2xl p-6 border border-rail-border shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rail-orange to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-rail-orange/20">
              <Cpu className="w-6 h-6 animate-spin-slow" />
            </div>
            <div>
              <h2 className="font-heading text-xl font-bold text-white flex items-center space-x-2">
                <span>Railway Digital Twin & What-If Precedence Lab</span>
                <span className="px-2.5 py-0.5 text-xs font-bold bg-rail-orange/20 text-rail-orange border border-rail-orange/30 rounded-full">
                  NetworkX Graph Engine
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Simulate precedence decisions, bottleneck cascading delays, and corridor dispatch strategies in real time
              </p>
            </div>
          </div>

          {/* Scenario Selection Buttons */}
          <div className="flex items-center space-x-2 bg-slate-950/80 p-1.5 rounded-xl border border-rail-border">
            <button
              onClick={() => handleRunSimulation('VANDE_BHARAT_PRIORITY')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                selectedScenario === 'VANDE_BHARAT_PRIORITY'
                  ? 'bg-rail-orange text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Scenario A: Vande Bharat Priority
            </button>
            <button
              onClick={() => handleRunSimulation('RAJDHANI_PRIORITY')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                selectedScenario === 'RAJDHANI_PRIORITY'
                  ? 'bg-rail-orange text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Scenario B: Rajdhani Priority
            </button>
          </div>
        </div>
      </div>

      {/* Simulation Results Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Train Impact Comparison */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6 border border-rail-border shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-rail-border pb-3">
            <h3 className="font-heading font-bold text-white text-base">
              Cascading Delay Impact Matrix
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              Topology: Northern & East Central Division
            </span>
          </div>

          <div className="space-y-3">
            {simulationResult.trainImpacts?.map((item: any, idx: number) => {
              const isReduced = item.delayChangeMin <= 0;
              return (
                <div
                  key={idx}
                  className="bg-slate-900/80 rounded-xl p-4 border border-rail-border hover:border-slate-600 transition flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-xs ${
                        isReduced ? 'bg-emerald-600/80' : 'bg-amber-600/80'
                      }`}
                    >
                      {item.trainNumber}
                    </div>
                    <div>
                      <div className="font-heading font-bold text-white text-sm">{item.trainName}</div>
                      <div className="text-xs text-slate-400">{item.statusMessage}</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 self-end md:self-center">
                    <div className="text-right">
                      <div className="text-[11px] text-slate-400">Delay Impact</div>
                      <div
                        className={`text-sm font-heading font-extrabold flex items-center space-x-1 ${
                          isReduced ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        {isReduced ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                        <span>
                          {item.delayChangeMin > 0 ? `+${item.delayChangeMin}` : item.delayChangeMin} min
                        </span>
                      </div>
                    </div>

                    <div className="text-right pl-3 border-l border-rail-border">
                      <div className="text-[11px] text-slate-400">New Delay</div>
                      <div className="text-sm font-heading font-bold text-slate-200">
                        +{item.newDelayMin} min
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Network Delay Net Calculation */}
          <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-slate-900 to-rail-card border border-rail-border flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400">Net Corridor Delay Impact</div>
              <div className="text-lg font-heading font-extrabold text-white">
                {simulationResult.netNetworkDelayMinutes <= 0 ? (
                  <span className="text-emerald-400 flex items-center space-x-1">
                    <TrendingDown className="w-5 h-5" />
                    <span>{simulationResult.netNetworkDelayMinutes} minutes (Passenger Time Saved)</span>
                  </span>
                ) : (
                  <span className="text-amber-400 flex items-center space-x-1">
                    <TrendingUp className="w-5 h-5" />
                    <span>+{simulationResult.netNetworkDelayMinutes} minutes (Excess Delay Added)</span>
                  </span>
                )}
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs text-slate-400">Simulated Total Delay</div>
              <div className="text-base font-mono font-bold text-slate-200">
                {simulationResult.totalNetworkDelayMin || 24} min
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: AI Decision Support Recommendation */}
        <div className="glass-panel rounded-2xl p-6 border border-rail-border shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center space-x-2 text-rail-orange text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4" />
              <span>AI Controller Decision Support</span>
            </div>

            <h3 className="font-heading text-lg font-bold text-white mb-2">
              {simulationResult.recommendedStrategy}
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/80 p-3.5 rounded-xl border border-rail-border mb-4">
              {simulationResult.decisionRationale}
            </p>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-rail-border/40">
                <span className="text-slate-400">Confidence Metric:</span>
                <span className="font-bold text-emerald-400">96.8%</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-rail-border/40">
                <span className="text-slate-400">Bottleneck Clearance:</span>
                <span className="font-semibold text-slate-200">Kanpur Interlocking</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400">Execution Safety:</span>
                <span className="text-emerald-400 font-bold flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Conflict Free</span>
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-rail-border">
            <button
              onClick={handleExecute}
              disabled={executed || loading}
              className={`w-full py-3 rounded-xl text-sm font-bold transition flex items-center justify-center space-x-2 shadow-xl ${
                executed
                  ? 'bg-emerald-600 text-white cursor-default'
                  : 'bg-rail-orange hover:bg-rail-saffron text-white shadow-rail-orange/20'
              }`}
            >
              {executed ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Precedence Dispatched OK</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Apply Priority Decision</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
