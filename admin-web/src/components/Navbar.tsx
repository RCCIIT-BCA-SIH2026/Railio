import React, { useState, useEffect } from 'react';
import { Activity, Bell, Shield, Train, Radio, Cpu, User, Users, FileText, LogOut, GitBranch, Network, Settings } from 'lucide-react';
import { useAdminAuth } from '../context/AuthContext';
import { UserManagementModal } from './UserManagementModal';
import { AuditLogViewer } from './AuditLogViewer';
import { LanguageSelector } from './LanguageSelector';
import logoImg from '../assets/logo.png';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  metrics?: any;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { user, profile, signOut } = useAdminAuth();
  const [time, setTime] = useState<string>('');
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

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
    { id: 'gnn', label: 'Network GNN', icon: GitBranch },
    { id: 'federated', label: 'Federated AI', icon: Network },
    { id: 'logistics', label: 'Logistics Sync', icon: Settings },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo Branding */}
            <div className="flex items-center space-x-3 shrink-0">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden shrink-0 shadow-sm border border-orange-100 bg-white p-0.5">
                <img src={logoImg} alt="Railio Logo" className="w-full h-full object-contain scale-110" />
              </div>
              <div className="shrink-0">
                <div className="flex items-center space-x-2">
                  <span className="font-russo text-2xl tracking-wider text-black notranslate whitespace-nowrap" translate="no">
                    Rail<span className="text-[#FF671F]">io</span>
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase bg-orange-50 text-rail-orange border border-orange-200 rounded-full whitespace-nowrap">
                    HQ Controller
                  </span>
                </div>
                <p className="text-[9.5px] font-bold tracking-wider text-[#FF671F] uppercase hidden sm:block whitespace-nowrap">
                  AI RAILWAY INTELLIGENCE
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

            {/* Right Control Bar */}
            <div className="flex items-center space-x-3">
              {/* Google Translate Multilingual Switcher */}
              <LanguageSelector />

              {/* User Management Trigger */}
              <button
                onClick={() => setIsUserModalOpen(true)}
                className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                title="Manage Users & Roles"
              >
                <Users className="w-3.5 h-3.5 text-slate-500" />
                <span>RBAC Users</span>
              </button>

              {/* Audit Logs Trigger */}
              <button
                onClick={() => setIsAuditModalOpen(true)}
                className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                title="View Admin Audit Trail"
              >
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>Audit Logs</span>
              </button>

              <div className="flex items-center space-x-2 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-mono font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-glow" />
                <span className="hidden md:inline">SUPABASE REALTIME</span>
              </div>

              <div className="hidden xl:block text-right">
                <div className="text-xs font-mono font-bold text-slate-800">{time} IST</div>
              </div>

              {/* Admin Profile & Logout */}
              <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
                <div className="text-right hidden md:block">
                  <div className="text-xs font-bold text-slate-900 leading-none">
                    {profile?.full_name || user?.email?.split('@')[0]}
                  </div>
                  <div className="text-[10px] font-mono text-rail-orange font-bold uppercase">
                    {profile?.role || 'ADMIN'}
                  </div>
                </div>

                <button
                  onClick={signOut}
                  className="p-2 hover:bg-red-50 hover:text-red-600 rounded-lg text-slate-500 transition"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
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

      {/* Admin Modals */}
      <UserManagementModal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} />
      <AuditLogViewer isOpen={isAuditModalOpen} onClose={() => setIsAuditModalOpen(false)} />
    </>
  );
};
