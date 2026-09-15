import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { AdminAuthGuard } from './components/AdminAuthGuard';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { KPICards } from './components/KPICards';
import { LiveRailwayMap } from './components/LiveRailwayMap';
import { DigitalTwinStudio } from './components/DigitalTwinStudio';
import { TrackHealthMonitor } from './components/TrackHealthMonitor';
import { CrowdHeatmaps } from './components/CrowdHeatmaps';
import { AlertsManager } from './components/AlertsManager';
import { DelayPropagationTree } from './components/DelayPropagationTree';
import { GNNCascadeVisualizer } from './components/GNNCascadeVisualizer';
import { FederatedLearningDashboard } from './components/FederatedLearningDashboard';
import { LogisticsOrchestrator } from './components/LogisticsOrchestrator';
import { SelfLearningMLDashboard } from './components/SelfLearningMLDashboard';
import { fetchDashboardData, fetchTrackRisk, initSocket } from './services/api';
import { LiveTrain, TrackSection, AlertItem, DashboardMetrics } from './types';
import bgOrange from './assets/bg_vande_orange.jpg';
import bgBlue from './assets/bg_vande_blue.jpg';

const tabBackgrounds: Record<string, string> = {
  'overview': bgOrange,
  'map': bgBlue,
  'digital-twin': bgOrange,
  'track-health': bgBlue,
  'crowd': bgOrange,
  'alerts': bgBlue,
  'gnn': bgOrange,
  'federated': bgBlue,
  'logistics': bgOrange,
  'ml-engine': bgBlue,
};

const DashboardContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [selectedZone, setSelectedZone] = useState<string>('ALL');
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    activeTrains: 1000,
    delayedTrains: 142,
    criticalIncidents: 3,
    highCrowdStations: 12,
    trackRisks: 8,
    weatherAlerts: 14,
    networkPunctualityPct: 89.2,
    avgNetworkSpeedKmh: 84.0,
  });
  const [trains, setTrains] = useState<LiveTrain[]>([]);
  const [trackSections, setTrackSections] = useState<TrackSection[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [progressiveHistory, setProgressiveHistory] = useState<any[]>([]);
  const [liveTelemetry, setLiveTelemetry] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchDashboardData();
        if (data && data.metrics) {
          setMetrics(data.metrics);
          setAlerts(data.recentAlerts || []);
          setTrackSections(data.trackSections || []);
        }
        const trackData = await fetchTrackRisk();
        if (trackData && trackData.sections) {
          setTrackSections(trackData.sections);
          setProgressiveHistory(trackData.progressiveRiskHistory || []);
        }
      } catch (err) {
        console.error('Error fetching dashboard initial data:', err);
      }
    };
    loadData();

    const socket = initSocket();

    socket.on('connect', () => {
      console.log('[Admin Web] Socket connected to RailIo Live Gateway');
    });

    socket.on('trains_update', (updatedTrains: LiveTrain[]) => {
      setTrains(updatedTrains);
    });

    socket.on('engine_telemetry', (engineStats: any) => {
      if (engineStats && engineStats.activeTrains) {
        setMetrics((prev) => ({
          ...prev,
          activeTrains: engineStats.activeTrains,
        }));
      }
    });

    socket.on('sensor_telemetry', (telemetry: any) => {
      setLiveTelemetry(telemetry);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const currentBg = tabBackgrounds[activeTab] || bgOrange;

  return (
    <div
      className="min-h-screen text-slate-800 flex flex-col selection:bg-rail-orange selection:text-white relative transition-all duration-500 ease-in-out bg-slate-100"
      style={{
        backgroundImage: `linear-gradient(rgba(248, 250, 252, 0.65), rgba(248, 250, 252, 0.78)), url(${currentBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        backgroundAttachment: 'fixed',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Top Navigation Bar */}
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        metrics={metrics}
        selectedZone={selectedZone}
        onSelectZone={setSelectedZone}
      />

      {/* Main Dashboard Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <HeroSection 
              onNavigateTab={setActiveTab} 
              selectedZone={selectedZone}
              onSelectZone={setSelectedZone}
            />
            <KPICards metrics={metrics} />
            <LiveRailwayMap 
              trains={trains} 
              trackSections={trackSections} 
              selectedZone={selectedZone}
              onSelectZone={setSelectedZone}
            />
          </div>
        )}

        {activeTab === 'map' && (
          <div className="space-y-6">
            <KPICards metrics={metrics} />
            <LiveRailwayMap 
              trains={trains} 
              trackSections={trackSections} 
              selectedZone={selectedZone}
              onSelectZone={setSelectedZone}
            />
          </div>
        )}

        {activeTab === 'digital-twin' && (
          <div className="space-y-6">
            <KPICards metrics={metrics} />
            <DigitalTwinStudio />
          </div>
        )}

        {activeTab === 'track-health' && (
          <div className="space-y-6">
            <KPICards metrics={metrics} />
            <TrackHealthMonitor
              trackSections={trackSections}
              progressiveHistory={progressiveHistory}
              liveTelemetry={liveTelemetry}
            />
          </div>
        )}

        {activeTab === 'crowd' && (
          <div className="space-y-6">
            <KPICards metrics={metrics} />
            <CrowdHeatmaps />
          </div>
        )}

        {activeTab === 'alerts' && (
          <div className="space-y-6">
            <KPICards metrics={metrics} />
            <AlertsManager
              alerts={alerts}
              onNewAlert={(newAlt) => setAlerts((prev) => [newAlt, ...prev])}
            />
          </div>
        )}

        {activeTab === 'gnn' && (
          <div className="space-y-6">
            <GNNCascadeVisualizer />
          </div>
        )}

        {activeTab === 'federated' && (
          <div className="space-y-6">
            <FederatedLearningDashboard />
          </div>
        )}

        {activeTab === 'logistics' && (
          <div className="space-y-6">
            <LogisticsOrchestrator />
          </div>
        )}

        {activeTab === 'ml-engine' && (
          <div style={{ margin: '0 -24px' }}>
            <SelfLearningMLDashboard />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500 shadow-sm mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <span className="font-russo font-normal text-slate-900 notranslate text-sm" translate="no">
              Rail<span className="text-[#FF671F]">io</span>
            </span> — Indian Railways National AI Intelligence Platform (18 Operational Zones • 5,000+ Concurrent Fleet)
          </div>
          <div className="text-[11px] text-slate-400">
            Vectorized ML Inference • Real-Time Discrete-Event Digital Twin
          </div>
        </div>
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AdminAuthGuard>
        <DashboardContent />
      </AdminAuthGuard>
    </AuthProvider>
  );
};

export default App;
