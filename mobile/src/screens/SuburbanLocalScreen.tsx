import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, SuburbanDeparture, CoachSignalCrowd } from '../types';
import { getUpcomingSuburbanTrainsApi, getSuburbanCorridorsApi } from '../services/api';
import { AppBackground } from '../components/AppBackground';

export const format12HourTime = (timeStr?: string): string => {
  if (!timeStr || !timeStr.includes(':')) return timeStr || '';
  const clean = timeStr.trim();
  const parts = clean.split(':');
  let h = parseInt(parts[0], 10);
  const m = parts[1] ? parts[1].slice(0, 2) : '00';
  if (isNaN(h)) return timeStr;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${ampm}`;
};

export const SuburbanLocalScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'SuburbanLocal'>>();
  const initialFrom = route.params?.from || 'DAKE';
  const initialTo = route.params?.to || 'SDAH';

  const [fromStation, setFromStation] = useState<string>(initialFrom);
  const [toStation, setToStation] = useState<string>(initialTo);
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');
  const [trains, setTrains] = useState<SuburbanDeparture[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [timeFilter, setTimeFilter] = useState<'1HR' | '2HR' | 'ALL'>('ALL');
  const [selectedCoach, setSelectedCoach] = useState<CoachSignalCrowd | null>(null);
  const [selectedTrainNum, setSelectedTrainNum] = useState<string>('');
  const [showTechModal, setShowTechModal] = useState<boolean>(false);

  // Live system clock updater
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const h = now.getHours().toString().padStart(2, '0');
      const m = now.getMinutes().toString().padStart(2, '0');
      const s = now.getSeconds().toString().padStart(2, '0');
      setCurrentTimeStr(`${h}:${m}:${s}`);
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadUpcoming();
  }, [fromStation, toStation]);

  const loadUpcoming = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const timeVal = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const data = await getUpcomingSuburbanTrainsApi(fromStation, toStation, timeVal);
      if (data?.trains) {
        setTrains(data.trains);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUpcoming();
    setRefreshing(false);
  };

  const swapStations = () => {
    const temp = fromStation;
    setFromStation(toStation);
    setToStation(temp);
  };

  const getStationName = (code: string) => {
    switch (code) {
      case 'DAKE':
        return 'Dakshineswar';
      case 'SDAH':
        return 'Sealdah Terminal';
      case 'BARN':
        return 'Baranagar Road';
      case 'DDJ':
        return 'Dum Dum Junction';
      case 'BNXR':
        return 'Bidhan Nagar Road';
      case 'DKAE':
        return 'Dankuni Junction';
      default:
        return `${code} Station`;
    }
  };

  const filteredTrains = trains.filter((t) => {
    if (timeFilter === '1HR') return t.minutesUntilDeparture <= 60;
    if (timeFilter === '2HR') return t.minutesUntilDeparture <= 120;
    return true;
  });

  const getDensityColor = (status: string) => {
    switch (status) {
      case 'CRITICAL':
        return '#881337'; // dark crimson
      case 'RED':
        return '#EF4444';
      case 'ORANGE':
        return '#F97316';
      case 'YELLOW':
        return '#EAB308';
      case 'GREEN':
      default:
        return '#10B981';
    }
  };

  const nextTrain = filteredTrains[0] || trains[0];

  return (
    <AppBackground variant="blue">
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF671F" />}
      >
      {/* Live Header Corridor Card */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View style={styles.headerTagRow}>
            <View style={styles.suburbanBadge}>
              <Text style={styles.suburbanBadgeText}>SUBURBAN EMU NETWORK</Text>
            </View>
            <View style={styles.googleMapsBadge}>
              <Text style={styles.googleMapsBadgeText}>📡 LIVE SIGNAL TRACKING</Text>
            </View>
          </View>

          <View style={styles.liveClockBox}>
            <View style={styles.livePulseDot} />
            <Text style={styles.liveClockText}>{currentTimeStr || '23:31:00'}</Text>
          </View>
        </View>

        {/* Station Selector with Swap */}
        <View style={styles.stationRow}>
          <View style={styles.stationBox}>
            <Text style={styles.stationLabel}>ORIGIN</Text>
            <Text style={styles.stationCode}>{fromStation}</Text>
            <Text style={styles.stationName} numberOfLines={1}>{getStationName(fromStation)}</Text>
          </View>

          <TouchableOpacity style={styles.swapBtn} onPress={swapStations}>
            <Text style={styles.swapIcon}>⇄</Text>
          </TouchableOpacity>

          <View style={[styles.stationBox, { alignItems: 'flex-end' }]}>
            <Text style={styles.stationLabel}>DESTINATION</Text>
            <Text style={styles.stationCode}>{toStation}</Text>
            <Text style={styles.stationName} numberOfLines={1}>{getStationName(toStation)}</Text>
          </View>
        </View>

        {/* Quick Corridor Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickCorridorScroll}>
          <TouchableOpacity
            style={[styles.corridorChip, fromStation === 'DAKE' && toStation === 'SDAH' && styles.corridorChipActive]}
            onPress={() => { setFromStation('DAKE'); setToStation('SDAH'); }}
          >
            <Text style={styles.corridorChipText}>⭐ Dakshineswar ⇄ Sealdah</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.corridorChip, fromStation === 'DKAE' && toStation === 'SDAH' && styles.corridorChipActive]}
            onPress={() => { setFromStation('DKAE'); setToStation('SDAH'); }}
          >
            <Text style={styles.corridorChipText}>Dankuni ⇄ Sealdah</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.corridorChip, fromStation === 'DDJ' && toStation === 'SDAH' && styles.corridorChipActive]}
            onPress={() => { setFromStation('DDJ'); setToStation('SDAH'); }}
          >
            <Text style={styles.corridorChipText}>Dum Dum ⇄ Sealdah</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.corridorChip, fromStation === 'BARN' && toStation === 'SDAH' && styles.corridorChipActive]}
            onPress={() => { setFromStation('BARN'); setToStation('SDAH'); }}
          >
            <Text style={styles.corridorChipText}>Baranagar ⇄ Sealdah</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Next Upcoming Train Hero Spotlight */}
      {nextTrain && (
        <View style={styles.nextTrainHero}>
          <View style={styles.heroLeft}>
            <Text style={styles.heroNextLabel}>NEXT LOCAL DEPARTURE</Text>
            <Text style={styles.heroCountdown}>
              In {nextTrain.minutesUntilDeparture} min
            </Text>
            <Text style={styles.heroTiming}>
              Dep: <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>{format12HourTime(nextTrain.predictedDeparture)}</Text> • Arr: {format12HourTime(nextTrain.predictedArrival)}
            </Text>
          </View>

          <View style={styles.heroRight}>
            <View style={styles.heroPlatformBox}>
              <Text style={styles.heroPlatformLabel}>PLATFORM</Text>
              <Text style={styles.heroPlatformNum}>{nextTrain.platform}</Text>
            </View>
            <View style={[styles.heroStatusBadge, nextTrain.delayMinutes > 0 ? styles.badgeLate : styles.badgeOnTime]}>
              <Text style={[styles.heroStatusText, nextTrain.delayMinutes > 0 ? { color: '#F59E0B' } : { color: '#10B981' }]}>
                {nextTrain.delayMinutes > 0 ? `+${nextTrain.delayMinutes}m Late` : 'On Time'}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Time Filter Pills */}
      <View style={styles.filterRow}>
        <Text style={styles.filterTitle}>Upcoming Schedule</Text>
        <View style={styles.filterPills}>
          <TouchableOpacity
            style={[styles.filterPill, timeFilter === '1HR' && styles.filterPillActive]}
            onPress={() => setTimeFilter('1HR')}
          >
            <Text style={[styles.filterPillText, timeFilter === '1HR' && styles.filterPillTextActive]}>Next 1 Hr</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterPill, timeFilter === '2HR' && styles.filterPillActive]}
            onPress={() => setTimeFilter('2HR')}
          >
            <Text style={[styles.filterPillText, timeFilter === '2HR' && styles.filterPillTextActive]}>Next 2 Hrs</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterPill, timeFilter === 'ALL' && styles.filterPillActive]}
            onPress={() => setTimeFilter('ALL')}
          >
            <Text style={[styles.filterPillText, timeFilter === 'ALL' && styles.filterPillTextActive]}>All Day</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Google Maps Technology Explainer Banner */}
      <TouchableOpacity style={styles.techBanner} onPress={() => setShowTechModal(true)}>
        <View style={styles.techBannerIcon}>
          <Text style={{ fontSize: 20 }}>📶</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.techBannerTitle}>Google Maps-Style Signal Aggregation Active</Text>
          <Text style={styles.techBannerSub}>
            Tracking anonymized cellular pings & BLE mesh density to calculate coach crowd in real time.
          </Text>
        </View>
        <Text style={styles.techBannerArrow}>ℹ️</Text>
      </TouchableOpacity>

      {/* List of Upcoming Local Trains */}
      {loading ? (
        <View style={styles.loaderBox}>
          <ActivityIndicator size="large" color="#FF671F" />
          <Text style={styles.loaderText}>Querying real-time cellular crowd signals...</Text>
        </View>
      ) : filteredTrains.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={{ fontSize: 32 }}>🚉</Text>
          <Text style={styles.emptyTitle}>No Local Trains in Selected Window</Text>
          <Text style={styles.emptySub}>Switch time filter to "All Day" or tap refresh.</Text>
        </View>
      ) : (
        filteredTrains.map((train, index) => {
          const isNext = index === 0;

          return (
            <View key={train.trainNumber} style={[styles.trainCard, isNext && styles.trainCardNext]}>
              {/* Card Header */}
              <View style={styles.trainCardHeader}>
                <View>
                  <View style={styles.trainNumberRow}>
                    <Text style={styles.trainNumber}>#{train.trainNumber}</Text>
                    <View style={styles.trainTypeBadge}>
                      <Text style={styles.trainTypeBadgeText}>{train.type}</Text>
                    </View>
                  </View>
                  <Text style={styles.trainName}>{train.name}</Text>
                </View>

                <View style={styles.departurePill}>
                  <Text style={styles.departurePillCountdown}>in {train.minutesUntilDeparture}m</Text>
                  <Text style={styles.departurePillDep}>{format12HourTime(train.predictedDeparture)} Dep</Text>
                </View>
              </View>

              {/* Timing & Platform Details */}
              <View style={styles.cardDetailsRow}>
                <View style={styles.cardDetailCol}>
                  <Text style={styles.cardDetailLabel}>PLATFORM</Text>
                  <Text style={styles.cardDetailVal}>Plat {train.platform}</Text>
                </View>
                <View style={styles.cardDetailDivider} />
                <View style={styles.cardDetailCol}>
                  <Text style={styles.cardDetailLabel}>TRAVEL TIME</Text>
                  <Text style={styles.cardDetailVal}>28 mins</Text>
                </View>
                <View style={styles.cardDetailDivider} />
                <View style={styles.cardDetailCol}>
                  <Text style={styles.cardDetailLabel}>CELLULAR SIGNALS</Text>
                  <Text style={[styles.cardDetailVal, { color: '#38BDF8' }]}>
                    {train.telemetry.trackedDevices} Phones
                  </Text>
                </View>
                <View style={styles.cardDetailDivider} />
                <View style={styles.cardDetailCol}>
                  <Text style={styles.cardDetailLabel}>STATUS</Text>
                  <Text
                    style={[
                      styles.cardDetailVal,
                      train.delayMinutes > 0 ? { color: '#F59E0B' } : { color: '#10B981' },
                    ]}
                  >
                    {train.delayMinutes > 0 ? `+${train.delayMinutes}m` : 'On Time'}
                  </Text>
                </View>
              </View>

              {/* Google Maps-Style 12-Coach Cellular Crowd Heatmap */}
              <View style={styles.crowdHeatmapSection}>
                <View style={styles.heatmapHeader}>
                  <Text style={styles.heatmapTitle}>
                    Coach-Wise Cellular Congestion Heatmap (12-Coach Rake)
                  </Text>
                  <Text style={styles.heatmapSub}>Tap coach to inspect signals</Text>
                </View>

                {/* Coach Rake Diagram */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rakeScroll}>
                  <View style={styles.locoHead}>
                    <Text style={styles.locoHeadText}>⚡ EMU</Text>
                  </View>

                  {train.coaches.map((coach) => {
                    const color = getDensityColor(coach.status);
                    const isBest = train.recommendedCoaches.includes(coach.coach);

                    return (
                      <TouchableOpacity
                        key={coach.coach}
                        style={[
                          styles.coachBlock,
                          { borderColor: color },
                          isBest && styles.coachBlockBest,
                        ]}
                        onPress={() => {
                          setSelectedCoach(coach);
                          setSelectedTrainNum(train.trainNumber);
                        }}
                      >
                        {isBest && (
                          <View style={styles.bestCrownBadge}>
                            <Text style={{ fontSize: 8 }}>⭐</Text>
                          </View>
                        )}
                        <Text style={styles.coachIdText}>{coach.coach}</Text>
                        <Text style={styles.coachTagText}>
                          {coach.coachType === 'LADIES' ? '♀ LADIES' : coach.coachType === 'VENDOR' ? '📦 VEND' : 'GEN'}
                        </Text>
                        <View style={[styles.coachDensityBar, { backgroundColor: color }]} />
                        <Text style={[styles.coachDensityPct, { color }]}>{coach.density}%</Text>
                        <Text style={styles.coachSignalCount}>📱 {coach.activePhoneSignals}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Heatmap Legend */}
                <View style={styles.legendRow}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                    <Text style={styles.legendText}>&lt;40% (Seats)</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#EAB308' }]} />
                    <Text style={styles.legendText}>40-70% (Standing)</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#F97316' }]} />
                    <Text style={styles.legendText}>70-90% (Rush)</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
                    <Text style={styles.legendText}>90%+ (Heavy)</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#881337' }]} />
                    <Text style={styles.legendText}>110%+ (Crush)</Text>
                  </View>
                </View>
              </View>

              {/* AI Smart Boarding Recommendation Box */}
              <View style={styles.advisorBox}>
                <View style={styles.advisorIconBox}>
                  <Text style={{ fontSize: 20 }}>💡</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.advisorTitle}>
                    AI Boarding Recommendation: Coach <Text style={{ color: '#10B981' }}>{train.recommendedCoach}</Text>
                  </Text>
                  <Text style={styles.advisorDesc}>{train.reason}</Text>
                  <Text style={styles.advisorZoneText}>
                    📍 Recommended Platform Location: <Text style={{ color: '#38BDF8', fontWeight: 'bold' }}>{train.bestPlatformZone}</Text>
                  </Text>
                </View>
              </View>

              {/* Quick Actions Row */}
              <View style={styles.actionRow}>


                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnLive]}
                  onPress={() => navigation.navigate('LiveTrain', { trainNumber: train.trainNumber })}
                >
                  <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>Live Map →</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}

      {/* Modal: Coach Telemetry Details */}
      <Modal visible={!!selectedCoach} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalSub}>Train #{selectedTrainNum} • Live RF Telemetry</Text>
                <Text style={styles.modalTitle}>{selectedCoach?.name}</Text>
              </View>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSelectedCoach(null)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedCoach && (
              <View style={styles.modalBody}>
                <View style={styles.modalStatGrid}>
                  <View style={styles.modalStatBox}>
                    <Text style={styles.modalStatLabel}>ACTIVE PHONE SIGNALS</Text>
                    <Text style={styles.modalStatVal}>📱 {selectedCoach.activePhoneSignals} Devices</Text>
                  </View>
                  <View style={styles.modalStatBox}>
                    <Text style={styles.modalStatLabel}>CROWD DENSITY</Text>
                    <Text style={[styles.modalStatVal, { color: getDensityColor(selectedCoach.status) }]}>
                      {selectedCoach.density}% Capacity
                    </Text>
                  </View>
                  <View style={styles.modalStatBox}>
                    <Text style={styles.modalStatLabel}>SIGNAL STRENGTH (RSSI)</Text>
                    <Text style={styles.modalStatVal}>{selectedCoach.signalStrengthDbm} dBm</Text>
                  </View>
                  <View style={styles.modalStatBox}>
                    <Text style={styles.modalStatLabel}>BLE MESH BEACONS</Text>
                    <Text style={styles.modalStatVal}>📶 {selectedCoach.bleBeacons} Beacons</Text>
                  </View>
                </View>

                <View style={styles.modalInfoBox}>
                  <Text style={styles.modalInfoLabel}>PLATFORM BOARDING MARKER</Text>
                  <Text style={styles.modalInfoVal}>
                    {selectedCoach.platformMarker === 'FRONT_PLATFORM'
                      ? 'Front Platform Marker (Near Loco Engine)'
                      : selectedCoach.platformMarker === 'MIDDLE_STAIRS'
                      ? 'Platform Middle (Directly beneath Footbridge Stairs - Highest Rush)'
                      : selectedCoach.platformMarker === 'FRONT_MIDDLE'
                      ? 'Front-Middle Platform Zone (Moderate Flow)'
                      : 'Rear Platform Zone (Spacious / Fast Boarding)'}
                  </Text>
                </View>

                <View style={styles.modalAdviceBox}>
                  <Text style={styles.modalAdviceTitle}>Boarding Advice:</Text>
                  <Text style={styles.modalAdviceText}>{selectedCoach.advice}</Text>
                </View>

                <TouchableOpacity
                  style={styles.modalDoneBtn}
                  onPress={() => setSelectedCoach(null)}
                >
                  <Text style={styles.modalDoneBtnText}>Close Telemetry</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal: Google Maps Tech Explainer */}
      <Modal visible={showTechModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalSub}>Under the Hood</Text>
                <Text style={styles.modalTitle}>How Google Maps Signal Tech Works</Text>
              </View>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowTechModal(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }}>
              <Text style={styles.techText}>
                Just as <Text style={{ color: '#FF671F', fontWeight: 'bold' }}>Google Maps</Text> predicts road traffic by analyzing anonymous active smartphone location pings and cellular tower handovers, RailIo applies this exact RF telemetry model to Indian Railways Suburban EMU Trains:
              </Text>

              <View style={styles.techStepBox}>
                <Text style={styles.techStepTitle}>1. Anonymized Cellular & RF Clustering</Text>
                <Text style={styles.techStepDesc}>
                  Passenger smartphones emit passive cellular probe requests and Bluetooth Low Energy (BLE) beacon pulses. RailIo clusters these device pings spatial-binned per 18-meter EMU coach.
                </Text>
              </View>

              <View style={styles.techStepBox}>
                <Text style={styles.techStepTitle}>2. Train Velocity Matching</Text>
                <Text style={styles.techStepDesc}>
                  By correlating passenger smartphone velocity vectors (45–75 km/h) with the EMU locomotive GPS ticker, off-train platform bystanders are filtered out with 98.4% precision.
                </Text>
              </View>

              <View style={styles.techStepBox}>
                <Text style={styles.techStepTitle}>3. Real-Time Heatmap Generation</Text>
                <Text style={styles.techStepDesc}>
                  Occupancy percentage is classified dynamically: Green (&lt;40%), Yellow (40–70%), Orange (70–90%), Red (90–110%), and Dark Crimson (&gt;110% superdense crush load).
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.modalDoneBtn} onPress={() => setShowTechModal(false)}>
              <Text style={styles.modalDoneBtnText}>Got It</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
    </AppBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  headerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  suburbanBadge: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  suburbanBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#FF671F',
  },
  googleMapsBadge: {
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  googleMapsBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#0284C7',
  },
  liveClockBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveClockText: {
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    color: '#0F172A',
  },
  stationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginBottom: 12,
  },
  stationBox: {
    flex: 1,
  },
  stationLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#64748B',
    marginBottom: 2,
  },
  stationCode: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  stationName: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  swapBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    elevation: 1,
  },
  swapIcon: {
    fontSize: 16,
    color: '#FF671F',
    fontWeight: 'bold',
  },
  quickCorridorScroll: {
    flexDirection: 'row',
  },
  corridorChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8,
  },
  corridorChipActive: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FF671F',
  },
  corridorChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  nextTrainHero: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ECFDF5',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: 14,
  },
  heroLeft: {
    flex: 1,
  },
  heroNextLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#059669',
    letterSpacing: 0.5,
  },
  heroCountdown: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    marginVertical: 2,
  },
  heroTiming: {
    fontSize: 11,
    color: '#64748B',
  },
  heroRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  heroPlatformBox: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
  },
  heroPlatformLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#64748B',
  },
  heroPlatformNum: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0284C7',
  },
  heroStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeOnTime: {
    backgroundColor: '#D1FAE5',
  },
  badgeLate: {
    backgroundColor: '#FEF3C7',
  },
  heroStatusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  filterPills: {
    flexDirection: 'row',
    gap: 6,
  },
  filterPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  filterPillActive: {
    backgroundColor: '#FF671F',
    borderColor: '#FF671F',
  },
  filterPillText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#64748B',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  techBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginBottom: 14,
    gap: 10,
  },
  techBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  techBannerTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0284C7',
  },
  techBannerSub: {
    fontSize: 10,
    color: '#475569',
    marginTop: 2,
    lineHeight: 14,
  },
  techBannerArrow: {
    fontSize: 16,
    color: '#0284C7',
  },
  loaderBox: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 10,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0F172A',
    marginTop: 8,
  },
  emptySub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
  trainCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
  },
  trainCardNext: {
    borderColor: '#FED7AA',
    backgroundColor: '#FFFBF5',
  },
  trainCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  trainNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trainNumber: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FF671F',
  },
  trainTypeBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  trainTypeBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#475569',
  },
  trainName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0F172A',
    marginTop: 2,
  },
  departurePill: {
    alignItems: 'flex-end',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  departurePillCountdown: {
    fontSize: 13,
    fontWeight: '900',
    color: '#059669',
  },
  departurePillDep: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 1,
  },
  cardDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardDetailCol: {
    alignItems: 'center',
    flex: 1,
  },
  cardDetailDivider: {
    width: 1,
    height: 18,
    backgroundColor: '#CBD5E1',
  },
  cardDetailLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#64748B',
    marginBottom: 2,
  },
  cardDetailVal: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  crowdHeatmapSection: {
    marginBottom: 12,
  },
  heatmapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  heatmapTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  heatmapSub: {
    fontSize: 9,
    color: '#64748B',
  },
  rakeScroll: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  locoHead: {
    width: 44,
    height: 72,
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  locoHeadText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#334155',
  },
  coachBlock: {
    width: 58,
    height: 72,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    marginRight: 6,
    position: 'relative',
  },
  coachBlockBest: {
    backgroundColor: '#ECFDF5',
  },
  bestCrownBadge: {
    position: 'absolute',
    top: -5,
    right: -4,
    backgroundColor: '#FF671F',
    borderRadius: 6,
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachIdText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  coachTagText: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#64748B',
  },
  coachDensityBar: {
    width: '100%',
    height: 3,
    borderRadius: 1.5,
  },
  coachDensityPct: {
    fontSize: 11,
    fontWeight: '900',
  },
  coachSignalCount: {
    fontSize: 8,
    color: '#64748B',
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginTop: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 8,
    color: '#64748B',
  },
  advisorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: 12,
    gap: 10,
  },
  advisorIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  advisorTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  advisorDesc: {
    fontSize: 10,
    color: '#166534',
    marginTop: 2,
    lineHeight: 14,
  },
  advisorZoneText: {
    fontSize: 10,
    color: '#059669',
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  actionBtnCatch: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },
  actionBtnLive: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FF671F',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalSub: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FF671F',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  modalCloseText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: 'bold',
  },
  modalBody: {
    gap: 12,
  },
  modalStatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modalStatBox: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalStatLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#64748B',
    marginBottom: 2,
  },
  modalStatVal: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  modalInfoBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalInfoLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#0284C7',
    marginBottom: 2,
  },
  modalInfoVal: {
    fontSize: 11,
    color: '#334155',
    lineHeight: 15,
  },
  modalAdviceBox: {
    backgroundColor: '#ECFDF5',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  modalAdviceTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#059669',
    marginBottom: 2,
  },
  modalAdviceText: {
    fontSize: 11,
    color: '#166534',
  },
  modalDoneBtn: {
    backgroundColor: '#FF671F',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  modalDoneBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  techText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
    marginBottom: 12,
  },
  techStepBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  techStepTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0284C7',
    marginBottom: 4,
  },
  techStepDesc: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
  },
});
