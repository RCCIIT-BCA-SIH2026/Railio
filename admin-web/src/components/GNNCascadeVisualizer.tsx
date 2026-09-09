import React, { useEffect, useState } from 'react';
import { GitBranch, AlertTriangle, ArrowRight, ShieldCheck, TrendingDown } from 'lucide-react';
import { fetchGnnCascade } from '../services/api';

export const GNNCascadeVisualizer: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const result = await fetchGnnCascade();
        setData(result);
      } catch (err) {
        console.error('Failed to load GNN cascade data', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
    const interval = setInterval(loadData, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, []);

  if (loading || !data) {
    return (
      <div className="flex justify-center items-center h-64 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="animate-pulse flex flex-col items-center">
          <GitBranch className="w-8 h-8 text-rail-orange mb-2" />
          <span className="text-slate-500 font-mono text-sm">Loading Graph Neural Network...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-orange-50 rounded-lg">
            <GitBranch className="w-6 h-6 text-rail-orange" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-slate-900 text-lg">Network-Wide Delay Propagation (GNN)</h3>
            <p className="text-xs text-slate-500 font-mono flex items-center mt-1">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse mr-2" />
              STATUS: {data.networkStatus.replace(/_/g, ' ')}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Primary Incident Node */}
        <div className="lg:col-span-1 border-2 border-red-200 bg-red-50/50 rounded-xl p-4 flex flex-col justify-center relative shadow-sm">
          <div className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 hidden lg:flex items-center justify-center bg-white rounded-full p-1 shadow-sm border border-slate-200 text-slate-400">
            <ArrowRight className="w-4 h-4" />
          </div>
          <div className="flex items-center space-x-2 text-red-700 font-bold mb-2 text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span>Root Incident</span>
          </div>
          <h4 className="font-bold text-slate-900 text-base">{data.primaryIncident.trainNumber} - {data.primaryIncident.trainName}</h4>
          <p className="text-slate-600 text-sm mt-1 flex items-center justify-between">
            <span>Location:</span>
            <span className="font-medium text-slate-900">{data.primaryIncident.station}</span>
          </p>
          <p className="text-slate-600 text-sm mt-1 flex items-center justify-between">
            <span>Current Delay:</span>
            <span className="font-mono font-bold text-red-600">+{data.primaryIncident.delayMinutes} min</span>
          </p>
          <div className="mt-3 text-xs bg-white text-red-700 border border-red-200 px-2 py-1.5 rounded-md font-medium">
            {data.primaryIncident.rootCause}
          </div>
        </div>

        {/* Cascading Nodes */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.cascadingImpact.map((node: any, idx: number) => (
            <div key={node.id} className={`border rounded-xl p-4 shadow-sm relative ${
              node.status === 'AWAITING_REGULATION' ? 'border-amber-200 bg-amber-50/30' :
              node.status === 'PRIORITY_REORDERED' ? 'border-blue-200 bg-blue-50/30' :
              'border-emerald-200 bg-emerald-50/30'
            }`}>
              {idx > 0 && (
                 <div className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 hidden md:flex items-center justify-center bg-white rounded-full shadow-sm text-slate-400 border border-slate-200">
                   <ArrowRight className="w-4 h-4" />
                 </div>
              )}
              <div className="flex items-center justify-between mb-2 text-xs font-bold uppercase tracking-wider">
                <span className={
                  node.status === 'AWAITING_REGULATION' ? 'text-amber-700' :
                  node.status === 'PRIORITY_REORDERED' ? 'text-blue-700' : 'text-emerald-700'
                }>{node.status.replace('_', ' ')}</span>
                <span className="text-slate-400 font-mono text-[10px]">{(node.confidenceScore * 100).toFixed(0)}% CONF</span>
              </div>
              <h4 className="font-bold text-slate-900 text-sm">{node.trainNumber} - {node.trainName}</h4>
              <p className="text-slate-600 text-xs mt-1">Impact at: <span className="font-medium text-slate-900">{node.impactStation}</span></p>
              
              <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Predicted Delay</div>
                  <div className={`font-mono font-bold text-sm ${node.predictedDelayMinutes > 20 ? 'text-red-600' : 'text-amber-600'}`}>+{node.predictedDelayMinutes} min</div>
                </div>
                <div className="text-right">
                   <div className="text-[10px] text-slate-500 uppercase font-semibold">Time to Impact</div>
                   <div className="font-mono font-bold text-sm text-slate-800">T-{node.timeToImpactMinutes}m</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start space-x-3">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <h5 className="font-bold text-slate-900 text-sm">GNN Automated Recommendation</h5>
          <p className="text-slate-600 text-sm mt-1">{data.systemRecommendation}</p>
        </div>
      </div>
    </div>
  );
};
