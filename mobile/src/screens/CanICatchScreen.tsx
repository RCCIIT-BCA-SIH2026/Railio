import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, CatchTrainResult } from '../types';
import { calculateCatchProbabilityApi } from '../services/api';
import { AppBackground } from '../components/AppBackground';

export const CanICatchScreen: React.FC = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'CanICatch'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { trainNumber = '32216' } = route.params || {};

  const [distanceKm, setDistanceKm] = useState<number>(5);
  const [traffic, setTraffic] = useState<'LOW' | 'MODERATE' | 'HEAVY' | 'SEVERE'>('MODERATE');
  const [stationBuffer, setStationBuffer] = useState<number>(7);
  const [result, setResult] = useState<CatchTrainResult | null>(null);

  useEffect(() => {
    runCalculation();
  }, [trainNumber, distanceKm, traffic, stationBuffer]);

  const runCalculation = async () => {
    try {
      const res = await calculateCatchProbabilityApi({
        trainNumber,
        roadDistanceKm: distanceKm,
        trafficCondition: traffic,
        stationEntryBufferMin: stationBuffer,
      });
      setResult(res);
    } catch (err) {
      console.error(err);
    }
  };

  const isHighProb = (result?.catchProbabilityPct || 91) >= 75;
  const isModerateProb = (result?.catchProbabilityPct || 91) >= 45 && (result?.catchProbabilityPct || 91) < 75;

  const probColor = isHighProb ? '#10B981' : isModerateProb ? '#F59E0B' : '#EF4444';

  return (
    <AppBackground variant="orange">
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Banner */}
      <View style={styles.header}>
        <View style={styles.heroBadge}>
          <Text style={{ fontSize: 26 }}>🎯</Text>
        </View>
        <Text style={styles.headerTitle}>Can I Catch My Train?</Text>
        <Text style={styles.headerSub}>
          AI Road Traffic + Station Security Buffer + Live Predicted Departure
        </Text>
      </View>

      {/* Main Dynamic Probability Gauge Card */}
      <View style={[styles.gaugeCard, { borderColor: `${probColor}60` }]}>
        <View style={styles.gaugeTopRow}>
          <View>
            <Text style={styles.trainNumberText}>Train #{result?.trainNumber || trainNumber}</Text>
            <Text style={styles.trainNameText}>{result?.trainName || 'Howrah Rajdhani Express'}</Text>
          </View>
          <View style={styles.predictedDepBox}>
            <Text style={styles.depLabel}>Predicted Dep.</Text>
            <Text style={styles.depVal}>{result?.predictedDeparture || '17:02'}</Text>
          </View>
        </View>

        {/* Large Percentage Badge */}
        <View style={styles.percentageContainer}>
          <View style={[styles.circleRing, { borderColor: probColor }]}>
            <Text style={[styles.percentageNumber, { color: probColor }]}>
              {result?.catchProbabilityPct || 91}%
            </Text>
            <Text style={styles.probSubtitle}>
              {isHighProb ? 'HIGH CHANCE' : isModerateProb ? 'MODERATE' : 'HIGH RISK'}
            </Text>
          </View>
        </View>

        {/* AI Actionable Recommendation */}
        <View style={[styles.recommendationBox, { backgroundColor: `${probColor}15` }]}>
          <Text style={[styles.recommendationText, { color: probColor }]}>
            {result?.recommendation || '🟢 High probability you can catch your train. Leave now.'}
          </Text>
        </View>

        {/* Alternative Train Suggestion Card (if low probability) */}
        {result?.alternativeTrain && (
          <View style={styles.altTrainCard}>
            <Text style={styles.altTrainTitle}>💡 Recommended Alternate Connection:</Text>
            <Text style={styles.altTrainDetails}>
              Train {result.alternativeTrain.trainNumber} ({result.alternativeTrain.name}) at {result.alternativeTrain.departureTime}
            </Text>
          </View>
        )}
      </View>

      {/* Interactive Parameter Controls */}
      <View style={styles.controlsCard}>
        <Text style={styles.controlsTitle}>⚙️ Customize Journey Parameters</Text>

        {/* 1. Distance to Station */}
        <View style={styles.controlGroup}>
          <View style={styles.controlLabelRow}>
            <Text style={styles.controlLabel}>Distance to Station</Text>
            <Text style={styles.controlValue}>{distanceKm} km</Text>
          </View>
          <View style={styles.distanceChips}>
            {[4, 8, 12, 18, 25].map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.chip, distanceKm === d && styles.chipActive]}
                onPress={() => setDistanceKm(d)}
              >
                <Text style={[styles.chipText, distanceKm === d && styles.chipTextActive]}>
                  {d} km
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 2. Road Traffic Conditions */}
        <View style={styles.controlGroup}>
          <View style={styles.controlLabelRow}>
            <Text style={styles.controlLabel}>Road Traffic Congestion</Text>
            <Text style={[styles.controlValue, { color: '#F59E0B' }]}>{traffic}</Text>
          </View>
          <View style={styles.trafficRow}>
            {(['LOW', 'MODERATE', 'HEAVY', 'SEVERE'] as const).map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.trafficBtn, traffic === t && styles.trafficBtnActive]}
                onPress={() => setTraffic(t)}
              >
                <Text style={[styles.trafficBtnText, traffic === t && styles.trafficBtnTextActive]}>
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 3. Station Entry Buffer (Security + Footbridge) */}
        <View style={styles.controlGroup}>
          <View style={styles.controlLabelRow}>
            <Text style={styles.controlLabel}>Station Entry & Security Buffer</Text>
            <Text style={styles.controlValue}>{stationBuffer} min</Text>
          </View>
          <View style={styles.distanceChips}>
            {[5, 7, 10, 15].map((b) => (
              <TouchableOpacity
                key={b}
                style={[styles.chip, stationBuffer === b && styles.chipActive]}
                onPress={() => setStationBuffer(b)}
              >
                <Text style={[styles.chipText, stationBuffer === b && styles.chipTextActive]}>
                  {b} min
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Time Breakdown Math Table (Prompt Requirement) */}
      <View style={styles.breakdownCard}>
        <Text style={styles.breakdownTitle}>📊 Time Calculation Breakdown</Text>
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>Road Travel Time:</Text>
          <Text style={styles.breakdownVal}>{result?.roadTravelMinutes || 18} min</Text>
        </View>
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>Station Security / Entry Buffer:</Text>
          <Text style={styles.breakdownVal}>+{result?.stationEntryBufferMinutes || 7} min</Text>
        </View>
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>Safety Margin:</Text>
          <Text style={styles.breakdownVal}>+5 min</Text>
        </View>
        <View style={[styles.breakdownRow, styles.breakdownDivider]}>
          <Text style={styles.breakdownTotalLabel}>Total Time Required:</Text>
          <Text style={styles.breakdownTotalVal}>{result?.requiredMinutes || 30} min</Text>
        </View>
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownTotalLabel}>Total Time Available:</Text>
          <Text style={[styles.breakdownTotalVal, { color: '#38BDF8' }]}>
            {result?.availableMinutes || 38} min
          </Text>
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
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  heroBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFF7ED',
    borderWidth: 1.5,
    borderColor: '#FF671F',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  headerSub: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },
  gaugeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1.5,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  gaugeTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  trainNumberText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FF671F',
  },
  trainNameText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  predictedDepBox: {
    alignItems: 'flex-end',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  depLabel: {
    fontSize: 8.5,
    fontWeight: 'bold',
    color: '#64748B',
  },
  depVal: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0284C7',
  },
  percentageContainer: {
    alignItems: 'center',
    marginVertical: 14,
  },
  circleRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
  },
  percentageNumber: {
    fontSize: 38,
    fontWeight: '900',
  },
  probSubtitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#64748B',
    letterSpacing: 1,
    marginTop: 2,
  },
  recommendationBox: {
    padding: 14,
    borderRadius: 14,
    marginTop: 10,
    alignItems: 'center',
  },
  recommendationText: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 18,
  },
  altTrainCard: {
    marginTop: 12,
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  altTrainTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#DC2626',
  },
  altTrainDetails: {
    fontSize: 12,
    fontWeight: '800',
    color: '#991B1B',
    marginTop: 2,
  },
  controlsCard: {
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
  controlsTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 14,
  },
  controlGroup: {
    marginBottom: 14,
  },
  controlLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  controlLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  controlValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FF671F',
  },
  distanceChips: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  chipActive: {
    backgroundColor: '#FF671F',
    borderColor: '#FF671F',
  },
  chipText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#64748B',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  trafficRow: {
    flexDirection: 'row',
    gap: 6,
  },
  trafficBtn: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  trafficBtnActive: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  trafficBtnText: {
    fontSize: 9.5,
    fontWeight: 'bold',
    color: '#64748B',
  },
  trafficBtnTextActive: {
    color: '#B45309',
  },
  breakdownCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
  },
  breakdownTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 10,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  breakdownLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  breakdownVal: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#334155',
  },
  breakdownDivider: {
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 6,
    paddingTop: 6,
  },
  breakdownTotalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  breakdownTotalVal: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FF671F',
  },
});
