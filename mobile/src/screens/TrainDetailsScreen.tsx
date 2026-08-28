import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Train } from '../types';
import { getTrainByNumberApi } from '../services/api';

export const TrainDetailsScreen: React.FC = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'TrainDetails'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { trainNumber = '12301' } = route.params || {};

  const [train, setTrain] = useState<Train | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadTrain();
  }, [trainNumber]);

  const loadTrain = async () => {
    setLoading(true);
    try {
      const data = await getTrainByNumberApi(trainNumber);
      setTrain(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !train) {
    return (
      <View style={styles.loaderCenter}>
        <ActivityIndicator size="large" color="#FF671F" />
        <Text style={styles.loadingText}>Loading Train Telemetry...</Text>
      </View>
    );
  }

  const isDelayed = train.liveState.delayMinutes > 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Train Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryTop}>
          <View>
            <View style={styles.badgeRow}>
              <Text style={styles.trainNumBadge}>#{train.trainNumber}</Text>
              <Text style={styles.typeBadge}>{train.type}</Text>
            </View>
            <Text style={styles.trainName}>{train.name}</Text>
          </View>
          <View
            style={[
              styles.delayPill,
              isDelayed ? styles.delayPillLate : styles.delayPillOnTime,
            ]}
          >
            <Text
              style={[
                styles.delayPillText,
                isDelayed ? { color: '#F59E0B' } : { color: '#10B981' },
              ]}
            >
              {isDelayed ? `+${train.liveState.delayMinutes}m Delay` : 'On Time'}
            </Text>
          </View>
        </View>

        {/* Live Gauges Bar */}
        <View style={styles.gaugesRow}>
          <View style={styles.gaugeItem}>
            <Text style={styles.gaugeVal}>{train.liveState.speed} km/h</Text>
            <Text style={styles.gaugeLabel}>Live GPS Speed</Text>
          </View>
          <View style={styles.gaugeDivider} />
          <View style={styles.gaugeItem}>
            <Text style={styles.gaugeVal}>{train.liveState.currentSection}</Text>
            <Text style={styles.gaugeLabel}>Current Section</Text>
          </View>
          <View style={styles.gaugeDivider} />
          <View style={styles.gaugeItem}>
            <Text style={[styles.gaugeVal, { color: '#10B981' }]}>
              {Math.round(train.liveState.confidence * 100)}%
            </Text>
            <Text style={styles.gaugeLabel}>AI Confidence</Text>
          </View>
        </View>
      </View>

      {/* Explainable AI (WHY is this train delayed?) Section */}
      <View style={styles.xaiCard}>
        <View style={styles.xaiHeader}>
          <Text style={{ fontSize: 18 }}>🧠</Text>
          <Text style={styles.xaiTitle}>Explainable AI: Delay Attribution (XAI)</Text>
        </View>

        <Text style={styles.xaiSub}>
          Real-time machine learning feature importance explaining the current delay factors:
        </Text>

        <View style={styles.xaiFactorsList}>
          {train.liveState.delayReasons.length > 0 ? (
            train.liveState.delayReasons.map((r, i) => (
              <View key={i} style={styles.xaiFactorItem}>
                <Text style={styles.xaiFactorName}>• {r.factor}</Text>
                <Text style={styles.xaiFactorImpact}>+{r.impactMin} min</Text>
              </View>
            ))
          ) : (
            <View style={styles.xaiFactorItem}>
              <Text style={styles.xaiFactorName}>• Green corridor automatic signal clearance</Text>
              <Text style={[styles.xaiFactorImpact, { color: '#10B981' }]}>0 min</Text>
            </View>
          )}

          <View style={styles.xaiTotalRow}>
            <Text style={styles.xaiTotalLabel}>Total Expected Delay:</Text>
            <Text style={styles.xaiTotalVal}>
              +{train.liveState.predictedDelay} min ({train.liveState.confidence * 100}% confidence)
            </Text>
          </View>
        </View>
      </View>

      {/* Action Buttons Row */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnCatch]}
          onPress={() => navigation.navigate('CanICatch', { trainNumber: train.trainNumber })}
        >
          <Text style={styles.actionBtnText}>🎯 Can I Catch My Train?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnLive]}
          onPress={() => navigation.navigate('LiveTrain', { trainNumber: train.trainNumber })}
        >
          <Text style={styles.actionBtnText}>🗺️ Live Map Tracking</Text>
        </TouchableOpacity>
      </View>

      {/* Station Stoppages Timeline */}
      <View style={styles.timelineSection}>
        <Text style={styles.timelineSectionTitle}>Route & Stoppage Schedule</Text>

        <View style={styles.timelineContainer}>
          {train.stops.map((stop, idx) => {
            const isLast = idx === train.stops.length - 1;
            const isPassed = idx === 0;

            return (
              <View key={stop.code} style={styles.timelineItem}>
                {/* Time Column */}
                <View style={styles.timelineTimeCol}>
                  <Text style={styles.timelineDepTime}>{stop.dep || stop.arr}</Text>
                  <Text style={styles.timelineKm}>{stop.km} km</Text>
                </View>

                {/* Node Line */}
                <View style={styles.timelineNodeCol}>
                  <View
                    style={[
                      styles.timelineDot,
                      isPassed ? styles.timelineDotPassed : styles.timelineDotFuture,
                    ]}
                  />
                  {!isLast && <View style={styles.timelineLine} />}
                </View>

                {/* Station Info */}
                <View style={styles.timelineInfoCol}>
                  <View style={styles.stationTitleRow}>
                    <Text style={styles.timelineStationCode}>{stop.code}</Text>
                    <View style={styles.platformBadge}>
                      <Text style={styles.platformBadgeText}>Platform {stop.platform}</Text>
                    </View>
                  </View>
                  <Text style={styles.timelineArrDep}>
                    Arr: {stop.arr} • Dep: {stop.dep}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Coach Composition Preview */}
      <View style={styles.coachSection}>
        <View style={styles.coachHeaderRow}>
          <Text style={styles.coachSectionTitle}>Coach Composition</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('CoachCrowd', { trainNumber: train.trainNumber })}
          >
            <Text style={styles.coachViewCrowdText}>View Coach Crowd →</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.coachScroll}>
          <View style={styles.engineCoach}>
            <Text style={styles.engineText}>LOCO ⚡</Text>
          </View>
          {train.coaches.map((c, i) => (
            <View key={i} style={styles.coachBox}>
              <Text style={styles.coachText}>{c}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
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
  loaderCenter: {
    flex: 1,
    backgroundColor: '#07162C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 12,
    color: '#94A3B8',
  },
  summaryCard: {
    backgroundColor: 'rgba(19, 47, 86, 0.8)',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 14,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  trainNumBadge: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FF671F',
    backgroundColor: 'rgba(255, 103, 31, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadge: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#94A3B8',
  },
  trainName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  delayPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  delayPillOnTime: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  delayPillLate: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  delayPillText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  gaugesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#07162C',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1E4273',
  },
  gaugeItem: {
    alignItems: 'center',
    flex: 1,
  },
  gaugeVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  gaugeLabel: {
    fontSize: 9,
    color: '#94A3B8',
    marginTop: 2,
  },
  gaugeDivider: {
    width: 1,
    height: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  xaiCard: {
    backgroundColor: 'rgba(11, 37, 69, 0.9)',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 103, 31, 0.3)',
    marginBottom: 14,
  },
  xaiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  xaiTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FF671F',
  },
  xaiSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 10,
  },
  xaiFactorsList: {
    backgroundColor: '#07162C',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1E4273',
  },
  xaiFactorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  xaiFactorName: {
    fontSize: 11,
    color: '#CBD5E1',
  },
  xaiFactorImpact: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#F59E0B',
    fontFamily: 'monospace',
  },
  xaiTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  xaiTotalLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  xaiTotalVal: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FF671F',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionBtnCatch: {
    backgroundColor: '#FF671F',
  },
  actionBtnLive: {
    backgroundColor: '#0B2545',
    borderWidth: 1,
    borderColor: '#1E4273',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  timelineSection: {
    backgroundColor: 'rgba(19, 47, 86, 0.7)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
  },
  timelineSectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 14,
  },
  timelineContainer: {
    paddingLeft: 4,
  },
  timelineItem: {
    flexDirection: 'row',
    minHeight: 56,
  },
  timelineTimeCol: {
    width: 60,
  },
  timelineDepTime: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  timelineKm: {
    fontSize: 9,
    color: '#64748B',
  },
  timelineNodeCol: {
    alignItems: 'center',
    width: 24,
    marginRight: 8,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  timelineDotPassed: {
    backgroundColor: '#10B981',
  },
  timelineDotFuture: {
    backgroundColor: '#64748B',
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#1E4273',
    marginVertical: 2,
  },
  timelineInfoCol: {
    flex: 1,
    paddingBottom: 16,
  },
  stationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timelineStationCode: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  platformBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  platformBadgeText: {
    fontSize: 9,
    color: '#94A3B8',
    fontWeight: 'bold',
  },
  timelineArrDep: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  coachSection: {
    backgroundColor: 'rgba(19, 47, 86, 0.7)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  coachHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  coachSectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  coachViewCrowdText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FF671F',
  },
  coachScroll: {
    flexDirection: 'row',
  },
  engineCoach: {
    backgroundColor: '#FF671F',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  engineText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  coachBox: {
    backgroundColor: '#07162C',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#1E4273',
    minWidth: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: 'bold',
  },
});
