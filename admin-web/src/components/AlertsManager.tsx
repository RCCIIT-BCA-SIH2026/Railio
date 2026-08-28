import React, { useState } from 'react';
import { Bell, AlertTriangle, ShieldAlert, Plus, CheckCircle2, Radio } from 'lucide-react';
import { AlertItem } from '../types';
import { createRailwayAlert } from '../services/api';

interface AlertsManagerProps {
  alerts: AlertItem[];
  onNewAlert?: (alert: AlertItem) => void;
}

export const AlertsManager: React.FC<AlertsManagerProps> = ({ alerts, onNewAlert }) => {
  const [showModal, setShowModal] = useState<boolean>(false);
  const [title, setTitle] = useState<string>('');
  const [category, setCategory] = useState<string>('CONGESTION');
  const [severity, setSeverity] = useState<string>('WARNING');
  const [description, setDescription] = useState<string>('');
  const [affectedTrain, setAffectedTrain] = useState<string>('12301');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) return;

    try {
      const res = await createRailwayAlert({
        title,
        category,
        severity,
        description,
        affectedTrain,
      });

      if (res && res.alert && onNewAlert) {
        onNewAlert(res.alert);
      }
      setShowModal(false);
      setTitle('');
      setDescription('');
      alert('Alert dispatched successfully to Passenger mobile app and Signal Cabins.');
    } catch (err) {
      console.error('Failed to create alert:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel rounded-2xl p-6 border border-rail-border shadow-xl flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-amber-600 flex items-center justify-center text-white shadow-lg shadow-red-500/20">
            <Bell className="w-6 h-6 animate-bounce" />
          </div>
          <div>
            <h2 className="font-heading text-xl font-bold text-white flex items-center space-x-2">
              <span>National Railway Incident & Broadcast Center</span>
              <span className="px-2.5 py-0.5 text-xs font-bold bg-red-950 text-red-400 border border-red-500/30 rounded-full">
                Omnichannel Gateway Active
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Broadcast high-priority track safety, weather caution, and platform congestion alerts
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 bg-rail-orange hover:bg-rail-saffron text-white rounded-xl text-xs font-bold transition flex items-center space-x-2 shadow-lg shadow-rail-orange/20"
        >
          <Plus className="w-4 h-4" />
          <span>Broadcast Incident Alert</span>
        </button>
      </div>

      {/* Alert Feed List */}
      <div className="space-y-4">
        {alerts.map((alt) => {
          const isHigh = alt.severity === 'HIGH_RISK' || alt.severity === 'CRITICAL';
          return (
            <div
              key={alt.id}
              className={`glass-panel glass-card-hover rounded-2xl p-5 border ${
                isHigh ? 'border-red-500/40 bg-red-950/20' : 'border-amber-500/40 bg-amber-950/20'
              } shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4`}
            >
              <div className="flex items-start space-x-4">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 ${
                    isHigh ? 'bg-red-600 shadow-lg shadow-red-600/30' : 'bg-amber-600 shadow-lg shadow-amber-600/30'
                  }`}
                >
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-heading font-bold text-white text-base">{alt.title}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        isHigh ? 'bg-red-950 text-red-400 border-red-500/30' : 'bg-amber-950 text-amber-400 border-amber-500/30'
                      }`}
                    >
                      {alt.severity}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">({alt.category})</span>
                  </div>
                  <p className="text-xs text-slate-300 mb-2">{alt.description}</p>
                  {alt.recommendedAction && (
                    <div className="text-xs text-amber-300 font-medium bg-slate-900/60 p-2 rounded-lg border border-rail-border/40">
                      ⚡ Action: {alt.recommendedAction}
                    </div>
                  )}
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-xs text-slate-400 font-mono">{alt.timestamp}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="glass-panel w-full max-w-lg rounded-2xl p-6 border border-rail-border shadow-2xl space-y-4">
            <h3 className="font-heading font-bold text-white text-lg">Broadcast Incident Advisory</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300">Alert Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Heavy Rain Speed Restriction at Howrah"
                  className="w-full mt-1 px-3 py-2 bg-slate-900 border border-rail-border rounded-lg text-xs text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-slate-900 border border-rail-border rounded-lg text-xs text-white"
                  >
                    <option value="CONGESTION">Congestion</option>
                    <option value="WEATHER">Weather Impact</option>
                    <option value="TRACK_ANOMALY">Track Anomaly</option>
                    <option value="OBSTACLE">Obstacle Detection</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">Severity</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-slate-900 border border-rail-border rounded-lg text-xs text-white"
                  >
                    <option value="NORMAL">Normal Info</option>
                    <option value="WARNING">Warning</option>
                    <option value="HIGH_RISK">High Risk</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Description & Guidance</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Details of the operational advisory..."
                  rows={3}
                  className="w-full mt-1 px-3 py-2 bg-slate-900 border border-rail-border rounded-lg text-xs text-white"
                  required
                />
              </div>

              <div className="flex space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-rail-orange hover:bg-rail-saffron text-white rounded-lg text-xs font-bold shadow-md shadow-rail-orange/20"
                >
                  Dispatch Alert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
