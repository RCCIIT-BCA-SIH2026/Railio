import React from 'react';
import { ArrowDown, Clock, GitBranch, AlertTriangle, Train } from 'lucide-react';

export const DelayPropagationTree: React.FC = () => {
  const propagationNodes = [
    {
      step: 'Primary Root Incident',
      train: 'Train 12301 (Howrah Rajdhani)',
      delay: '+15 min',
      cause: 'Junction switch clearance at DDU Interlocking',
      impact: 'Rake held at outer signal',
      color: 'border-red-500 bg-red-950/40 text-red-400',
    },
    {
      step: 'Cascading Headway Delay',
      train: 'Train 12004 (Lucknow Shatabdi)',
      delay: '+8 min',
      cause: 'Single line crossover occupied by Train 12301',
      impact: 'Platform 1 approach blocked',
      color: 'border-amber-500 bg-amber-950/40 text-amber-400',
    },
    {
      step: 'Connecting Line Cascade',
      train: 'Train 12841 (Coromandel Express)',
      delay: '+12 min',
      cause: 'Delayed loco pilot crew handover from DDU yard',
      impact: 'Dwell time overshoot at Kharagpur',
      color: 'border-amber-500 bg-amber-950/40 text-amber-400',
    },
    {
      step: 'Terminal Network Impact',
      train: 'Train 12245 (Duronto Express)',
      delay: '+19 min',
      cause: 'Platform occupancy congestion at Howrah Terminal',
      impact: 'Turnaround buffer exhausted',
      color: 'border-rose-500 bg-rose-950/40 text-rose-400',
    },
  ];

  return (
    <div className="glass-panel rounded-2xl p-6 border border-rail-border shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-rail-border pb-3">
        <div className="flex items-center space-x-2">
          <GitBranch className="w-5 h-5 text-rail-orange" />
          <h3 className="font-heading font-bold text-white text-base">
            Network Delay Propagation Tree (Graph Cascades)
          </h3>
        </div>
        <span className="text-xs text-slate-400 font-mono">
          GNN / NetworkX Conflict Prediction
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
        {propagationNodes.map((node, idx) => (
          <div key={idx} className="relative flex flex-col">
            <div
              className={`p-4 rounded-xl border ${node.color} flex flex-col justify-between flex-1 relative z-10 glass-panel shadow-lg`}
            >
              <div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold mb-2">
                  <span>{node.step}</span>
                  <span className="font-mono text-xs text-white font-extrabold">{node.delay}</span>
                </div>
                <div className="font-heading font-bold text-white text-sm mb-1">{node.train}</div>
                <p className="text-xs text-slate-300 mb-2">{node.cause}</p>
              </div>
              <div className="text-[10px] text-slate-400 pt-2 border-t border-white/10 font-medium">
                ⚡ {node.impact}
              </div>
            </div>

            {idx < propagationNodes.length - 1 && (
              <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-6 h-6 rounded-full bg-slate-900 border border-rail-border items-center justify-center text-rail-orange">
                →
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
