import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Platform,
  InteractionManager,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { VandeBharatHero } from '../components/VandeBharatHero';
import { AppBackground } from '../components/AppBackground';
import { getAlertsApi } from '../services/api';
import { Scan, Ticket, Armchair, Building2, Headset, Users, CloudRain, Bell } from 'lucide-react-native';

export const HomeScreen: React.FC = React.memo(() => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [fromStation, setFromStation] = useState('HWH');
  const [toStation, setToStation] = useState('NDLS');
  const [journeyDate, setJourneyDate] = useState('Today, 28 Aug');
  const [refreshing, setRefreshing] = useState(false);
  const [activeAlertCount, setActiveAlertCount] = useState(3);

  const loadAlerts = useCallback(async () => {
    try {
      const alerts = await getAlertsApi();
      setActiveAlertCount(alerts.length);
    } catch (err) { }
  }, []);

  useEffect(() => {
    // Run network tasks after initial frame layout completes
    const task = InteractionManager.runAfterInteractions(() => {
      loadAlerts();
    });
    return () => task.cancel();
  }, [loadAlerts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAlerts();
    setRefreshing(false);
  }, [loadAlerts]);

  const handleSearch = useCallback(() => {
    navigation.navigate('SearchResults', {
      from: fromStation,
      to: toStation,
      date: journeyDate,
    });
  }, [navigation, fromStation, toStation, journeyDate]);

  const swapStations = useCallback(() => {
    setFromStation((prevFrom) => {
      setToStation(prevFrom);
      return toStation;
    });
  }, [toStation]);

  return (
    <AppBackground variant="orange">
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF671F" />}
      >
        {/* Top Header Bar */}
        <View style={styles.topHeader}>
          <View style={styles.headerLeft}>
            <View style={styles.logoBadge}>
              <Image source={require('../../assets/logo.png')} style={{ width: '100%', height: '100%', transform: [{ scale: 1.6 }] }} resizeMode="contain" />
            </View>
            <View>
              <Text style={styles.brandTitle}>Rail<Text style={styles.brandTitleIo}>io</Text></Text>
              <Text style={styles.brandSubtitle}>AI RAILWAY INTELLIGENCE</Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => navigation.navigate('Alerts')}
            >
              <Bell size={20} color="#0F172A" strokeWidth={2.5} />
              {activeAlertCount > 0 && <View style={styles.alertDot} />}
            </TouchableOpacity>

          </View>
        </View>

        {/* Hero Visual Headline */}
        <View style={styles.heroTextContainer}>
          <Text style={styles.heroHeadline}>
            India Moves{'\n'}
            <Text style={{ color: '#FF671F' }}>With Progress</Text>
          </Text>
          <Text style={styles.heroSubheadline}>
            Smart Journey. Stronger Connections. Real-time train updates, seamless booking, and a better travel experience for every Indian.
          </Text>
        </View>

        {/* Hero Visual Area with Vande Bharat Train */}
        <View style={styles.heroSection}>
          <View style={styles.heroGlow} />
          <VandeBharatHero height={160} />
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

        {/* 4-Card Quick Service Row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickServicesScroll} contentContainerStyle={styles.quickServicesContent}>

          {/* 1. Live Train Status */}
          <TouchableOpacity
            style={styles.quickServiceCard}
            onPress={() => navigation.navigate('LiveTrain', { trainNumber: '12301' })}
          >
            <View style={[styles.quickServiceIcon, { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' }]}>
              <Image source={require('../../assets/footer_svg_transparent.png')} style={{ width: 40, height: 40, tintColor: '#0284C7' }} resizeMode="contain" />
            </View>
            <Text style={styles.quickServiceTitle}>Live Train Status</Text>
            <Text style={styles.quickServiceSub}>Get real-time updates</Text>
          </TouchableOpacity>

          {/* 2. PNR Enquiry */}
          <TouchableOpacity
            style={styles.quickServiceCard}
            onPress={() => navigation.navigate('SearchResults', { from: fromStation, to: toStation, date: journeyDate })}
          >
            <View style={[styles.quickServiceIcon, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
              <Ticket size={20} color="#D97706" strokeWidth={2.5} />
            </View>
            <Text style={styles.quickServiceTitle}>PNR Enquiry</Text>
            <Text style={styles.quickServiceSub}>Check your status</Text>
          </TouchableOpacity>



          {/* 4. Station Info */}
          <TouchableOpacity
            style={styles.quickServiceCard}
            onPress={() => navigation.navigate('StationArrivalBoard', { stationCode: 'HWH' })}
          >
            <View style={[styles.quickServiceIcon, { backgroundColor: '#FFEDD5', borderColor: '#FED7AA' }]}>
              <Building2 size={20} color="#EA580C" strokeWidth={2.5} />
            </View>
            <Text style={styles.quickServiceTitle}>Station Info</Text>
            <Text style={styles.quickServiceSub}>Explore stations</Text>
          </TouchableOpacity>

          {/* 5. 24/7 Support */}
          <TouchableOpacity
            style={styles.quickServiceCard}
            onPress={() => navigation.navigate('Alerts')}
          >
            <View style={[styles.quickServiceIcon, { backgroundColor: '#E0F2FE', borderColor: '#BAE6FD' }]}>
              <Headset size={20} color="#0284C7" strokeWidth={2.5} />
            </View>
            <Text style={styles.quickServiceTitle}>24/7 Support</Text>
            <Text style={styles.quickServiceSub}>Safety & help</Text>
          </TouchableOpacity>
        </ScrollView>



        {/* 🌟 Suburban Local & Google Maps Cellular Signal Crowd Pulse Segment */}
        <TouchableOpacity
          style={styles.suburbanHeroSegment}
          onPress={() => navigation.navigate('SuburbanLocal', { from: 'DAKE', to: 'SDAH' })}
        >
          <View style={styles.suburbanHeroTop}>
            <View style={styles.suburbanHeroBadgeRow}>
              <View style={styles.suburbanLivePill}>
                <View style={styles.suburbanPulseDot} />
                <Text style={styles.suburbanLivePillText}>LIVE PULSE</Text>
              </View>
              <View style={styles.googleTechBadge}>
                <Text style={styles.googleTechBadgeText}>GOOGLE MAPS SIGNAL TECH</Text>
              </View>
            </View>
            <Text style={styles.suburbanHeroArrow}>Search Locals →</Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <Image source={require('../../assets/logo.png')} style={{ width: 22, height: 22, marginRight: 8 }} resizeMode="contain" />
            <Text style={[styles.suburbanHeroTitle, { marginBottom: 0 }]}>
              Dakshineswar ⇄ Sealdah Local
            </Text>
          </View>
          <Text style={styles.suburbanHeroSub}>
            Next Train in 4 min • Live 12-Coach Cellular Crowd Heatmap & Smart Boarding Advice
          </Text>

          <View style={styles.suburbanMiniHeatmap}>
            <View style={styles.suburbanMiniCoachItem}>
              <Text style={styles.miniCoachId}>C1</Text>
              <View style={[styles.miniCoachDot, { backgroundColor: '#10B981' }]} />
              <Text style={styles.miniCoachLoad}>28%</Text>
            </View>
            <View style={styles.suburbanMiniCoachItem}>
              <Text style={styles.miniCoachId}>C2</Text>
              <View style={[styles.miniCoachDot, { backgroundColor: '#10B981' }]} />
              <Text style={styles.miniCoachLoad}>35%</Text>
            </View>
            <View style={[styles.suburbanMiniCoachItem, styles.miniCoachBest]}>
              <Text style={styles.miniCoachId}>C3 ⭐</Text>
              <View style={[styles.miniCoachDot, { backgroundColor: '#10B981' }]} />
              <Text style={[styles.miniCoachLoad, { color: '#10B981' }]}>22%</Text>
            </View>
            <View style={styles.suburbanMiniCoachItem}>
              <Text style={styles.miniCoachId}>C4</Text>
              <View style={[styles.miniCoachDot, { backgroundColor: '#EAB308' }]} />
              <Text style={styles.miniCoachLoad}>48%</Text>
            </View>
            <View style={styles.suburbanMiniCoachItem}>
              <Text style={styles.miniCoachId}>C5</Text>
              <View style={[styles.miniCoachDot, { backgroundColor: '#F97316' }]} />
              <Text style={styles.miniCoachLoad}>68%</Text>
            </View>
            <View style={styles.suburbanMiniCoachItem}>
              <Text style={styles.miniCoachId}>C6</Text>
              <View style={[styles.miniCoachDot, { backgroundColor: '#EF4444' }]} />
              <Text style={styles.miniCoachLoad}>74%</Text>
            </View>
            <View style={styles.suburbanMiniCoachItem}>
              <Text style={styles.miniCoachId}>C7</Text>
              <View style={[styles.miniCoachDot, { backgroundColor: '#EAB308' }]} />
              <Text style={styles.miniCoachLoad}>44%</Text>
            </View>
            <View style={styles.suburbanMiniCoachItem}>
              <Text style={styles.miniCoachId}>C8</Text>
              <View style={[styles.miniCoachDot, { backgroundColor: '#10B981' }]} />
              <Text style={styles.miniCoachLoad}>30%</Text>
            </View>
            <View style={[styles.suburbanMiniCoachItem, styles.miniCoachBest]}>
              <Text style={styles.miniCoachId}>C9 ⭐</Text>
              <View style={[styles.miniCoachDot, { backgroundColor: '#10B981' }]} />
              <Text style={[styles.miniCoachLoad, { color: '#10B981' }]}>25%</Text>
            </View>
          </View>

          <View style={styles.suburbanHeroFooter}>
            <Text style={styles.suburbanHeroFooterText}>
              💡 <Text style={{ color: '#10B981', fontWeight: 'bold' }}>Coach C3 & C9</Text> have lowest device density (~16 phone signals).
            </Text>
          </View>
        </TouchableOpacity>

        {/* 4 Core Action Cards (Prompt Requirement) */}
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Intelligence Services</Text>
          <Text style={styles.sectionSubtitle}>AI & IoT Powered</Text>
        </View>

        <View style={styles.actionGrid}>
          {/* 3. Coach Crowd Intelligence */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('CoachCrowd', { trainNumber: '12301' })}
          >
            <View style={[styles.actionIconBox, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
              <Users size={24} color="#A855F7" strokeWidth={2.5} />
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
              <CloudRain size={24} color="#10B981" strokeWidth={2.5} />
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


      </ScrollView>
    </AppBackground>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  contentContainer: {
    padding: 16,
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
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  brandTitle: {
    fontSize: 24,
    fontFamily: 'RussoOne_400Regular',
    color: '#000000',
    letterSpacing: 1,
  },
  brandTitleIo: {
    fontFamily: 'RussoOne_400Regular',
    color: '#FF671F',
  },
  brandSubtitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#FF671F',
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  alertDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    marginTop: 6,
    zIndex: 1,
  },
  heroTextContainer: {
    marginBottom: 4,
    marginTop: 6,
  },
  heroHeadline: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 30,
    letterSpacing: 0.5,
  },
  heroSubheadline: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 6,
    lineHeight: 16,
    fontWeight: '500',
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
    backgroundColor: 'rgba(255, 103, 31, 0.08)',
    top: 20,
  },
  taglineBadge: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFEDD5',
    marginTop: -8,
  },
  taglineText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FF671F',
    letterSpacing: 1.5,
  },
  searchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
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
    color: '#0F172A',
  },
  demoBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  demoBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#059669',
  },
  stationsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  stationInputBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  stationInputLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#64748B',
    letterSpacing: 1,
  },
  stationInput: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    paddingVertical: 2,
  },
  stationCityText: {
    fontSize: 10,
    color: '#64748B',
  },
  swapButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FF671F',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#FF671F',
    shadowOpacity: 0.3,
  },
  swapIcon: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  dateSelector: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginBottom: 14,
  },
  dateLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#64748B',
  },
  dateInput: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0F172A',
    paddingVertical: 2,
  },
  searchCta: {
    backgroundColor: '#FF671F',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#FF671F',
    shadowOpacity: 0.2,
  },
  searchCtaText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  quickServicesScroll: {
    marginTop: 14,
    marginBottom: 4,
  },
  quickServicesContent: {
    gap: 10,
    paddingRight: 10,
  },
  quickServiceCard: {
    width: 110,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
  },
  quickServiceIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    borderWidth: 1,
  },
  quickServiceTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 2,
  },
  quickServiceSub: {
    fontSize: 8,
    color: '#64748B',
    textAlign: 'center',
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
    color: '#0F172A',
  },
  sectionSubtitle: {
    fontSize: 11,
    color: '#FF671F',
    fontWeight: '600',
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  actionCardHighlight: {
    borderColor: '#FED7AA',
    backgroundColor: '#FFFBF5',
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
    color: '#0F172A',
  },
  actionCardSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  actionCardBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F1F5F9',
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
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
  },
  extraFeatureText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#334155',
  },
  statusPillCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
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
    color: '#64748B',
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
    backgroundColor: '#10B981',
  },
  liveTickText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#059669',
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
    color: '#0F172A',
  },
  statusLabel: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 1,
  },
  statusDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },
  aiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    borderRadius: 16,
    padding: 14,
    marginTop: 16,
  },
  aiBannerIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FF671F',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  aiBannerTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  aiBannerSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  aiBannerArrow: {
    fontSize: 18,
    color: '#FF671F',
    fontWeight: 'bold',
    marginLeft: 6,
  },
  suburbanHeroSegment: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    marginBottom: 20,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
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
    borderRadius: 6,
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
    fontWeight: 'bold',
    color: '#059669',
  },
  googleTechBadge: {
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  googleTechBadgeText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#0284C7',
  },
  suburbanHeroArrow: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FF671F',
  },
  suburbanHeroTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  suburbanHeroSub: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 12,
  },
  suburbanMiniHeatmap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  suburbanMiniCoachItem: {
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  miniCoachBest: {
    backgroundColor: '#ECFDF5',
    borderRadius: 6,
    paddingHorizontal: 4,
  },
  miniCoachId: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 2,
  },
  miniCoachDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginBottom: 2,
  },
  miniCoachLoad: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#64748B',
  },
  suburbanHeroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  suburbanHeroFooterText: {
    fontSize: 10,
    color: '#166534',
  },
  cameraNavHeroSegment: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#FF671F',
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#FF671F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  cameraNavHeroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cameraNavBadgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  cameraNavLivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 103, 31, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  cameraNavPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF671F',
  },
  cameraNavLivePillText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#FF671F',
  },
  zeroInfraBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  zeroInfraBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#475569',
  },
  cameraNavHeroArrow: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FF671F',
  },
  cameraNavHeroTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  cameraNavHeroSub: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 12,
  },
  cameraNavFeaturePills: {
    flexDirection: 'row',
    gap: 8,
  },
  cameraNavPillItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  cameraNavPillIcon: {
    fontSize: 12,
  },
  cameraNavPillText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#334155',
  },
});
