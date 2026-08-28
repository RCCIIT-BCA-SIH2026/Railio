import React, { useState, useEffect } from 'react';
import { Activity, AlertTriangle, ShieldCheck, Wrench, Radio, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrackSection, ProgressiveRisk } from '../types';

interface TrackHealthMonitorProps {
  trackSections: TrackSection[];
  progressiveHistory?: ProgressiveRisk[];
  liveTelemetry?: any;
}

export const TrackHealthMonitor: React.FC<TrackHealthMonitorProps> = ({
  trackSections,
  progressiveHistory,
  liveTelemetry,
}) => {
  const [vibrationStream, setVibrationStream] = useState<any[]>([
    { time: '10:00', rms: 1.2, threshold: 2.4 },
    { time: '10:01', rms: 1.4, threshold: 2.4 },
    { time: '10:02', rms: 1.3, threshold: 2.4 },
    { time: '10:03', rms: 2.1, threshold: 2.4 },
    { time: '10:04', rms: 2.9, threshold: 2.4 },
    { time: '10:05', rms: 3.42, threshold: 2.4 },
  ]);

  const [cautionIssued, setCautionIssued] = useState<boolean>(false);

  // Progressive Degradation History Chart Data
  const degradationData = progressiveHistory || [
    { day: 'Day 1', status: 'Normal', riskScore: 18, vibration: '1.2g' },
    { day: 'Day 2', status: 'Slightly abnormal', riskScore: 42, vibration: '2.1g' },
    { day: 'Day 3', status: 'Abnormal', riskScore: 64, vibration: '2.9g' },
    { day: 'Day 4', status: 'Highly abnormal', riskScore: 78, vibration: '3.42g' },
  ];

  useEffect(() => {
    if (liveTelemetry && liveTelemetry.vibrationRms) {
      const now = new Date();
      const timeStr = `${now.getMinutes()}:${now.getSeconds().toString().padStart(2, '0')}`;
      setVibrationStream((prev) => [
        ...prev.slice(-9),
        { time: timeStr, rms: liveTelemetry.vibrationRms, threshold: 2.4 },
      ]);
    }
  }, [liveTelemetry]);

  const handleIssueCautionOrder = () => {
    setCautionIssued(true);
    alert('🚨 Caution Order Dispatched: 45 km/h speed limit imposed on Section HWH-B17 (km 64.0 to km 68.0).');
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="glass-panel rounded-2xl p-6 border border-rail-border shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
              <Activity className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="font-heading text-xl font-bold text-white flex items-center space-x-2">
                <span>ESP32 + MPU6050 Track Vibration & Progressive Risk Engine</span>
                <span className="px-2.5 py-0.5 text-xs font-bold bg-red-950 text-red-400 border border-red-500/30 rounded-full">
                  IoT Telemetry Node Active
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Continuous 3-axis accelerometer/gyro telemetry with multi-day wear degradation monitoring
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleIssueCautionOrder}
              disabled={cautionIssued}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
                cautionIssued
                  ? 'bg-emerald-700 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>{cautionIssued ? 'Caution Order Active (45 km/h)' : 'Issue 45 km/h Caution Order'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Real-time Vibration Waveform Chart */}
        <div className="glass-panel rounded-2xl p-5 border border-rail-border shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-heading font-bold text-white text-sm flex items-center space-x-2">
                <Radio className="w-4 h-4 text-rail-orange" />
                <span>Live Vibration RMS Waveform (Section HWH-B17)</span>
              </h3>
              <p className="text-xs text-slate-400">ESP32 MPU6050 Accelerometer Stream (g-force)</p>
            </div>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-900 text-amber-400 border border-rail-border">
              RMS: 3.42g (Threshold 2.4g)
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={vibrationStream}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} domain={[0, 4.5]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#07162c', borderColor: '#1e4273', borderRadius: '8px' }}
                />
                <Line
                  type="monotone"
                  dataKey="rms"
                  stroke="#FF671F"
                  strokeWidth={3}
                  dot={{ fill: '#FF671F', r: 4 }}
                  name="Vibration RMS (g)"
                />
                <Line
                  type="monotone"
                  dataKey="threshold"
                  stroke="#EF4444"
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  name="Safety Threshold (2.4g)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Multi-Day Progressive Deterioration Trend */}
        <div className="glass-panel rounded-2xl p-5 border border-rail-border shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-heading font-bold text-white text-sm flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-red-400" />
                <span>4-Day Progressive Deterioration Trend</span>
              </h3>
              <p className="text-xs text-slate-400">Risk Score Growth: Day 1 (18/100) to Day 4 (78/100)</p>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-500/30">
              PRIORITY: HIGH
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={degradationData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="day" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#07162c', borderColor: '#1e4273', borderRadius: '8px' }}
                />
                <Bar dataKey="riskScore" fill="#EF4444" radius={[6, 6, 0, 0]} name="Progressive Risk Score" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Track Section Table */}
      <div className="glass-panel rounded-2xl p-5 border border-rail-border shadow-xl">
        <h3 className="font-heading font-bold text-white text-sm mb-3">
          Track Infrastructure Section Health Matrix
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 font-semibold border-b border-rail-border">
              <tr>
                <th className="p-3">Section ID</th>
                <th className="p-3">Corridor Name</th>
                <th className="p-3">Health Score</th>
                <th className="p-3">Vibration RMS</th>
                <th className="p-3">Trend</th>
                <th className="p-3">Risk Level</th>
                <th className="p-3">Maintenance Priority</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rail-border/40">
              {trackSections.map((sec) => (
                <tr key={sec.id} className="hover:bg-slate-900/40 transition">
                  <td className="p-3 font-mono font-bold text-slate-200">{sec.id}</td>
                  <td className="p-3 text-white font-medium">{sec.name}</td>
                  <td className="p-3 font-bold text-slate-200">{sec.healthScore}/100</td>
                  <td className="p-3 font-mono font-bold text-slate-200">{sec.vibrationRms}g</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                        sec.deteriorationTrend === 'INCREASING'
                          ? 'bg-amber-950 text-amber-400 border border-amber-500/30'
                          : 'bg-emerald-950 text-emerald-400'
                      }`}
                    >
                      {sec.deteriorationTrend}
                    </span>
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2.5 py-1 rounded-full font-bold text-[10px] border ${
                        sec.riskLevel === 'WARNING' || sec.riskLevel === 'HIGH_RISK'
                          ? 'bg-amber-950/80 border-amber-500/40 text-amber-400'
                          : 'bg-emerald-950/80 border-emerald-500/40 text-emerald-400'
                      }`}
                    >
                      {sec.riskLevel}
                    </span>
                  </td>
                  <td className="p-3 font-bold text-slate-200">{sec.maintenancePriority}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
