import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { getStationArrivalsApi } from '../services/api';

export const StationArrivalBoardScreen: React.FC = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'StationArrivalBoard'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { stationCode: initialCode = 'HWH' } = route.params || {};

  const [selectedStation, setSelectedStation] = useState<string>(initialCode);
  const [stationData, setStationData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const stations = [
    { code: 'HWH', name: 'Howrah' },
    { code: 'NDLS', name: 'New Delhi' },
    { code: 'MMCT', name: 'Mumbai Central' },
    { code: 'MAS', name: 'Chennai' },
    { code: 'BBS', name: 'Bhubaneswar' },
  ];

  useEffect(() => {
    loadArrivals();
  }, [selectedStation]);

  const loadArrivals = async () => {
    setLoading(true);
    try {
      const data = await getStationArrivalsApi(selectedStation);
      setStationData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Station Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
        {stations.map((s) => (
          <TouchableOpacity
            key={s.code}
            style={[styles.stationTab, selectedStation === s.code && styles.stationTabActive]}
            onPress={() => setSelectedStation(s.code)}
          >
            <Text style={[styles.stationTabText, selectedStation === s.code && styles.stationTabTextActive]}>
              {s.name} ({s.code})
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Board Header Card */}
      <View style={styles.boardHeader}>
        <View>
          <Text style={styles.stationTitle}>
            {stationData?.station?.name || `${selectedStation} Station`}
          </Text>
          <Text style={styles.platformsInfo}>
            {stationData?.station?.platforms || 23} Operational Platforms • Live Electronic Display
          </Text>
        </View>
        <View style={styles.liveBadge}>
          <View style={styles.pulseDot} />
          <Text style={styles.liveBadgeText}>LIVE BOARD</Text>
        </View>
      </View>

      {/* Arrivals Table */}
      {loading ? (
        <ActivityIndicator size="large" color="#FF671F" style={{ marginTop: 40 }} />
      ) : (
        <View style={styles.tableCard}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { flex: 1.5 }]}>TRAIN</Text>
            <Text style={[styles.th, { flex: 1 }]}>SCHED</Text>
            <Text style={[styles.th, { flex: 1 }]}>ETA</Text>
            <Text style={[styles.th, { flex: 0.8 }]}>PF</Text>
            <Text style={[styles.th, { flex: 1.2, textAlign: 'right' }]}>STATUS</Text>
          </View>

          {stationData?.arrivals?.map((arr: any, i: number) => {
            const isDelayed = arr.delayMinutes > 0;
            return (
              <TouchableOpacity
                key={i}
                style={styles.tableRow}
                onPress={() => navigation.navigate('TrainDetails', { trainNumber: arr.trainNumber })}
              >
                <View style={{ flex: 1.5 }}>
                  <Text style={styles.trainNumberText}>{arr.trainNumber}</Text>
                  <Text style={styles.trainNameText} numberOfLines={1}>
                    {arr.trainName}
                  </Text>
                </View>

                <Text style={[styles.td, { flex: 1 }]}>{arr.scheduledArrival}</Text>
                <Text style={[styles.td, styles.etaText, { flex: 1 }]}>{arr.predictedArrival}</Text>

                <View style={{ flex: 0.8, alignItems: 'center' }}>
                  <View style={styles.pfBadge}>
                    <Text style={styles.pfText}>{arr.platform}</Text>
                  </View>
                </View>

                <View style={{ flex: 1.2, alignItems: 'flex-end' }}>
                  <View
                    style={[
                      styles.statusPill,
                      isDelayed ? styles.statusPillLate : styles.statusPillOnTime,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        isDelayed ? { color: '#F59E0B' } : { color: '#10B981' },
                      ]}
                    >
                      {arr.status}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#07162C',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  tabsScroll: {
    marginBottom: 14,
  },
  stationTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#0B2545',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#1E4273',
  },
  stationTabActive: {
    backgroundColor: '#FF671F',
    borderColor: '#FF671F',
  },
  stationTabText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#94A3B8',
  },
  stationTabTextActive: {
    color: '#FFFFFF',
  },
  boardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(19, 47, 86, 0.8)',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 14,
  },
  stationTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  platformsInfo: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    gap: 4,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#10B981',
  },
  tableCard: {
    backgroundColor: 'rgba(19, 47, 86, 0.7)',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1E4273',
    paddingBottom: 10,
    marginBottom: 8,
  },
  th: {
    fontSize: 9.5,
    fontWeight: 'bold',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  trainNumberText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  trainNameText: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 1,
  },
  td: {
    fontSize: 11,
    color: '#CBD5E1',
    fontWeight: '600',
  },
  etaText: {
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  pfBadge: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: '#07162C',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1E4273',
  },
  pfText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FF671F',
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusPillOnTime: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  statusPillLate: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  statusPillText: {
    fontSize: 9.5,
    fontWeight: 'bold',
  },
});
