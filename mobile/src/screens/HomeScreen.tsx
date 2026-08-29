import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { VandeBharatHero } from '../components/VandeBharatHero';
import { getAlertsApi } from '../services/api';
import { colors } from '../theme/colors';

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [fromStation, setFromStation] = useState('HWH');
  const [toStation, setToStation] = useState('NDLS');
  const [journeyDate, setJourneyDate] = useState('Today, 28 Aug');
  const [refreshing, setRefreshing] = useState(false);
  const [activeAlertCount, setActiveAlertCount] = useState(3);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      const alerts = await getAlertsApi();
      setActiveAlertCount(alerts.length);
    } catch (err) {}
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAlerts();
    setRefreshing(false);
  };

  const handleSearch = () => {
    navigation.navigate('SearchResults', {
      from: fromStation,
      to: toStation,
      date: journeyDate,
    });
  };

  const swapStations = () => {
    const temp = fromStation;
    setFromStation(toStation);
    setToStation(temp);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF671F" />}
    >
      {/* Top Header Bar */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.logoBadge}>
            <Text style={{ fontSize: 18 }}>🚆</Text>
          </View>
          <View>
            <Text style={styles.brandTitle}>RailSathi</Text>
            <Text style={styles.brandSubtitle}>AI RAILWAY INTELLIGENCE</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => navigation.navigate('Alerts')}
          >
            <Text style={{ fontSize: 16 }}>🔔</Text>
            {activeAlertCount > 0 && <View style={styles.alertDot} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => navigation.navigate('Profile')}
          >
            <Text style={{ fontSize: 16 }}>👤</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Hero Visual Area with Vande Bharat Train */}
      <View style={styles.heroSection}>
        <View style={styles.heroGlow} />
        <VandeBharatHero height={170} />
        <View style={styles.taglineBadge}>
          <Text style={styles.taglineText}>PREDICT • PROTECT • CONNECT</Text>
        </View>
      </View>

      {/* Main Train Search Card */}
      <View style={styles.searchCard}>
        <View style={styles.searchCardHeader}>
          <Text style={styles.searchCardTitle}>🔍 Search Train & AI Predictions</Text>
          <View style={styles.demoBadge}>
            <Text style={styles.demoBadgeText}>LIVE GPS</Text>
          </View>
        </View>

        {/* From & To Station Row with Swap Button */}
        <View style={styles.stationsRow}>
          <View style={styles.stationInputBox}>
            <Text style={styles.stationInputLabel}>FROM</Text>
            <TextInput
              style={styles.stationInput}
              value={fromStation}
              onChangeText={setFromStation}
              placeholder="HWH"
              placeholderTextColor="#64748B"
              autoCapitalize="characters"
            />
            <Text style={styles.stationCityText}>
              {fromStation === 'HWH' ? 'Howrah Jn' : fromStation === 'NDLS' ? 'New Delhi' : 'Station Code'}
            </Text>
          </View>

          <TouchableOpacity style={styles.swapButton} onPress={swapStations}>
            <Text style={styles.swapIcon}>⇄</Text>
          </TouchableOpacity>

          <View style={styles.stationInputBox}>
            <Text style={styles.stationInputLabel}>TO</Text>
            <TextInput
              style={styles.stationInput}
              value={toStation}
              onChangeText={setToStation}
              placeholder="NDLS"
              placeholderTextColor="#64748B"
              autoCapitalize="characters"
            />
            <Text style={styles.stationCityText}>
              {toStation === 'NDLS' ? 'New Delhi' : toStation === 'HWH' ? 'Howrah Jn' : 'Station Code'}
            </Text>
          </View>
        </View>

        {/* Date Selector */}
        <View style={styles.dateSelector}>
          <Text style={styles.dateLabel}>JOURNEY DATE</Text>
          <TextInput
            style={styles.dateInput}
            value={journeyDate}
            onChangeText={setJourneyDate}
          />
        </View>

        {/* Search CTA */}
        <TouchableOpacity style={styles.searchCta} onPress={handleSearch}>
          <Text style={styles.searchCtaText}>SEARCH TRAINS WITH AI</Text>
        </TouchableOpacity>
      </View>

      {/* 4 Core Action Cards (Prompt Requirement) */}
      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle}>Intelligence Services</Text>
        <Text style={styles.sectionSubtitle}>AI & IoT Powered</Text>
      </View>

      <View style={styles.actionGrid}>
        {/* 1. Live Train Tracking */}
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('LiveTrain', { trainNumber: '12301' })}
        >
          <View style={[styles.actionIconBox, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
            <Text style={{ fontSize: 24 }}>🚆</Text>
          </View>
          <Text style={styles.actionCardTitle}>Live Train</Text>
          <Text style={styles.actionCardSub}>Real-time GPS Tracking</Text>
          <View style={styles.actionCardBadge}>
            <Text style={[styles.actionCardBadgeText, { color: '#38BDF8' }]}>3s Updates</Text>
          </View>
        </TouchableOpacity>

        {/* 2. Can I Catch My Train? (HERO FEATURE) */}
        <TouchableOpacity
          style={[styles.actionCard, styles.actionCardHighlight]}
          onPress={() => navigation.navigate('CanICatch', { trainNumber: '12301' })}
        >
          <View style={[styles.actionIconBox, { backgroundColor: 'rgba(255, 103, 31, 0.2)' }]}>
            <Text style={{ fontSize: 24 }}>🎯</Text>
          </View>
          <Text style={[styles.actionCardTitle, { color: '#FF671F' }]}>Can I Catch?</Text>
          <Text style={styles.actionCardSub}>Traffic + Station Buffer</Text>
          <View style={[styles.actionCardBadge, { backgroundColor: 'rgba(255, 103, 31, 0.2)' }]}>
            <Text style={[styles.actionCardBadgeText, { color: '#FF671F' }]}>Hero AI</Text>
          </View>
        </TouchableOpacity>

        {/* 3. Coach Crowd Intelligence */}
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('CoachCrowd', { trainNumber: '12301' })}
        >
          <View style={[styles.actionIconBox, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
            <Text style={{ fontSize: 24 }}>👥</Text>
          </View>
          <Text style={styles.actionCardTitle}>Coach Crowd</Text>
          <Text style={styles.actionCardSub}>Least Density Finder</Text>
          <View style={styles.actionCardBadge}>
            <Text style={[styles.actionCardBadgeText, { color: '#A855F7' }]}>CV Heatmap</Text>
          </View>
        </TouchableOpacity>

        {/* 4. Weather Intelligence */}
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('WeatherIntelligence', { stationCode: 'HWH' })}
        >
          <View style={[styles.actionIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
            <Text style={{ fontSize: 24 }}>🌦️</Text>
          </View>
          <Text style={styles.actionCardTitle}>Weather</Text>
          <Text style={styles.actionCardSub}>Rain & Delay Impact</Text>
          <View style={styles.actionCardBadge}>
            <Text style={[styles.actionCardBadgeText, { color: '#10B981' }]}>Live Radar</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Advanced Safety & Omnichannel Features Bar */}
      <View style={styles.extraFeaturesRow}>
        <TouchableOpacity
          style={styles.extraFeatureChip}
          onPress={() => navigation.navigate('ObstacleDetection')}
        >
          <Text style={{ fontSize: 16 }}>📹</Text>
          <Text style={styles.extraFeatureText}>Track Obstacle CV</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.extraFeatureChip}
          onPress={() => navigation.navigate('StationArrivalBoard', { stationCode: 'HWH' })}
        >
          <Text style={{ fontSize: 16 }}>📋</Text>
          <Text style={styles.extraFeatureText}>Station Board</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.extraFeatureChip}
          onPress={() => navigation.navigate('WhatsAppSimulator')}
        >
          <Text style={{ fontSize: 16 }}>💬</Text>
          <Text style={styles.extraFeatureText}>WhatsApp Sathi</Text>
        </TouchableOpacity>
      </View>

      {/* Live Railway Network Status Bar (Prompt Requirement) */}
      <View style={styles.statusPillCard}>
        <View style={styles.statusPillHeader}>
          <Text style={styles.statusPillTitle}>LIVE RAILWAY STATUS</Text>
          <View style={styles.liveTick}>
            <View style={styles.greenPulse} />
            <Text style={styles.liveTickText}>LIVE</Text>
          </View>
        </View>

        <View style={styles.statusPillRow}>
          <View style={styles.statusItem}>
            <Text style={styles.statusNumber}>142</Text>
            <Text style={styles.statusLabel}>Active Trains</Text>
          </View>
          <View style={styles.statusDivider} />
          <View style={styles.statusItem}>
            <Text style={[styles.statusNumber, { color: '#F59E0B' }]}>27</Text>
            <Text style={styles.statusLabel}>Delayed</Text>
          </View>
          <View style={styles.statusDivider} />
          <View style={styles.statusItem}>
            <Text style={[styles.statusNumber, { color: '#EF4444' }]}>3</Text>
            <Text style={styles.statusLabel}>Critical Risks</Text>
          </View>
          <View style={styles.statusDivider} />
          <View style={styles.statusItem}>
            <Text style={[styles.statusNumber, { color: '#10B981' }]}>88%</Text>
            <Text style={styles.statusLabel}>Punctual</Text>
          </View>
        </View>
      </View>

      {/* Quick PNR / AI Assistant Floating Banner */}
      <TouchableOpacity
        style={styles.aiBanner}
        onPress={() => navigation.navigate('AIAssistant', { initialQuery: 'Where is train 12301?' })}
      >
        <View style={styles.aiBannerIcon}>
          <Text style={{ fontSize: 22 }}>🤖</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.aiBannerTitle}>Ask RailSathi AI Agent</Text>
          <Text style={styles.aiBannerSub}>
            "Where is my train?" • "Can I catch it?" • "Why is it delayed?"
          </Text>
        </View>
        <Text style={styles.aiBannerArrow}>→</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 35,
    paddingBottom: 40,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.primary,
    letterSpacing: 1.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
  },
  heroSection: {
    alignItems: 'center',
    marginVertical: 4,
    position: 'relative',
  },
  heroGlow: {
    position: 'absolute',
    width: 240,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primaryLight,
    top: 20,
  },
  taglineBadge: {
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    marginTop: -8,
  },
  taglineText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.primary,
    letterSpacing: 1.5,
  },
  searchCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  searchCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  searchCardTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.text,
  },
  demoBadge: {
    backgroundColor: colors.greenLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.green,
  },
  demoBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.greenDark,
  },
  stationsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  stationInputBox: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stationInputLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.textMuted,
    letterSpacing: 1,
  },
  stationInput: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    paddingVertical: 2,
  },
  stationCityText: {
    fontSize: 10,
    color: colors.textLight,
  },
  swapButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swapIcon: {
    fontSize: 16,
    color: colors.white,
    fontWeight: 'bold',
  },
  dateSelector: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  dateLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.textMuted,
  },
  dateInput: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.text,
    paddingVertical: 2,
  },
  searchCta: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  searchCtaText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionCard: {
    width: '48%',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  actionCardHighlight: {
    borderColor: colors.primaryLight,
    backgroundColor: colors.card,
  },
  actionIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  actionCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  actionCardSub: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  actionCardBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.background,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 8,
  },
  actionCardBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  extraFeaturesRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  extraFeatureChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.card,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  extraFeatureText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.textMuted,
  },
  statusPillCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  statusPillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statusPillTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.textMuted,
    letterSpacing: 1,
  },
  liveTick: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  greenPulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.green,
  },
  liveTickText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.green,
  },
  statusPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusItem: {
    alignItems: 'center',
    flex: 1,
  },
  statusNumber: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.text,
  },
  statusLabel: {
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 1,
  },
  statusDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
  },
  aiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    borderRadius: 16,
    padding: 14,
    marginTop: 16,
  },
  aiBannerIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  aiBannerTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.text,
  },
  aiBannerSub: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  aiBannerArrow: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: 'bold',
    marginLeft: 6,
  },
});
