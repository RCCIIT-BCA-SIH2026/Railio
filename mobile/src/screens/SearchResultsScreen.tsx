import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Train } from '../types';
import { searchTrainsApi } from '../services/api';
import { colors } from '../theme/colors';

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
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.primaryDark,
  },
  routeText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.white,
  },
  dateSubtext: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  modifyBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  modifyBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.white,
  },
  listContent: {
    padding: 16,
    paddingBottom: 30,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  cardVB: {
    borderColor: colors.primaryLight,
    backgroundColor: colors.card,
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
    color: colors.text,
  },
  typeBadge: {
    backgroundColor: colors.background,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeBadgeVB: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.textMuted,
  },
  trainName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    marginTop: 2,
  },
  confidenceBadge: {
    backgroundColor: colors.greenLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.green,
  },
  confidenceText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.greenDark,
  },
  timingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    marginVertical: 10,
  },
  timingCol: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 8.5,
    fontWeight: 'bold',
    color: colors.textMuted,
  },
  timeVal: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    marginTop: 2,
  },
  stationLabel: {
    fontSize: 10,
    color: colors.textLight,
    fontWeight: '600',
  },
  durationCol: {
    alignItems: 'center',
    flex: 1,
  },
  durationText: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.textMuted,
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
    backgroundColor: colors.primary,
  },
  durationBar: {
    flex: 1,
    height: 1.5,
    backgroundColor: colors.border,
  },
  distanceText: {
    fontSize: 9,
    color: colors.textLight,
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
    color: colors.textMuted,
  },
  predictedVal: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.text,
  },
  delayStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  delayStatusOnTime: {
    backgroundColor: colors.greenLight,
    borderColor: colors.green,
  },
  delayStatusLate: {
    backgroundColor: colors.warningLight,
    borderColor: colors.warning,
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
    backgroundColor: colors.background,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardActionBtnPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  cardActionBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.text,
  },
  loaderCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 12,
    color: colors.textMuted,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  emptySub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
});
