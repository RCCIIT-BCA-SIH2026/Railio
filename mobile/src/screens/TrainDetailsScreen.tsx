import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Train } from '../types';
import { getTrainByNumberApi } from '../services/api';
import { AppBackground } from '../components/AppBackground';

export const TrainDetailsScreen: React.FC = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'TrainDetails'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { trainNumber = '32216' } = route.params || {};

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

  // Helper for dynamic 12-Coach Cellular Crowd Heatmap
  const numSeed = parseInt(train.trainNumber.replace(/\D/g, ''), 10) || 32216;
  const baseDensities = [28, 35, 22, 48, 68, 74, 44, 30, 25, 52, 61, 38];
  
  interface CoachHeatmapItem {
    id: string;
    densityPct: number;
    dotColor: string;
    isBest: boolean;
  }
  const coachesList: CoachHeatmapItem[] = [];
  for (let i = 1; i <= 12; i++) {
    const shift = (numSeed + i * 7) % 24 - 12;
    const rawVal = baseDensities[(i - 1) % baseDensities.length] + shift;
    const density = Math.min(94, Math.max(16, rawVal));

    let dotColor = '#10B981'; // Green
    if (density > 70) dotColor = '#EF4444'; // Red
    else if (density > 50) dotColor = '#F97316'; // Orange
    else if (density > 35) dotColor = '#EAB308'; // Yellow

    coachesList.push({
      id: `C${i}`,
      densityPct: density,
      dotColor,
      isBest: false,
    });
  }

  const sortedIndices = coachesList
    .map((c, index) => ({ index, densityPct: c.densityPct }))
    .sort((a, b) => a.densityPct - b.densityPct);

  if (sortedIndices.length >= 2) {
    coachesList[sortedIndices[0].index].isBest = true;
    coachesList[sortedIndices[1].index].isBest = true;
  }

  const bestNamesStr = sortedIndices
    .slice(0, 2)
    .map(x => coachesList[x.index].id)
    .join(' & ');

  return (
    <AppBackground variant="orange">
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
          style={[styles.actionBtn, styles.actionBtnLive]}
          onPress={() => navigation.navigate('LiveTrain', { trainNumber: train.trainNumber })}
        >
          <Text style={styles.actionBtnText}>🗺️ Live Map Tracking</Text>
        </TouchableOpacity>
      </View>

      <View style={{ marginBottom: 14 }}>
         <TouchableOpacity
           style={[styles.actionBtn, { backgroundColor: '#8B5CF6', paddingVertical: 14 }]}
           onPress={() => navigation.navigate('SmartServices', { trainNumber: train.trainNumber })}
         >
           <Text style={[styles.actionBtnText, { color: 'white', fontSize: 14 }]}>⏰ Smart Alarms</Text>
         </TouchableOpacity>
      </View>

      {/* 🌟 Dynamic 12-Coach Crowd Heatmap & Boarding Advice (Right under Smart Alarms) */}
      <View style={styles.suburbanHeroSegment}>
        <View style={styles.suburbanHeroTop}>
          <View style={styles.suburbanHeroBadgeRow}>
            <View style={styles.suburbanLivePill}>
              <View style={styles.suburbanPulseDot} />
              <Text style={styles.suburbanLivePillText}>LIVE PULSE</Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate('CoachCrowd', { trainNumber: train.trainNumber })}
            activeOpacity={0.7}
          >
            <Text style={styles.suburbanHeroArrow}>Full Heatmap →</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.suburbanHeroTitle}>
          {train.name} (#{train.trainNumber})
        </Text>
        <Text style={styles.suburbanHeroSub}>
          Live 12-Coach Crowd Heatmap & Boarding Advice
        </Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 12 }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {coachesList.map((c) => (
              <View
                key={c.id}
                style={[
                  styles.suburbanMiniCoachItem,
                  c.isBest && styles.miniCoachBest,
                ]}
              >
                <Text style={[styles.miniCoachId, c.isBest && { color: '#059669', fontWeight: '900' }]}>
                  {c.id} {c.isBest ? '⭐' : ''}
                </Text>
                <View style={[styles.miniCoachDot, { backgroundColor: c.dotColor }]} />
                <Text style={[styles.miniCoachLoad, c.isBest && { color: '#059669', fontWeight: '900' }]}>
                  {c.densityPct}%
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={styles.suburbanHeroFooter}>
          <Text style={styles.suburbanHeroFooterText}>
            💡 <Text style={{ color: '#059669', fontWeight: 'bold' }}>Coach {bestNamesStr}</Text> have lowest crowd density. Recommended platform boarding zone: Platform Marker 60m - 120m.
          </Text>
        </View>
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
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
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
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadge: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#64748B',
  },
  trainName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  delayPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  delayPillOnTime: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  delayPillLate: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  delayPillText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  gaugesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  gaugeItem: {
    alignItems: 'center',
    flex: 1,
  },
  gaugeVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  gaugeLabel: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 2,
  },
  gaugeDivider: {
    width: 1,
    height: 22,
    backgroundColor: '#CBD5E1',
  },
  xaiCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FED7AA',
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
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
    color: '#64748B',
    marginBottom: 10,
  },
  xaiFactorsList: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  xaiFactorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  xaiFactorName: {
    fontSize: 11,
    color: '#334155',
  },
  xaiFactorImpact: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#D97706',
    fontFamily: 'monospace',
  },
  xaiTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  xaiTotalLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#0F172A',
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
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  timelineSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
  },
  timelineSectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
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
    color: '#0F172A',
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
    backgroundColor: '#CBD5E1',
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#E2E8F0',
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
    color: '#0F172A',
  },
  platformBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  platformBadgeText: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: 'bold',
  },
  timelineArrDep: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  coachSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
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
    color: '#0F172A',
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
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    minWidth: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachText: {
    color: '#334155',
    fontSize: 11,
    fontWeight: 'bold',
  },
  loaderCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 12,
    color: '#64748B',
  },
  suburbanHeroSegment: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    elevation: 2,
    shadowColor: '#0284C7',
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  suburbanHeroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  suburbanHeroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  suburbanLivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  suburbanPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  suburbanLivePillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.5,
  },
  googleTechBadge: {
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  googleTechBadgeText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#0284C7',
    letterSpacing: 0.5,
  },
  suburbanHeroArrow: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FF671F',
  },
  suburbanHeroTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 2,
  },
  suburbanHeroSub: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },
  suburbanMiniCoachItem: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
    minWidth: 42,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  miniCoachBest: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  miniCoachId: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
    marginBottom: 3,
  },
  miniCoachDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 3,
  },
  miniCoachLoad: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  suburbanHeroFooter: {
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  suburbanHeroFooterText: {
    fontSize: 11,
    color: '#065F46',
    lineHeight: 16,
  },
});
