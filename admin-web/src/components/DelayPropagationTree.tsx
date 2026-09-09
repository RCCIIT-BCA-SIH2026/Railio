import React from 'react';
import { ArrowDown, Clock, GitBranch, AlertTriangle, Train } from 'lucide-react';

export const DelayPropagationTree: React.FC = () => {
  const propagationNodes = [
    {
      step: 'Primary Root Incident',
      train: 'Train 32216 (Dankuni - Sealdah Local)',
      delay: '+15 min',
      cause: 'Platform clearance at Dankuni Junction',
      impact: 'Rake held at outer signal',
      color: 'border-red-200 bg-red-50/80',
      tagColor: 'text-red-700 font-bold',
      trainColor: 'text-slate-900',
    },
    {
      step: 'Cascading Headway Delay',
      train: 'Train 32218 (Dankuni - Sealdah Local)',
      delay: '+8 min',
      cause: 'Single line section occupied by Train 32216',
      impact: 'Dakshineswar approach delayed',
      color: 'border-amber-200 bg-amber-50/80',
      tagColor: 'text-amber-700 font-bold',
      trainColor: 'text-slate-900',
    },
    {
      step: 'Connecting Line Cascade',
      train: 'Train 32220 (Dankuni - Sealdah Local)',
      delay: '+6 min',
      cause: 'Block headway spacing on Sealdah Chord',
      impact: 'Dum Dum Junction arrival delayed',
      color: 'border-amber-200 bg-amber-50/80',
      tagColor: 'text-amber-700 font-bold',
      trainColor: 'text-slate-900',
    },
    {
      step: 'Terminal Network Impact',
      train: 'Train 32222 (Dankuni - Sealdah Local)',
      delay: '+12 min',
      cause: 'Platform occupancy congestion at Sealdah Terminal',
      impact: 'Rake reversal buffer compressed',
      color: 'border-rose-200 bg-rose-50/80',
      tagColor: 'text-rose-700 font-bold',
      trainColor: 'text-slate-900',
    },
  ];

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center space-x-2">
          <GitBranch className="w-5 h-5 text-rail-orange" />
          <h3 className="font-heading font-bold text-slate-900 text-base">
            Network Delay Propagation Tree (Graph Cascades)
          </h3>
        </div>
        <span className="text-xs text-slate-500 font-mono">
          GNN / NetworkX Conflict Prediction
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
        {propagationNodes.map((node, idx) => (
          <div key={idx} className="relative flex flex-col">
            <div
              className={`p-4 rounded-xl border ${node.color} flex flex-col justify-between flex-1 relative z-10 shadow-sm`}
            >
              <div>
                <div className="flex items-center justify-between text-[11px] text-slate-600 font-semibold mb-2">
                  <span>{node.step}</span>
                  <span className={`font-mono text-xs ${node.tagColor}`}>{node.delay}</span>
                </div>
                <div className="font-heading font-bold text-slate-900 text-sm mb-1">{node.train}</div>
                <p className="text-xs text-slate-600 mb-2">{node.cause}</p>
              </div>
              <div className="text-[10px] text-slate-500 pt-2 border-t border-slate-200/60 font-medium">
                ⚡ {node.impact}
              </div>
            </div>

            {idx < propagationNodes.length - 1 && (
              <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-6 h-6 rounded-full bg-white border border-slate-200 shadow-sm items-center justify-center text-rail-orange text-xs font-bold">
                →
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
