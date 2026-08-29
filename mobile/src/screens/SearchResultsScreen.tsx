import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Train } from '../types';
import { searchTrainsApi } from '../services/api';
import { AppBackground } from '../components/AppBackground';

export const SearchResultsScreen: React.FC = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'SearchResults'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { from = 'HWH', to = 'NDLS', date = 'Today' } = route.params || {};

  const [trains, setTrains] = useState<Train[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadResults();
  }, [from, to]);

  const loadResults = async () => {
    setLoading(true);
    try {
      const list = await searchTrainsApi(from, to);
      setTrains(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const renderTrainCard = ({ item }: { item: Train }) => {
    const isVandeBharat = item.type.includes('Vande Bharat');
    const isDelayed = item.liveState.delayMinutes > 5;

    return (
      <TouchableOpacity
        style={[styles.card, isVandeBharat && styles.cardVB]}
        onPress={() => navigation.navigate('TrainDetails', { trainNumber: item.trainNumber })}
      >
        <View style={styles.cardHeader}>
          <View>
            <View style={styles.trainNumberRow}>
              <Text style={styles.trainNumber}>{item.trainNumber}</Text>
              <View style={[styles.typeBadge, isVandeBharat && styles.typeBadgeVB]}>
                <Text style={[styles.typeBadgeText, isVandeBharat && { color: '#FF671F' }]}>
                  {item.type}
                </Text>
              </View>
            </View>
            <Text style={styles.trainName}>{item.name}</Text>
          </View>

          <View style={styles.confidenceBadge}>
            <Text style={styles.confidenceText}>
              {Math.round(item.liveState.confidence * 100)}% AI Conf.
            </Text>
          </View>
        </View>

        {/* Departure & Arrival Timing Row */}
        <View style={styles.timingRow}>
          <View style={styles.timingCol}>
            <Text style={styles.timeLabel}>DEPARTURE</Text>
            <Text style={styles.timeVal}>{item.departureTime}</Text>
            <Text style={styles.stationLabel}>{item.source}</Text>
          </View>

          <View style={styles.durationCol}>
            <Text style={styles.durationText}>{item.avgSpeed} km/h avg</Text>
            <View style={styles.durationLine}>
              <View style={styles.durationDot} />
              <View style={styles.durationBar} />
              <View style={styles.durationDot} />
            </View>
            <Text style={styles.distanceText}>{item.totalDistanceKm} km</Text>
          </View>

          <View style={[styles.timingCol, { alignItems: 'flex-end' }]}>
            <Text style={styles.timeLabel}>ARRIVAL</Text>
            <Text style={styles.timeVal}>{item.arrivalTime}</Text>
            <Text style={styles.stationLabel}>{item.destination}</Text>
          </View>
        </View>

        {/* Live AI Status & Predicted Arrival */}
        <View style={styles.statusFooter}>
          <View style={styles.predictedBox}>
            <Text style={styles.predictedLabel}>Predicted Arrival:</Text>
            <Text style={styles.predictedVal}>
              {item.arrivalTime} ({isDelayed ? `+${item.liveState.delayMinutes}m delay` : 'On Time'})
            </Text>
          </View>

          <View
            style={[
              styles.delayStatusBadge,
              isDelayed ? styles.delayStatusLate : styles.delayStatusOnTime,
            ]}
          >
            <Text
              style={[
                styles.delayStatusText,
                isDelayed ? { color: '#F59E0B' } : { color: '#10B981' },
              ]}
            >
              {isDelayed ? `+${item.liveState.delayMinutes} min` : 'On Time'}
            </Text>
          </View>
        </View>

        {/* Hero Quick CTA */}
        <View style={styles.cardActionsRow}>
          <TouchableOpacity
            style={styles.cardActionBtn}
            onPress={() => navigation.navigate('CanICatch', { trainNumber: item.trainNumber })}
          >
            <Text style={styles.cardActionBtnText}>🎯 Can I Catch?</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cardActionBtn, styles.cardActionBtnPrimary]}
            onPress={() => navigation.navigate('LiveTrain', { trainNumber: item.trainNumber })}
          >
            <Text style={[styles.cardActionBtnText, { color: '#FFFFFF' }]}>Live Map →</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <AppBackground variant="blue">
      <View style={styles.container}>
        {/* Route Subheader */}
        <View style={styles.routeHeader}>
          <View>
            <Text style={styles.routeText}>{from} → {to}</Text>
            <Text style={styles.dateSubtext}>{date} • {trains.length} Trains Available</Text>
          </View>
          <TouchableOpacity style={styles.modifyBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.modifyBtnText}>Modify</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loaderCenter}>
            <ActivityIndicator size="large" color="#FF671F" />
            <Text style={styles.loadingText}>Fetching AI Predicted Schedules...</Text>
          </View>
        ) : (
          <FlatList
            data={trains}
            renderItem={renderTrainCard}
            keyExtractor={(item) => item.trainNumber}
            contentContainerStyle={styles.listContent}
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
    borderColor: '#FF671F',
  },
  cardActionBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#334155',
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
