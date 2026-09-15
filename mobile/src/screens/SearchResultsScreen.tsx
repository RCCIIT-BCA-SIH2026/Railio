import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Train } from '../types';
import { searchTrainsApi } from '../services/api';
import { AppBackground } from '../components/AppBackground';

import { Info } from 'lucide-react-native';

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

export const SearchResultsScreen: React.FC = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'SearchResults'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { from = 'SDAH', to = 'DKAE', date = 'Today' } = route.params || {};

  const [trains, setTrains] = useState<Train[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const flatListRef = React.useRef<FlatList<Train>>(null);

  useEffect(() => {
    loadResults();
  }, [from, to]);

  const parseTimeToMinutes = (timeStr?: string): number => {
    if (!timeStr || !timeStr.includes(':')) return 0;
    const parts = timeStr.split(':').map(Number);
    return (parts[0] || 0) * 60 + (parts[1] || 0);
  };

  const sortChronologically = (list: Train[]): Train[] => {
    return [...list].sort((a, b) => {
      const depA = parseTimeToMinutes(a.departureTime);
      const depB = parseTimeToMinutes(b.departureTime);
      return depA - depB;
    });
  };

  const loadResults = async () => {
    setLoading(true);
    try {
      const list = await searchTrainsApi(from, to);
      setTrains(sortChronologically(list));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const currentIndex = React.useMemo(() => {
    if (!trains || trains.length === 0) return 0;
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();

    const runningIdx = trains.findIndex((t) => {
      const dep = parseTimeToMinutes(t.departureTime);
      const arr = parseTimeToMinutes(t.arrivalTime);
      if (arr >= dep) {
        return currentMins >= dep - 10 && currentMins <= arr + 15;
      }
      return currentMins >= dep - 10 || currentMins <= arr + 15;
    });

    if (runningIdx !== -1) return runningIdx;

    const upcomingIdx = trains.findIndex((t) => {
      const dep = parseTimeToMinutes(t.departureTime);
      return dep >= currentMins;
    });

    return upcomingIdx !== -1 ? upcomingIdx : 0;
  }, [trains]);

  useEffect(() => {
    if (!loading && trains.length > 0 && currentIndex > 0) {
      const timer = setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: currentIndex,
          animated: true,
        });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [loading, trains, currentIndex]);

  const scrollToCurrentTrain = () => {
    if (currentIndex > 0 && flatListRef.current) {
      flatListRef.current.scrollToIndex({ index: currentIndex, animated: true });
    }
  };

  const getEstimatedArrivalTime = (timeStr: string, delayMin: number) => {
    if (!timeStr || delayMin <= 0) return timeStr;
    const [hh, mm] = timeStr.split(':').map(Number);
    if (isNaN(hh) || isNaN(mm)) return timeStr;
    const totalMin = hh * 60 + mm + delayMin;
    const newH = Math.floor(totalMin / 60) % 24;
    const newM = totalMin % 60;
    return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
  };

  const renderTrainCard = ({ item }: { item: Train }) => {
    const isVandeBharat = item.type.includes('Vande Bharat');
    const delay = item.liveState?.delayMinutes ?? 0;
    const isDelayed = delay > 5;
    const rawArrival = getEstimatedArrivalTime(item.arrivalTime, delay);
    const predictedArrival = format12HourTime(rawArrival);
    const dep12 = format12HourTime(item.departureTime);
    const arr12 = format12HourTime(item.arrivalTime);

    // Calculate train journey run status relative to current IST time
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    let depMins = parseTimeToMinutes(item.departureTime);
    let arrMins = parseTimeToMinutes(item.arrivalTime);
    if (arrMins < depMins) arrMins += 1440; // overnight train

    const effectiveArrMins = arrMins + delay;
    const isCompleted = currentMins > effectiveArrMins + 15;
    const isRunningNow = !isCompleted && currentMins >= depMins - 10 && currentMins <= effectiveArrMins + 15;

    return (
      <View style={[styles.card, isVandeBharat && styles.cardVB, isCompleted && styles.cardCompleted]}>
        <View style={styles.cardHeader}>
          <View>
            <View style={styles.trainNumberRow}>
              <Text style={[styles.trainNumber, isCompleted && { color: '#64748B' }]}>{item.trainNumber}</Text>
              <View style={[styles.typeBadge, isVandeBharat && styles.typeBadgeVB, isCompleted && styles.typeBadgeCompleted]}>
                <Text style={[styles.typeBadgeText, isVandeBharat && { color: '#FF671F' }, isCompleted && { color: '#64748B' }]}>
                  {item.type}
                </Text>
              </View>
            </View>
            <Text style={[styles.trainName, isCompleted && { color: '#64748B' }]}>{item.name}</Text>
          </View>

          {isCompleted ? (
            <View style={styles.completedStatusBadge}>
              <Text style={styles.completedStatusText}>🏁 COMPLETED</Text>
            </View>
          ) : isRunningNow ? (
            <View style={styles.runningStatusBadge}>
              <Text style={styles.runningStatusText}>🟢 RUNNING LIVE</Text>
            </View>
          ) : (
            <View style={styles.confidenceBadge}>
              <Text style={styles.confidenceText}>
                {Math.round((item.liveState?.confidence ?? 0.88) * 100)}% AI Conf.
              </Text>
            </View>
          )}
        </View>

        {/* Departure & Arrival Timing Row */}
        <View style={styles.timingRow}>
          <View style={styles.timingCol}>
            <Text style={styles.timeLabel}>DEPARTURE</Text>
            <Text style={[styles.timeVal, isCompleted && { color: '#64748B' }]}>{dep12}</Text>
            <Text style={styles.stationLabel}>{item.source}</Text>
          </View>

          <View style={styles.durationCol}>
            <Text style={styles.durationText}>{item.avgSpeed} km/h avg</Text>
            <View style={styles.durationLine}>
              <View style={styles.durationDot} />
              <View style={[styles.durationBar, isCompleted && { backgroundColor: '#CBD5E1' }]} />
              <View style={styles.durationDot} />
            </View>
            <Text style={styles.distanceText}>{item.totalDistanceKm} km</Text>
          </View>

          <View style={[styles.timingCol, { alignItems: 'flex-end' }]}>
            <Text style={styles.timeLabel}>ARRIVAL</Text>
            <Text style={[styles.timeVal, isCompleted && { color: '#64748B' }]}>{arr12}</Text>
            <Text style={styles.stationLabel}>{item.destination}</Text>
          </View>
        </View>

        {/* Live AI Status & Predicted Arrival */}
        <View style={styles.statusFooter}>
          <View style={styles.predictedBox}>
            <Text style={styles.predictedLabel}>{isCompleted ? 'Final Arrival:' : 'Predicted Arrival:'}</Text>
            <Text style={styles.predictedVal}>
              {predictedArrival} ({isCompleted ? 'Arrived' : isDelayed ? `+${delay}m delay` : '🟢 On Time'})
            </Text>
          </View>

          <View
            style={[
              styles.delayStatusBadge,
              isCompleted
                ? styles.delayStatusCompleted
                : isDelayed
                ? styles.delayStatusLate
                : styles.delayStatusOnTime,
            ]}
          >
            <Text
              style={[
                styles.delayStatusText,
                isCompleted
                  ? { color: '#64748B' }
                  : isDelayed
                  ? { color: '#F59E0B' }
                  : { color: '#10B981' },
              ]}
            >
              {isCompleted ? 'Passed' : isDelayed ? `+${delay} min` : 'On Time'}
            </Text>
          </View>
        </View>

        {/* Hero Actions: Big Live Map Button + Small Info Button */}
        <View style={styles.cardActionsRow}>
          {isCompleted ? (
            <TouchableOpacity
              style={[styles.cardActionBtn, styles.cardActionBtnDisabled]}
              disabled={true}
              activeOpacity={1}
            >
              <Text style={styles.cardActionBtnDisabledText}>
                🏁 Journey Ended ({arr12})
              </Text>
            </TouchableOpacity>
          ) : isRunningNow ? (
            <TouchableOpacity
              style={[styles.cardActionBtn, styles.cardActionBtnPrimary, styles.cardActionBtnRunning]}
              onPress={() => navigation.navigate('LiveTrain', { trainNumber: item.trainNumber })}
              activeOpacity={0.85}
            >
              <Text style={[styles.cardActionBtnText, { color: '#FFFFFF' }]}>📡 Track Live Map →</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.cardActionBtn, styles.cardActionBtnPrimary]}
              onPress={() => navigation.navigate('LiveTrain', { trainNumber: item.trainNumber })}
              activeOpacity={0.85}
            >
              <Text style={[styles.cardActionBtnText, { color: '#FFFFFF' }]}>Live Map →</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.infoBtn}
            onPress={() => navigation.navigate('TrainDetails', { trainNumber: item.trainNumber })}
            activeOpacity={0.8}
          >
            <Info size={15} color="#0F172A" strokeWidth={2.5} />
            <Text style={styles.infoBtnText}>Info</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <AppBackground variant="blue">
      <View style={styles.container}>
        {/* Route Subheader */}
        <View style={styles.routeHeader}>
          <View>
            <Text style={styles.routeText}>{from} → {to}</Text>
            <Text style={styles.dateSubtext}>{date} • All {trains.length} Daily Trains (04:07 AM - 11:40 PM)</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {currentIndex > 0 && (
              <TouchableOpacity style={styles.jumpBtn} onPress={scrollToCurrentTrain}>
                <Text style={styles.jumpBtnText}>📍 Now Running</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.modifyBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.modifyBtnText}>Modify</Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <View style={styles.loaderCenter}>
            <ActivityIndicator size="large" color="#FF671F" />
            <Text style={styles.loadingText}>Fetching AI Predicted Schedules...</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={trains}
            renderItem={renderTrainCard}
            keyExtractor={(item) => item.trainNumber}
            contentContainerStyle={styles.listContent}
            initialNumToRender={trains.length || 20}
            maxToRenderPerBatch={trains.length || 20}
            windowSize={21}
            getItemLayout={(data, index) => ({
              length: 220,
              offset: 220 * index,
              index,
            })}
            onScrollToIndexFailed={(info) => {
              flatListRef.current?.scrollToOffset({
                offset: 220 * info.index,
                animated: false,
              });
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={{ fontSize: 36, marginBottom: 8 }}>🚆</Text>
                <Text style={styles.emptyTitle}>No direct trains found</Text>
                <Text style={styles.emptySub}>Showing national express trains on corridor.</Text>
              </View>
            }
          />
        )}
      </View>
    </AppBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.90)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  routeText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  dateSubtext: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  jumpBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  jumpBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#059669',
  },
  modifyBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  modifyBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FF671F',
  },
  listContent: {
    padding: 16,
    paddingBottom: 30,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
  },
  cardVB: {
    borderColor: '#FED7AA',
    backgroundColor: '#FFFBF5',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  trainNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trainNumber: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  typeBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeBadgeVB: {
    backgroundColor: '#FFF7ED',
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#64748B',
  },
  trainName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginTop: 2,
  },
  confidenceBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  confidenceText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#059669',
  },
  timingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
    marginVertical: 10,
  },
  timingCol: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 8.5,
    fontWeight: 'bold',
    color: '#64748B',
  },
  timeVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  stationLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  durationCol: {
    alignItems: 'center',
    flex: 1,
  },
  durationText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#64748B',
  },
  durationLine: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '80%',
    marginVertical: 4,
  },
  durationDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FF671F',
  },
  durationBar: {
    flex: 1,
    height: 1.5,
    backgroundColor: '#CBD5E1',
  },
  distanceText: {
    fontSize: 9,
    color: '#64748B',
  },
  statusFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  predictedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  predictedLabel: {
    fontSize: 10,
    color: '#64748B',
  },
  predictedVal: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  delayStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  delayStatusOnTime: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  delayStatusLate: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  delayStatusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  cardActionBtn: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  cardActionBtnPrimary: {
    backgroundColor: '#FF671F',
    borderColor: '#EA580C',
  },
  cardActionBtnRunning: {
    backgroundColor: '#059669',
    borderColor: '#047857',
  },
  cardActionBtnDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    opacity: 0.8,
  },
  cardActionBtnDisabledText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#64748B',
  },
  cardCompleted: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    opacity: 0.9,
  },
  completedStatusBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  completedStatusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#64748B',
  },
  runningStatusBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6EE7B7',
  },
  runningStatusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#047857',
  },
  typeBadgeCompleted: {
    backgroundColor: '#E2E8F0',
  },
  delayStatusCompleted: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  cardActionBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#334155',
  },
  infoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  infoBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  loaderCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 12,
    color: '#64748B',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
});
