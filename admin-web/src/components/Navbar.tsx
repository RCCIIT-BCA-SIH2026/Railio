import React, { useState, useEffect } from 'react';
import { Activity, Bell, Shield, Train, Radio, Cpu, User, Users, FileText, LogOut, GitBranch, Network, Settings, Globe, Zap } from 'lucide-react';
import { useAdminAuth } from '../context/AuthContext';
import { UserManagementModal } from './UserManagementModal';
import { AuditLogViewer } from './AuditLogViewer';
import { LanguageSelector } from './LanguageSelector';
import { PillNav } from './PillNav';
import logoImg from '../assets/logo.png';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  metrics?: any;
  selectedZone?: string;
  onSelectZone?: (zone: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  activeTab, 
  setActiveTab,
  selectedZone = 'ALL',
  onSelectZone
}) => {
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
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'map', label: 'Live Map', icon: Train },
    { id: 'digital-twin', label: 'Digital Twin', icon: Cpu },
    { id: 'track-health', label: 'Track Health', icon: Shield },
    { id: 'crowd', label: 'Crowd Heatmaps', icon: Radio },
    { id: 'alerts', label: 'Incidents', icon: Bell },
    { id: 'gnn', label: 'GNN AI', icon: GitBranch },
    { id: 'federated', label: 'Federated AI', icon: Network },
    { id: 'logistics', label: 'Logistics', icon: Settings },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 w-full">
            {/* Logo Branding - Far Left */}
            <div className="flex items-center space-x-2.5 shrink-0">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden shrink-0 shadow-sm border border-orange-100 bg-white p-0.5">
                <img src={logoImg} alt="Railio Logo" className="w-full h-full object-contain scale-110" />
              </div>
              <div className="shrink-0">
                <div className="flex items-center space-x-1.5">
                  <span className="font-russo text-xl tracking-wider text-black notranslate whitespace-nowrap" translate="no">
                    Rail<span className="text-[#FF671F]">io</span>
                  </span>
                  <span className="px-1.5 py-0.5 text-[8.5px] font-extrabold tracking-wider uppercase bg-orange-50 text-rail-orange border border-orange-200 rounded-full whitespace-nowrap leading-none">
                    18-Zone Controller
                  </span>
                </div>
                <p className="text-[8.5px] font-bold tracking-wider text-[#FF671F] uppercase hidden sm:block whitespace-nowrap">
                  INDIAN RAILWAYS AI ECOSYSTEM
                </p>
              </div>
            </div>

            {/* GSAP Animated Pill Navbar - Centered in Middle */}
            <div className="flex-1 flex justify-center items-center mx-3 min-w-0">
              <PillNav
                logo={logoImg}
                logoAlt="Railio Logo"
                showLogo={false}
                items={navItems.map((item) => ({
                  id: item.id,
                  label: item.label,
                  href: `#${item.id}`
                }))}
                activeHref={`#${activeTab}`}
                onItemClick={(item) => {
                  if (item.id) setActiveTab(item.id);
                }}
                baseColor="#FF671F"
                pillColor="#0F172A"
                hoveredPillTextColor="#FFFFFF"
                pillTextColor="#FFFFFF"
                initialLoadAnimation={true}
              />
            </div>

            {/* Right Control Bar - Far Right */}
            <div className="flex items-center space-x-2 shrink-0">
              {/* User Management & Audit Logs Triggers */}
              <div className="hidden sm:flex flex-col space-y-1">
                <button
                  onClick={() => setIsUserModalOpen(true)}
                  className="flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold transition leading-tight"
                  title="Manage Users & Roles"
                >
                  <Users className="w-3 h-3 text-slate-500" />
                  <span>RBAC Users</span>
                </button>

                <button
                  onClick={() => setIsAuditModalOpen(true)}
                  className="flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold transition leading-tight"
                  title="View Admin Audit Trail"
                >
                  <FileText className="w-3 h-3 text-slate-500" />
                  <span>Audit Logs</span>
                </button>
              </div>

              {/* Admin Profile & Logout (With Language Selector under role) */}
              <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
                <div className="text-right hidden md:flex flex-col items-end">
                  <div className="text-xs font-bold text-slate-900 leading-none">
                    {profile?.full_name || user?.email?.split('@')[0]}
                  </div>
                  <div className="text-[10px] font-mono text-rail-orange font-bold uppercase leading-tight mt-0.5 mb-1">
                    {profile?.role || 'CHIEF_CONTROLLER'}
                  </div>
                  {/* Language Selector placed right under CHIEF_CONTROLLER */}
                  <LanguageSelector />
                </div>

                <button
                  onClick={signOut}
                  className="p-2 hover:bg-red-50 hover:text-red-600 rounded-lg text-slate-500 transition cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* RBAC Modal */}
      {isUserModalOpen && <UserManagementModal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} />}

      {/* Audit Log Modal */}
      {isAuditModalOpen && <AuditLogViewer isOpen={isAuditModalOpen} onClose={() => setIsAuditModalOpen(false)} />}
    </>
  );
};
