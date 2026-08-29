import React, { useState, useEffect } from 'react';
import { Activity, Bell, Shield, Train, Radio, Cpu, User } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  metrics?: any;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, metrics }) => {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-IN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  const navItems = [
    { id: 'overview', label: 'Operations Overview', icon: Activity },
    { id: 'map', label: 'Live Network Map', icon: Train },
    { id: 'digital-twin', label: 'Digital Twin & What-If', icon: Cpu },
    { id: 'track-health', label: 'Track Health & IoT', icon: Shield },
    { id: 'crowd', label: 'Station Crowd Heatmaps', icon: Radio },
    { id: 'alerts', label: 'Incident Control', icon: Bell },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo Branding */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rail-orange to-rail-saffron flex items-center justify-center shadow-md shadow-rail-orange/20">
              <Train className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-heading text-xl font-extrabold tracking-wider text-slate-900">
                  RailSathi
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase bg-orange-50 text-rail-orange border border-orange-200 rounded-full">
                  HQ Controller
                </span>
              </div>
              <p className="text-[10px] tracking-wide text-slate-500 font-medium hidden sm:block">
                Predict • Protect • Connect • Digital Twin
              </p>
            </div>
          </div>

          {/* Nav Tabs */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-rail-orange text-white shadow-md shadow-rail-orange/20 font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Status Pill & Controller Badge */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-mono font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-glow" />
              <span>LIVE TELEMETRY 3s</span>
            </div>

            <div className="hidden sm:block text-right">
              <div className="text-xs font-mono font-bold text-slate-800">{time} IST</div>
              <div className="text-[10px] text-slate-500">IR Division: Northern & Eastern</div>
            </div>

            <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-rail-orange">
                <User className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <div className="flex lg:hidden overflow-x-auto py-2 space-x-2 border-t border-slate-200">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-md text-[11px] whitespace-nowrap font-medium ${
                  isActive ? 'bg-rail-orange text-white font-bold' : 'text-slate-600 bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
