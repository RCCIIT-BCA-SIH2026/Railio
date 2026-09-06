import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useRoute, useNavigation, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { getLiveTrainApi } from '../services/api';
import { AppBackground } from '../components/AppBackground';
import { TrainFront, Search } from 'lucide-react-native';

export const LiveTrainScreen: React.FC = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'LiveTrain'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { trainNumber = '' } = route.params || {};

  const [liveData, setLiveData] = useState<any>(null);
  const [ticker, setTicker] = useState<number>(0);
  const [activeTrain, setActiveTrain] = useState(trainNumber);
  const [searchQuery, setSearchQuery] = useState(trainNumber);
  const [isInsideTrain, setIsInsideTrain] = useState(false);

  const handleSearch = () => {
    if (searchQuery.trim().length > 0) {
      setActiveTrain(searchQuery);
    }
  };

  const toggleInsideTrain = () => {
    const newState = !isInsideTrain;
    setIsInsideTrain(newState);
    if (newState) {
      setActiveTrain('12301');
      setSearchQuery('12301');
    } else {
      setActiveTrain('');
      setSearchQuery('');
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadLiveState();
      const timer = setInterval(() => {
        setTicker((prev) => prev + 1);
      }, 3000);
      return () => clearInterval(timer);
    }, [trainNumber, activeTrain])
  );

  const loadLiveState = async () => {
    if (!activeTrain) return;
    try {
      const data = await getLiveTrainApi(activeTrain);
      setLiveData(data);
    } catch (err) {}
  };

  const train = liveData || {
    trainNumber: activeTrain,
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
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={{ flex: 1 }}
        enabled={Platform.OS !== 'web'} 
      >
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Top Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View style={styles.searchRow}>
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Train Number or Train Name"
                placeholderTextColor="#94A3B8"
                onSubmitEditing={handleSearch}
              />
              <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
                <Search size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.insideTrainRow}>
              <TouchableOpacity 
                style={styles.checkboxRow} 
                onPress={toggleInsideTrain}
              >
                <View style={[styles.checkbox, isInsideTrain && styles.checkboxActive]}>
                  {isInsideTrain && <Text style={{ color: '#FFF', fontSize: 10, fontWeight: 'bold' }}>✓</Text>}
                </View>
                <Text style={styles.insideTrainText}>I am inside this train</Text>
              </TouchableOpacity>
              
              {activeTrain ? (
              <View style={styles.liveGpsBadge}>
                <View style={styles.livePulseDot} />
                <Text style={styles.liveGpsText}>LIVE GPS (3s)</Text>
              </View>
              ) : null}
            </View>
          </View>
          {activeTrain ? (
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
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 10 }}>
              <Text style={{ color: '#64748B', fontSize: 12 }}>Search for a train to see live tracking</Text>
            </View>
          )}
        </View>

      {/* Interactive Corridor Visualizer (Fallback Native Vector Map) */}
      {activeTrain ? (
      <View style={styles.mapCard}>
        <View style={styles.mapCardHeader}>
          <Text style={styles.mapCardTitle}>Active Corridor Visualizer</Text>
          <Text style={styles.mapCardSub}>Section: {train.liveState.currentSection}</Text>
        </View>

        {/* Visual Track Map Simulation */}
        <View style={styles.trackCanvas}>
          {/* Background Grid */}
          <View style={styles.trackLineContainer}>
            {/* Realistic Train Track */}
            <View style={styles.realisticTrack}>
              <View style={styles.sleeperContainer}>
                {Array.from({ length: 35 }).map((_, i) => (
                  <View key={i} style={styles.sleeper} />
                ))}
              </View>
              <View style={styles.railTop} />
              <View style={styles.railBottom} />
              <View style={styles.railActiveHighlight} />
            </View>

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
                <TrainFront size={20} color="#FF671F" strokeWidth={2.5} />
              </View>
              <View style={styles.pinPointer} />
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
      ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
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
    marginBottom: 16,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginBottom: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  searchButton: {
    padding: 8,
  },
  insideTrainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    backgroundColor: '#FFFFFF',
  },
  checkboxActive: {
    backgroundColor: '#FF671F',
    borderColor: '#FF671F',
  },
  insideTrainText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
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
  realisticTrack: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: 16,
    justifyContent: 'center',
    top: 22,
  },
  sleeperContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  sleeper: {
    width: 4,
    height: 16,
    backgroundColor: '#94A3B8',
    borderRadius: 2,
  },
  railTop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 2,
    height: 3,
    backgroundColor: '#64748B',
  },
  railBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 2,
    height: 3,
    backgroundColor: '#64748B',
  },
  railActiveHighlight: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 6,
    height: 4,
    backgroundColor: 'rgba(2, 132, 199, 0.4)',
  },
  stationNode: {
    position: 'absolute',
    alignItems: 'center',
    top: 14,
  },
  stationDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  stationDotPassed: {
    backgroundColor: '#10B981',
  },
  stationDotNext: {
    backgroundColor: '#FF671F',
  },
  stationNodeName: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 6,
  },
  stationNodeStatus: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#64748B',
  },
  liveTrainMarker: {
    position: 'absolute',
    alignItems: 'center',
    top: -4,
    zIndex: 10,
  },
  trainPulseRing: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 103, 31, 0.2)',
    top: -4,
  },
  trainMarkerCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#FF671F',
    overflow: 'hidden',
  },
  trainMarkerImage: {
    width: '100%',
    height: '100%',
  },
  pinPointer: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#FF671F',
    marginTop: -1,
  },
  trainTooltip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#FF671F',
    marginTop: 4,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  trainTooltipText: {
    fontSize: 10,
    fontWeight: '900',
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
});
