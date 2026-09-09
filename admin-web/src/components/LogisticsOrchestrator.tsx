import React, { useEffect, useState } from 'react';
import { Settings, Train, Users, Clock, Coffee, Bus, CheckCircle2 } from 'lucide-react';
import { fetchLogisticsOrchestration } from '../services/api';

export const LogisticsOrchestrator: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const result = await fetchLogisticsOrchestration();
        setData(result);
      } catch (err) {
        console.error('Failed to load Logistics data', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
    const interval = setInterval(loadData, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, []);

  if (loading || !data) {
    return (
      <div className="flex justify-center items-center h-64 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="animate-pulse flex flex-col items-center">
          <Settings className="w-8 h-8 text-indigo-500 mb-2 animate-spin-slow" />
          <span className="text-slate-500 font-mono text-sm">Orchestrating Logistics...</span>
        </div>
      </div>
    );
  }

  const getIcon = (department: string) => {
    switch (department) {
      case 'Crew Management': return <Users className="w-5 h-5 text-indigo-600" />;
      case 'Station Operations': return <Train className="w-5 h-5 text-emerald-600" />;
      case 'Catering (IRCTC)': return <Coffee className="w-5 h-5 text-amber-600" />;
      case 'City Transport': return <Bus className="w-5 h-5 text-blue-600" />;
      default: return <Settings className="w-5 h-5 text-slate-600" />;
    }
  };

  const getBg = (department: string) => {
    switch (department) {
      case 'Crew Management': return 'bg-indigo-50 border-indigo-200';
      case 'Station Operations': return 'bg-emerald-50 border-emerald-200';
      case 'Catering (IRCTC)': return 'bg-amber-50 border-amber-200';
      case 'City Transport': return 'bg-blue-50 border-blue-200';
      default: return 'bg-slate-50 border-slate-200';
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-4 space-y-4 md:space-y-0">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-50 rounded-lg">
            <Settings className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-slate-900 text-lg">Predictive Logistics Orchestration</h3>
            <p className="text-xs text-slate-500 mt-1">Automated downstream actions triggered by dynamic ETA shifts</p>
          </div>
        </div>
        
        <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center space-x-4">
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-500">Trigger Event</div>
            <div className="font-bold text-slate-900 text-sm">{data.triggerTrain}</div>
          </div>
          <div className="h-8 w-px bg-slate-200"></div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-500">ETA Shift</div>
            <div className="font-mono font-bold text-red-600">{data.delay}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.orchestratedActions.map((action: any, idx: number) => (
          <div key={idx} className={`p-4 rounded-xl border ${getBg(action.department)} shadow-sm relative overflow-hidden`}>
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-white rounded-md shadow-sm">
                  {getIcon(action.department)}
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">{action.department}</span>
              </div>
              <div className="flex items-center space-x-1 bg-white/60 px-2 py-1 rounded-full border border-slate-200/50 backdrop-blur-sm">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-[10px] font-bold text-emerald-700">{action.status}</span>
              </div>
            </div>
            
            <h4 className="font-bold text-slate-900 text-base mb-2">{action.action}</h4>
            <p className="text-sm text-slate-600 leading-relaxed mb-4">{action.details}</p>
            
            <div className="flex items-center space-x-2 text-xs font-medium border-t border-slate-200/50 pt-3">
              <span className="text-slate-500">Impact:</span>
              <span className="text-emerald-700 font-bold bg-emerald-100/50 px-2 py-0.5 rounded-md">
                Savings: ₹{(action.costSavedINR).toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-900 rounded-xl p-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center space-x-3">
          <Clock className="w-6 h-6 text-emerald-400" />
          <div>
            <h5 className="font-bold text-white text-sm">Total Idle Operations Saved</h5>
            <p className="text-slate-400 text-xs">For this single train delay event</p>
          </div>
        </div>
        <div className="text-2xl font-bold font-mono text-emerald-400">
          {data.totalOperationsSaved}
        </div>
      </div>
    </div>
  );
};
