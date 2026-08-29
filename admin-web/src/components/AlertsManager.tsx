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
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-amber-600 flex items-center justify-center text-white shadow-md shadow-red-500/20">
            <Bell className="w-6 h-6 animate-bounce" />
          </div>
          <div>
            <h2 className="font-heading text-xl font-bold text-slate-900 flex items-center space-x-2">
              <span>National Railway Incident & Broadcast Center</span>
              <span className="px-2.5 py-0.5 text-xs font-bold bg-red-50 text-red-700 border border-red-200 rounded-full">
                Omnichannel Gateway Active
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Broadcast high-priority track safety, weather caution, and platform congestion alerts
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 bg-rail-orange hover:bg-rail-saffron text-white rounded-xl text-xs font-bold transition flex items-center space-x-2 shadow-sm"
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
              className={`bg-white rounded-2xl p-5 border ${
                isHigh ? 'border-red-200 bg-red-50/40' : 'border-amber-200 bg-amber-50/40'
              } shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4`}
            >
              <div className="flex items-start space-x-4">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm ${
                    isHigh ? 'bg-red-600' : 'bg-amber-600'
                  }`}
                >
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-heading font-bold text-slate-900 text-base">{alt.title}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        isHigh ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {alt.severity}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">({alt.category})</span>
                  </div>
                  <p className="text-xs text-slate-600 mb-2">{alt.description}</p>
                  {alt.recommendedAction && (
                    <div className="text-xs text-amber-800 font-medium bg-amber-50 p-2 rounded-lg border border-amber-200">
                      ⚡ Action: {alt.recommendedAction}
                    </div>
                  )}
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-xs text-slate-500 font-mono">{alt.timestamp}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 border border-slate-200 shadow-2xl space-y-4">
            <h3 className="font-heading font-bold text-slate-900 text-lg">Broadcast Incident Advisory</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">Alert Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Heavy Rain Speed Restriction at Howrah"
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-rail-orange"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-rail-orange"
                  >
                    <option value="CONGESTION">Congestion</option>
                    <option value="WEATHER">Weather Impact</option>
                    <option value="TRACK_ANOMALY">Track Anomaly</option>
                    <option value="OBSTACLE">Obstacle Detection</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Severity</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-rail-orange"
                  >
                    <option value="NORMAL">Normal Info</option>
                    <option value="WARNING">Warning</option>
                    <option value="HIGH_RISK">High Risk</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Description & Guidance</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Details of the operational advisory..."
                  rows={3}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-rail-orange"
                  required
                />
              </div>

              <div className="flex space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-rail-orange hover:bg-rail-saffron text-white rounded-lg text-xs font-bold shadow-sm"
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
