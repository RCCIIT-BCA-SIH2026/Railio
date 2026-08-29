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
      color: 'border-red-200 bg-red-50 text-red-700',
    },
    {
      step: 'Cascading Headway Delay',
      train: 'Train 12004 (Lucknow Shatabdi)',
      delay: '+8 min',
      cause: 'Single line crossover occupied by Train 12301',
      impact: 'Platform 1 approach blocked',
      color: 'border-amber-200 bg-amber-50 text-amber-700',
    },
    {
      step: 'Connecting Line Cascade',
      train: 'Train 12841 (Coromandel Express)',
      delay: '+12 min',
      cause: 'Delayed loco pilot crew handover from DDU yard',
      impact: 'Dwell time overshoot at Kharagpur',
      color: 'border-amber-200 bg-amber-50 text-amber-700',
    },
    {
      step: 'Terminal Network Impact',
      train: 'Train 12245 (Duronto Express)',
      delay: '+19 min',
      cause: 'Platform occupancy congestion at Howrah Terminal',
      impact: 'Turnaround buffer exhausted',
      color: 'border-rose-200 bg-rose-50 text-rose-700',
    },
  ];

  return (
    <div className="glass-panel rounded-2xl p-6 border border-rail-border shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-rail-border pb-3">
        <div className="flex items-center space-x-2">
          <GitBranch className="w-5 h-5 text-rail-orange" />
          <h3 className="font-heading font-bold text-rail-text text-base">
            Network Delay Propagation Tree (Graph Cascades)
          </h3>
        </div>
        <span className="text-xs text-rail-muted font-mono">
          GNN / NetworkX Conflict Prediction
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
        {propagationNodes.map((node, idx) => (
          <div key={idx} className="relative flex flex-col">
              <div
              className={`p-4 rounded-xl border ${node.color} flex flex-col justify-between flex-1 relative z-10 glass-panel shadow-sm bg-white/60`}
            >
              <div>
                <div className="flex items-center justify-between text-[11px] text-rail-muted font-bold mb-2">
                  <span>{node.step}</span>
                  <span className="font-mono text-xs text-rail-text font-extrabold">{node.delay}</span>
                </div>
                <div className="font-heading font-bold text-rail-text text-sm mb-1">{node.train}</div>
                <p className="text-xs text-rail-muted mb-2">{node.cause}</p>
              </div>
              <div className="text-[10px] text-rail-muted pt-2 border-t border-slate-200 font-medium">
                ⚡ {node.impact}
              </div>
            </div>

            {idx < propagationNodes.length - 1 && (
              <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-6 h-6 rounded-full bg-white border border-slate-200 items-center justify-center text-rail-orange shadow-sm">
                →
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
