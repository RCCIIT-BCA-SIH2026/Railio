import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Layers,
  Zap,
  Activity,
  AlertTriangle,
  Play,
  RefreshCw,
  Compass,
  CheckCircle2,
  Grid,
  TrendingUp,
  Clock,
  Sparkles
} from 'lucide-react';
import {
  solveMaxPlusTimetableApi,
  propagateDelaysSparseApi,
  detectOccupancyConflictsApi,
  computeSpatialNearestStationsApi,
  fetchMatrixTopologyMetricsApi
} from '../services/api';

export const MatrixEngineHUD: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'tropical' | 'sparse' | 'occupancy' | 'spatial'>('tropical');
  const [loading, setLoading] = useState<boolean>(false);

  // ── 1. Tropical Matrix State ──
  const [numTrains, setNumTrains] = useState<number>(8);
  const [headwayMin, setHeadwayMin] = useState<number>(3.5);
  const [dwellMin, setDwellMin] = useState<number>(2.0);
  const [initialDisturbance, setInitialDisturbance] = useState<number>(12.0);
  const [tropicalResult, setTropicalResult] = useState<any>(null);

  // ── 2. Sparse Delay Diffusion State ──
  const [selectedHub, setSelectedHub] = useState<string>('NDLS');
  const [primaryDelay, setPrimaryDelay] = useState<number>(25.0);
  const [dampingFactor, setDampingFactor] = useState<number>(0.7);
  const [hops, setHops] = useState<number>(4);
  const [sparseResult, setSparseResult] = useState<any>(null);
  const [topologyMetrics, setTopologyMetrics] = useState<any>(null);

  // ── 3. Occupancy Tensor State ──
  const [timeHorizon, setTimeHorizon] = useState<number>(120);
  const [occupancyResult, setOccupancyResult] = useState<any>(null);

  // ── 4. Spatial Matrix State ──
  const [spatialScale, setSpatialScale] = useState<number>(5000);
  const [spatialResult, setSpatialResult] = useState<any>(null);

  // Initial load
  useEffect(() => {
    loadTopologyMetrics();
    handleRunTropical();
  }, []);

  const loadTopologyMetrics = async () => {
    try {
      const res = await fetchMatrixTopologyMetricsApi();
      setTopologyMetrics(res);
    } catch (err) {
      console.error('Failed to load topology metrics', err);
    }
  };

  const handleRunTropical = async () => {
    setLoading(true);
    try {
      const delays = [initialDisturbance, 0, 0, 0, 0, 0, 0, 0];
      const res = await solveMaxPlusTimetableApi({
        numTrains,
        headwayMinutes: headwayMin,
        dwellMinutes: dwellMin,
        initialDelays: delays,
        steps: 6
      });
      setTropicalResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunSparseDiffusion = async () => {
    setLoading(true);
    try {
      const primary: Record<string, number> = { [selectedHub]: primaryDelay };
      if (selectedHub === 'NDLS') primary['CNB'] = 15;
      if (selectedHub === 'HWH') primary['SDAH'] = 12;
      if (selectedHub === 'CSMT') primary['KYN'] = 18;

      const res = await propagateDelaysSparseApi({
        primaryDelays: primary,
        dampingFactor,
        hops
      });
      setSparseResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunOccupancyConflict = async () => {
    setLoading(true);
    try {
      // Generate synthetic trajectories
      const trajectories = [];
      const sections = ['SEC-NDLS-01', 'SEC-ALJN-02', 'SEC-CNB-03', 'SEC-PRYJ-04', 'SEC-DDU-05'];
      for (let i = 0; i < 20; i++) {
        const startSec = i % 3;
        trajectories.push({
          trainNumber: `${12000 + i}`,
          sectionIds: sections.slice(startSec, startSec + 3),
          startMinute: (i % 6) * 5,
          durationMinutesPerSection: 4
        });
      }
      const res = await detectOccupancyConflictsApi({
        trajectories,
        timeHorizonMinutes: timeHorizon
      });
      setOccupancyResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunSpatialBenchmark = async () => {
    setLoading(true);
    try {
      // Mock coordinates
      const mockTrains = [];
      for (let i = 0; i < spatialScale; i++) {
        mockTrains.push({
          trainNumber: `${20000 + i}`,
          lat: 8.5 + (i % 2500) * (26.0 / 2500.0),
          lng: 68.5 + (i % 2500) * (28.0 / 2500.0)
        });
      }
      const res = await computeSpatialNearestStationsApi(mockTrains);
      setSpatialResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-cyan-500/20 rounded-2xl p-6 shadow-2xl space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Cpu className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
              Linear Algebra & Matrix Logic Engine
              <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-500/40">
                O(1) Matrix BLAS
              </span>
            </h2>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Accelerating nationwide railway operations using tropical semi-rings, sparse adjacency graph polynomials, and tensor occupancy math.
          </p>
        </div>

        {/* Global Topology Badges */}
        {topologyMetrics && (
          <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 px-4 py-2 rounded-xl text-xs font-mono">
            <span className="text-slate-400">Sparsity:</span>
            <span className="text-cyan-400 font-bold">{topologyMetrics.matrixSparsityPct}%</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">NNZ Edges:</span>
            <span className="text-emerald-400 font-bold">{topologyMetrics.nonZeroEdges}</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">Spectral Radius:</span>
            <span className="text-amber-400 font-bold">{topologyMetrics.spectralRadius}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <button
          onClick={() => { setActiveTab('tropical'); if (!tropicalResult) handleRunTropical(); }}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'tropical'
              ? 'bg-cyan-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/20'
              : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/50'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          1. Max-Plus Timetabling
        </button>

        <button
          onClick={() => { setActiveTab('sparse'); if (!sparseResult) handleRunSparseDiffusion(); }}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'sparse'
              ? 'bg-emerald-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/20'
              : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/50'
          }`}
        >
          <Layers className="w-4 h-4" />
          2. Sparse Delay Diffusion (A^k)
        </button>

        <button
          onClick={() => { setActiveTab('occupancy'); if (!occupancyResult) handleRunOccupancyConflict(); }}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'occupancy'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20'
              : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/50'
          }`}
        >
          <Grid className="w-4 h-4" />
          3. Block-Time Conflict Tensor
        </button>

        <button
          onClick={() => { setActiveTab('spatial'); if (!spatialResult) handleRunSpatialBenchmark(); }}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'spatial'
              ? 'bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-500/20'
              : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/50'
          }`}
        >
          <Compass className="w-4 h-4" />
          4. Vectorized Spatial Matrix
        </button>
      </div>

      {/* ── TAB 1: Max-Plus Tropical Algebra ── */}
      {activeTab === 'tropical' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              Tropical State-Space Parameters
            </h3>

            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Fleet Block Size (N trains):</span>
                <span className="font-mono text-cyan-400 font-bold">{numTrains}</span>
              </div>
              <input
                type="range"
                min="2"
                max="24"
                value={numTrains}
                onChange={(e) => setNumTrains(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Minimum Headway Separation (min):</span>
                <span className="font-mono text-cyan-400 font-bold">{headwayMin} min</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="10.0"
                step="0.5"
                value={headwayMin}
                onChange={(e) => setHeadwayMin(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Platform Dwell Time (min):</span>
                <span className="font-mono text-cyan-400 font-bold">{dwellMin} min</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="8.0"
                step="0.5"
                value={dwellMin}
                onChange={(e) => setDwellMin(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Lead Train Disturbance d(0):</span>
                <span className="font-mono text-amber-400 font-bold">+{initialDisturbance} min</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="30.0"
                step="1.0"
                value={initialDisturbance}
                onChange={(e) => setInitialDisturbance(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            <button
              onClick={handleRunTropical}
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-500/20"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-slate-950" />}
              Solve Tropical State Vector
            </button>
          </div>

          {/* Mathematical Results & Formula */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-cyan-400">Max-Plus State Equation</span>
                <span className="text-xs font-mono text-slate-400">Latency: {tropicalResult?.executionTimeMs || 0} ms</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 font-mono text-xs text-slate-200 overflow-x-auto">
                x(k+1) = A ⊗ x(k) ⊕ d(k) &nbsp;|&nbsp; λ(A) = max(h_min, t_dwell) = {tropicalResult?.cycleTimeLambda || headwayMin} min
              </div>

              {tropicalResult && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                  <div className="bg-slate-900/90 border border-slate-800/80 p-3 rounded-xl">
                    <span className="text-[11px] text-slate-400">Eigenvalue Cycle Time (λ)</span>
                    <p className="text-lg font-bold font-mono text-cyan-400">{tropicalResult.cycleTimeLambda} min</p>
                  </div>
                  <div className="bg-slate-900/90 border border-slate-800/80 p-3 rounded-xl">
                    <span className="text-[11px] text-slate-400">Max Network Timestamp</span>
                    <p className="text-lg font-bold font-mono text-emerald-400">
                      {Math.max(...(tropicalResult.finalTimestamps || [0]))} min
                    </p>
                  </div>
                  <div className="bg-slate-900/90 border border-slate-800/80 p-3 rounded-xl col-span-2 md:col-span-1">
                    <span className="text-[11px] text-slate-400">Stability State</span>
                    <p className="text-xs font-bold text-cyan-300 mt-1">{tropicalResult.scheduleStability}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Trajectory Heatmap */}
            {tropicalResult?.stateTrajectory && (
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
                <span className="text-xs font-semibold text-slate-300 mb-3 block">State Trajectory Vector Across Iteration Steps:</span>
                <div className="space-y-2">
                  {tropicalResult.stateTrajectory.map((step: number[], sIdx: number) => (
                    <div key={sIdx} className="flex items-center gap-2 text-[11px] font-mono">
                      <span className="text-slate-500 w-16">Step k={sIdx}:</span>
                      <div className="flex-1 flex gap-1.5 overflow-x-auto py-1">
                        {step.map((val: number, vIdx: number) => (
                          <span
                            key={vIdx}
                            className={`px-2 py-0.5 rounded border text-[10px] ${
                              vIdx === 0 && sIdx === 0
                                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 font-bold'
                                : 'bg-slate-900 border-slate-800 text-cyan-300'
                            }`}
                          >
                            T{vIdx + 1}:{val}m
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: Sparse Adjacency Matrix Delay Diffusion ── */}
      {activeTab === 'sparse' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              Primary Delay Injection Point
            </h3>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Origin Junction Hub:</label>
              <select
                value={selectedHub}
                onChange={(e) => setSelectedHub(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-xs font-mono"
              >
                <option value="NDLS">New Delhi (NDLS) - Northern Hub</option>
                <option value="HWH">Howrah (HWH) - Eastern Hub</option>
                <option value="CSMT">Mumbai CSMT (CSMT) - Central Hub</option>
                <option value="MAS">Chennai Central (MAS) - Southern Hub</option>
                <option value="CNB">Kanpur Central (CNB) - Trunk Interlocking</option>
                <option value="DDU">Pt. Deen Dayal Upadhyaya (DDU) - Grand Chord</option>
              </select>
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Primary Delay (d_0):</span>
                <span className="font-mono text-emerald-400 font-bold">+{primaryDelay} min</span>
              </div>
              <input
                type="range"
                min="5"
                max="60"
                step="5"
                value={primaryDelay}
                onChange={(e) => setPrimaryDelay(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Propagation Damping Factor (γ):</span>
                <span className="font-mono text-emerald-400 font-bold">{dampingFactor}</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="0.9"
                step="0.05"
                value={dampingFactor}
                onChange={(e) => setDampingFactor(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Network Hops (k):</span>
                <span className="font-mono text-emerald-400 font-bold">{hops} hops</span>
              </div>
              <input
                type="range"
                min="1"
                max="8"
                value={hops}
                onChange={(e) => setHops(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            <button
              onClick={handleRunSparseDiffusion}
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
              Diffuse Delays via SciPy CSR
            </button>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono uppercase tracking-wider text-emerald-400">
                  Matrix Polynomial Diffusion: d_total = d_0 + Σ γ^k (P^T)^k d_0
                </span>
                <span className="text-xs font-mono text-slate-400">Diffusion Time: {sparseResult?.executionTimeMs || 0} ms</span>
              </div>

              {sparseResult && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center text-xs">
                    <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg">
                      <span className="text-slate-400 block text-[10px]">Stations Analyzed</span>
                      <span className="font-mono font-bold text-white text-base">{sparseResult.totalStations}</span>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg">
                      <span className="text-slate-400 block text-[10px]">Matrix Sparsity</span>
                      <span className="font-mono font-bold text-emerald-400 text-base">{sparseResult.matrixSparsityPct}%</span>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg">
                      <span className="text-slate-400 block text-[10px]">Non-Zero Edges</span>
                      <span className="font-mono font-bold text-cyan-400 text-base">{sparseResult.nonZeroEdges}</span>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg">
                      <span className="text-slate-400 block text-[10px]">Spectral Radius</span>
                      <span className="font-mono font-bold text-amber-400 text-base">{sparseResult.spectralRadius}</span>
                    </div>
                  </div>

                  <h4 className="text-xs font-semibold text-slate-300 mt-4">Top Cascading Impact Hubs:</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                    {sparseResult.topAffectedHubs?.map((hub: any, idx: number) => (
                      <div key={idx} className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-lg flex justify-between items-center text-xs">
                        <div>
                          <span className="font-mono font-bold text-white">{hub.stationCode}</span>
                          <span className="text-[10px] text-slate-500 block">Ripple: +{hub.rippleImpactMin}m</span>
                        </div>
                        <span className="font-mono font-bold text-emerald-400">+{hub.cumulativeDelayMin} min</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: Block-Time Occupancy Tensor ── */}
      {activeTab === 'occupancy' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-950/70 border border-slate-800 p-4 rounded-xl">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Grid className="w-4 h-4 text-amber-400" />
                Binary Block-Time Occupancy Collision Matrix (Ω ∈ &#123;0, 1&#125;^(S × T))
              </h3>
              <p className="text-xs text-slate-400">
                Instantly detects overlapping track occupancy (Ω &gt; 1) across 20 concurrent train paths.
              </p>
            </div>
            <button
              onClick={handleRunOccupancyConflict}
              disabled={loading}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-amber-500/20"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-slate-950" />}
              Evaluate Tensor Collisions
            </button>
          </div>

          {occupancyResult && (
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
                <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
                  <span className="text-slate-400 text-[10px] block">Trains Scanned</span>
                  <span className="text-white text-base font-bold">{occupancyResult.totalTrainsChecked}</span>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
                  <span className="text-slate-400 text-[10px] block">Conflicts Detected</span>
                  <span className={`text-base font-bold ${occupancyResult.totalConflictsFound > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {occupancyResult.totalConflictsFound}
                  </span>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
                  <span className="text-slate-400 text-[10px] block">Tensor Sparsity</span>
                  <span className="text-cyan-400 text-base font-bold">{occupancyResult.conflictMatrixSparsityPct}%</span>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
                  <span className="text-slate-400 text-[10px] block">Execution Time</span>
                  <span className="text-emerald-400 text-base font-bold">{occupancyResult.executionTimeMs} ms</span>
                </div>
              </div>

              {/* Conflict Table */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-300">Conflict Breakdown by Block Section:</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
                  {occupancyResult.conflicts?.map((conf: any, idx: number) => (
                    <div key={idx} className="bg-slate-900/90 border border-amber-500/20 p-2.5 rounded-lg flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        <div>
                          <span className="font-mono font-bold text-white">{conf.sectionId}</span>
                          <span className="text-[10px] text-slate-400 block">At t = {conf.timeMinute} min</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-amber-300 font-mono font-bold">
                          {conf.trainCount} Trains: {conf.conflictingTrains.slice(0, 3).join(', ')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: Vectorized Spatial Distance Matrix ── */}
      {activeTab === 'spatial' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-950/70 border border-slate-800 p-4 rounded-xl">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Compass className="w-4 h-4 text-indigo-400" />
                Vectorized Pairwise Euclidean Distance Matrix (D ∈ ℝ^(N × M))
              </h3>
              <p className="text-xs text-slate-400">
                Maps thousands of active GPS train coordinates to the nearest station hubs simultaneously in &lt;1 ms.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={spatialScale}
                onChange={(e) => setSpatialScale(Number(e.target.value))}
                className="bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-xs font-mono"
              >
                <option value="1000">1,000 Trains</option>
                <option value="5000">5,000 Trains (Nationwide Fleet)</option>
                <option value="10000">10,000 Trains (High Stress)</option>
              </select>
              <button
                onClick={handleRunSpatialBenchmark}
                disabled={loading}
                className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-500/20"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
                Run Vector Benchmark
              </button>
            </div>
          </div>

          {spatialResult && (
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
                <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
                  <span className="text-slate-400 text-[10px] block">Fleet Size (N)</span>
                  <span className="text-white text-base font-bold">{spatialResult.trainCount}</span>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
                  <span className="text-slate-400 text-[10px] block">Stations Mapped (M)</span>
                  <span className="text-cyan-400 text-base font-bold">{spatialResult.stationCount}</span>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
                  <span className="text-slate-400 text-[10px] block">Computation Latency</span>
                  <span className="text-emerald-400 text-base font-bold">{spatialResult.executionTimeMs} ms</span>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
                  <span className="text-slate-400 text-[10px] block">Throughput</span>
                  <span className="text-indigo-400 text-base font-bold">
                    {Math.round(spatialResult.trainCount / (spatialResult.executionTimeMs / 1000)).toLocaleString()} t/s
                  </span>
                </div>
              </div>

              {/* Sample Output */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-300">Sample Nearest Hub Mappings:</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1 text-xs font-mono">
                  {spatialResult.results?.slice(0, 16).map((r: any, idx: number) => (
                    <div key={idx} className="bg-slate-900/90 border border-slate-800 p-2 rounded-lg flex justify-between items-center">
                      <span className="text-slate-300 font-bold">#{r.trainNumber}</span>
                      <span className="text-cyan-400 font-bold">{r.nearestStationCode}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
