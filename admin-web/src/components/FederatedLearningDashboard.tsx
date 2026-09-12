import React, { useEffect, useState } from 'react';
import { Network, Server, Shield, Database, Activity, RefreshCw } from 'lucide-react';
import { fetchFederatedLearning } from '../services/api';

export const FederatedLearningDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const result = await fetchFederatedLearning();
        setData(result);
      } catch (err) {
        console.error('Failed to load FL data', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
    const interval = setInterval(loadData, 8000); // refresh every 8s
    return () => clearInterval(interval);
  }, []);

  if (loading || !data) {
    return (
      <div className="flex justify-center items-center h-64 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="animate-pulse flex flex-col items-center">
          <Network className="w-8 h-8 text-blue-500 mb-2" />
          <span className="text-slate-500 font-mono text-sm">Initializing Federated Network...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-center">
          <div className="flex items-center space-x-2 text-slate-500 mb-2">
            <Server className="w-4 h-4" />
            <span className="text-xs font-bold uppercase">Global Model Version</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">{data.globalModelVersion}</div>
        </div>
        
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-center">
          <div className="flex items-center space-x-2 text-slate-500 mb-2">
            <Activity className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-bold uppercase">National Accuracy</span>
          </div>
          <div className="text-2xl font-bold text-emerald-600 font-mono">{data.globalAccuracy}%</div>
          <div className="text-xs text-slate-400 mt-1">Aggregated across 17 Zones</div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-center">
          <div className="flex items-center space-x-2 text-slate-500 mb-2">
            <RefreshCw className="w-4 h-4" />
            <span className="text-xs font-bold uppercase">Federated Epochs</span>
          </div>
          <div className="text-2xl font-bold text-blue-600 font-mono">{data.epochsCompleted}</div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-center bg-gradient-to-br from-slate-900 to-slate-800 text-white">
          <div className="flex items-center space-x-2 text-slate-300 mb-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold uppercase">Privacy Compliance</span>
          </div>
          <div className="text-lg font-bold text-emerald-400">{data.privacyStatus}</div>
          <div className="text-[10px] text-slate-400 mt-1">Only encrypted weight gradients shared</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Network className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-slate-900 text-lg">Zonal Railway Nodes (Local Models)</h3>
              <p className="text-xs text-slate-500 mt-1">
                Data Points Processed Locally: <span className="font-bold text-slate-700">{data.totalDataPointsProcessed}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {data.zoneNodes.map((node: any) => (
            <div key={node.zoneCode} className={`p-4 rounded-xl border flex flex-col items-center justify-center text-center shadow-sm transition-all ${
              node.status === 'SYNCED' ? 'bg-emerald-50/50 border-emerald-200' :
              node.status === 'SYNCING' ? 'bg-blue-50 border-blue-300 animate-pulse' :
              'bg-slate-50 border-slate-200 opacity-60'
            }`}>
              <div className="font-bold text-lg text-slate-800 mb-1">{node.zoneCode}</div>
              <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider mb-2 ${
                node.status === 'SYNCED' ? 'bg-emerald-100 text-emerald-700' :
                node.status === 'SYNCING' ? 'bg-blue-100 text-blue-700' :
                'bg-slate-200 text-slate-600'
              }`}>
                {node.status}
              </div>
              <div className="text-xs font-mono font-medium text-slate-600 mt-1">
                Acc: {node.localModelAccuracy > 0 ? `${node.localModelAccuracy}%` : '--'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
