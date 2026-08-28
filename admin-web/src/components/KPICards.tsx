import React from 'react';
import { Train, Clock, AlertTriangle, Users, Activity, CloudRain } from 'lucide-react';
import { DashboardMetrics } from '../types';

interface KPICardsProps {
  metrics: DashboardMetrics;
}

export const KPICards: React.FC<KPICardsProps> = ({ metrics }) => {
  const cards = [
    {
      title: 'Active Trains',
      value: metrics.activeTrains,
      subtext: 'Across East & North Corridors',
      icon: Train,
      color: 'from-blue-500 to-indigo-600',
      border: 'border-blue-500/30',
      glow: 'shadow-blue-500/10',
      badge: '98.2% Punctual',
      badgeColor: 'text-blue-400 bg-blue-950/60',
    },
    {
      title: 'Delayed Trains',
      value: metrics.delayedTrains,
      subtext: 'Avg Delay: +8.4 min',
      icon: Clock,
      color: 'from-amber-500 to-orange-600',
      border: 'border-amber-500/30',
      glow: 'shadow-amber-500/10',
      badge: 'Junction Congestion',
      badgeColor: 'text-amber-400 bg-amber-950/60',
    },
    {
      title: 'Critical Incidents',
      value: metrics.criticalIncidents,
      subtext: '1 Track, 2 Congestion',
      icon: AlertTriangle,
      color: 'from-red-500 to-rose-700',
      border: 'border-red-500/30',
      glow: 'shadow-red-500/10',
      badge: 'Caution Orders Active',
      badgeColor: 'text-red-400 bg-red-950/60',
    },
    {
      title: 'High-Crowd Stations',
      value: metrics.highCrowdStations,
      subtext: 'Howrah, NDLS, Sealdah',
      icon: Users,
      color: 'from-purple-500 to-violet-600',
      border: 'border-purple-500/30',
      glow: 'shadow-purple-500/10',
      badge: 'Platform Surges',
      badgeColor: 'text-purple-400 bg-purple-950/60',
    },
    {
      title: 'Track Risks (ESP32)',
      value: metrics.trackRisks,
      subtext: 'Section B-17 (RMS 3.42g)',
      icon: Activity,
      color: 'from-rail-orange to-amber-600',
      border: 'border-rail-orange/30',
      glow: 'shadow-rail-orange/10',
      badge: 'IoT Vibration Alert',
      badgeColor: 'text-rail-orange bg-orange-950/60',
    },
    {
      title: 'Weather Warnings',
      value: metrics.weatherAlerts,
      subtext: 'Heavy Monsoon Rain at HWH',
      icon: CloudRain,
      color: 'from-cyan-500 to-teal-600',
      border: 'border-cyan-500/30',
      glow: 'shadow-cyan-500/10',
      badge: 'Speed Cap Active',
      badgeColor: 'text-cyan-400 bg-cyan-950/60',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <div
            key={i}
            className={`glass-panel glass-card-hover rounded-xl p-4 border ${c.border} shadow-lg ${c.glow} relative overflow-hidden`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400">{c.title}</span>
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${c.color} flex items-center justify-center text-white shadow-md`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>

            <div className="text-2xl sm:text-3xl font-extrabold font-heading text-white tracking-tight">
              {c.value}
            </div>

            <div className="mt-2 flex items-center justify-between">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border border-white/10 ${c.badgeColor}`}>
                {c.badge}
              </span>
            </div>

            <div className="mt-1 text-[11px] text-slate-400 font-medium truncate">
              {c.subtext}
            </div>
          </div>
        );
      })}
    </div>
  );
};
