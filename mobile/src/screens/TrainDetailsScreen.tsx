import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Train } from '../types';
import { getTrainByNumberApi } from '../services/api';
import { colors } from '../theme/colors';

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
          <Text style={[styles.actionBtnText, { color: colors.white }]}>🎯 Can I Catch My Train?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnLive]}
          onPress={() => navigation.navigate('LiveTrain', { trainNumber: train.trainNumber })}
        >
          <Text style={[styles.actionBtnText, { color: colors.primary }]}>🗺️ Live Map Tracking</Text>
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
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  loaderCenter: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 12,
    color: colors.textMuted,
  },
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
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
    color: colors.primary,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadge: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.textMuted,
  },
  trainName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  delayPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  delayPillOnTime: {
    backgroundColor: colors.greenLight,
    borderColor: colors.green,
  },
  delayPillLate: {
    backgroundColor: colors.warningLight,
    borderColor: colors.warning,
  },
  delayPillText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  gaugesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  gaugeItem: {
    alignItems: 'center',
    flex: 1,
  },
  gaugeVal: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  gaugeLabel: {
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 2,
  },
  gaugeDivider: {
    width: 1,
    height: 22,
    backgroundColor: colors.border,
  },
  xaiCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
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
    color: colors.primary,
  },
  xaiSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 10,
  },
  xaiFactorsList: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  xaiFactorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  xaiFactorName: {
    fontSize: 11,
    color: colors.textMuted,
  },
  xaiFactorImpact: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.warningDark,
    fontFamily: 'monospace',
  },
  xaiTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  xaiTotalLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.text,
  },
  xaiTotalVal: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.primary,
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
    backgroundColor: colors.primary,
  },
  actionBtnLive: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  actionBtnText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: 'bold',
  },
  timelineSection: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  timelineSectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
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
    color: colors.text,
  },
  timelineKm: {
    fontSize: 9,
    color: colors.textLight,
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
    backgroundColor: colors.greenDark,
  },
  timelineDotFuture: {
    backgroundColor: colors.textLight,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: colors.border,
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
    color: colors.text,
  },
  platformBadge: {
    backgroundColor: colors.background,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  platformBadgeText: {
    fontSize: 9,
    color: colors.textMuted,
    fontWeight: 'bold',
  },
  timelineArrDep: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  coachSection: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
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
    color: colors.text,
  },
  coachViewCrowdText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.primary,
  },
  coachScroll: {
    flexDirection: 'row',
  },
  engineCoach: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  engineText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  coachBox: {
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 6,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: 'bold',
  },
});
