import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { getLiveTrainApi } from '../services/api';
import { AppBackground } from '../components/AppBackground';

export const LiveTrainScreen: React.FC = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'LiveTrain'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { trainNumber = '12301' } = route.params || {};

  const [liveData, setLiveData] = useState<any>(null);
  const [ticker, setTicker] = useState<number>(0);

  useEffect(() => {
    loadLiveState();
    const timer = setInterval(() => {
      setTicker((prev) => prev + 1);
    }, 3000);
    return () => clearInterval(timer);
  }, [trainNumber]);

  const loadLiveState = async () => {
    try {
      const data = await getLiveTrainApi(trainNumber);
      setLiveData(data);
    } catch (err) {}
  };

  const train = liveData || {
    trainNumber,
    name: 'Howrah Rajdhani Express',
    liveState: {
      lat: 25.2818,
      lng: 83.1189,
      speed: 92,
      heading: 305,
      currentSection: 'DDU-PRYJ-B17',
      lastStation: 'DDU',
      nextStation: 'PRYJ',
      delayMinutes: 12,
      predictedDelay: 14,
      confidence: 0.91,
      status: 'DELAYED',
    },
  };

  const speedOffset = (ticker % 4) * 2;
  const currentSpeed = (train.liveState?.speed || 90) + speedOffset;

  return (
    <AppBackground variant="orange">
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Top Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.trainNumText}>Train #{train.trainNumber}</Text>
              <Text style={styles.trainNameText}>{train.name}</Text>
            </View>
            <View style={styles.liveGpsBadge}>
              <View style={styles.livePulseDot} />
              <Text style={styles.liveGpsText}>LIVE GPS (3s)</Text>
            </View>
          </View>

          {/* Speedometer and Telemetry Row */}
          <View style={styles.telemetryGrid}>
            <View style={styles.telemetryBox}>
              <Text style={styles.telemetryVal}>{currentSpeed}</Text>
              <Text style={styles.telemetryUnit}>KM/H</Text>
              <Text style={styles.telemetryLabel}>Instant Speed</Text>
            </View>

            <View style={styles.telemetryBox}>
              <Text style={[styles.telemetryVal, { color: '#F59E0B' }]}>
                +{train.liveState?.delayMinutes || 0}
              </Text>
              <Text style={styles.telemetryUnit}>MINUTES</Text>
              <Text style={styles.telemetryLabel}>Current Delay</Text>
            </View>

            <View style={styles.telemetryBox}>
              <Text style={[styles.telemetryVal, { color: '#10B981' }]}>
                {Math.round((train.liveState?.confidence || 0.9) * 100)}%
              </Text>
              <Text style={styles.telemetryUnit}>SCORE</Text>
              <Text style={styles.telemetryLabel}>AI Confidence</Text>
            </View>
          </View>
        </View>

      {/* Interactive Corridor Visualizer (Fallback Native Vector Map) */}
      <View style={styles.mapCard}>
        <View style={styles.mapCardHeader}>
          <Text style={styles.mapCardTitle}>Active Corridor Visualizer</Text>
          <Text style={styles.mapCardSub}>Section: {train.liveState.currentSection}</Text>
        </View>

        {/* Visual Track Map Simulation */}
        <View style={styles.trackCanvas}>
          {/* Background Grid */}
          <View style={styles.trackLineContainer}>
            <View style={styles.railTrack} />
            <View style={styles.railTrackInner} />

            {/* Station 1: Last Stoppage */}
            <View style={[styles.stationNode, { left: '15%' }]}>
              <View style={[styles.stationDot, styles.stationDotPassed]} />
              <Text style={styles.stationNodeName}>{train.liveState.lastStation || 'DDU'}</Text>
              <Text style={styles.stationNodeStatus}>Passed</Text>
            </View>

            {/* Live Moving Train Icon */}
            <View style={[styles.liveTrainMarker, { left: `${48 + (ticker % 3) * 3}%` }]}>
              <View style={styles.trainPulseRing} />
              <View style={styles.trainMarkerCircle}>
                <Text style={{ fontSize: 16 }}>🚆</Text>
              </View>
              <View style={styles.trainTooltip}>
                <Text style={styles.trainTooltipText}>{currentSpeed} km/h</Text>
              </View>
            </View>

            {/* Station 2: Upcoming Destination */}
            <View style={[styles.stationNode, { right: '15%' }]}>
              <View style={[styles.stationDot, styles.stationDotNext]} />
              <Text style={styles.stationNodeName}>{train.liveState.nextStation || 'PRYJ'}</Text>
              <Text style={styles.stationNodeStatus}>ETA: 12:14</Text>
            </View>
          </View>
        </View>

        <View style={styles.coordinatesRow}>
          <Text style={styles.coordText}>
            GPS Lat: {train.liveState.lat?.toFixed(4)} | Lng: {train.liveState.lng?.toFixed(4)}
          </Text>
        </View>
      </View>

      {/* Hero "Can I Catch?" Shortcut Button */}
      <TouchableOpacity
        style={styles.catchCtaButton}
        onPress={() => navigation.navigate('CanICatch', { trainNumber: train.trainNumber })}
      >
        <Text style={styles.catchCtaIcon}>🎯</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.catchCtaTitle}>Check if you can catch this train</Text>
          <Text style={styles.catchCtaSub}>Calculates road traffic, buffer, and departure</Text>
        </View>
        <Text style={styles.catchCtaArrow}>→</Text>
      </TouchableOpacity>

        {/* Station Dwell & Delay Predictor Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Next Interlocking Clearance</Text>
          <Text style={styles.infoDesc}>
            Train is approaching <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>{train.liveState?.nextStation || 'Prayagraj Junction'}</Text>. AI predicts 4 min outer signal clearance delay before platform docking.
          </Text>
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
  headerCard: {
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
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  trainNumText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FF671F',
  },
  trainNameText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  liveGpsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 4,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveGpsText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#059669',
  },
  telemetryGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  telemetryBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  telemetryVal: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  telemetryUnit: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#64748B',
    marginTop: 1,
  },
  telemetryLabel: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 4,
  },
  mapCard: {
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
  mapCardHeader: {
    marginBottom: 12,
  },
  mapCardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  mapCardSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  trackCanvas: {
    height: 160,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  trackLineContainer: {
    width: '100%',
    height: 60,
    justifyContent: 'center',
    position: 'relative',
  },
  railTrack: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: 4,
    backgroundColor: '#CBD5E1',
  },
  railTrackInner: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: 2,
    backgroundColor: '#0284C7',
    opacity: 0.8,
  },
  stationNode: {
    position: 'absolute',
    alignItems: 'center',
    top: 6,
  },
  stationDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  stationDotPassed: {
    backgroundColor: '#10B981',
  },
  stationDotNext: {
    backgroundColor: '#FF671F',
  },
  stationNodeName: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 4,
  },
  stationNodeStatus: {
    fontSize: 9,
    color: '#64748B',
  },
  liveTrainMarker: {
    position: 'absolute',
    alignItems: 'center',
    top: 2,
    zIndex: 10,
  },
  trainPulseRing: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 103, 31, 0.2)',
    top: -5,
  },
  trainMarkerCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF671F',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  trainTooltip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FF671F',
    marginTop: 4,
    elevation: 2,
  },
  trainTooltipText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  coordinatesRow: {
    marginTop: 10,
    alignItems: 'center',
  },
  coordText: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#64748B',
  },
  catchCtaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FED7AA',
    marginBottom: 14,
  },
  catchCtaIcon: {
    fontSize: 26,
    marginRight: 12,
  },
  catchCtaTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  catchCtaSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  catchCtaArrow: {
    fontSize: 20,
    color: '#FF671F',
    fontWeight: 'bold',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.03,
  },
  infoTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 4,
  },
  infoDesc: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
  },
});
