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
  Linking,
  Modal,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { VandeBharatHero } from '../components/VandeBharatHero';
import { AppBackground } from '../components/AppBackground';
import { getAlertsApi } from '../services/api';
import { useTranslation } from '../context/LanguageContext';
import { LanguageTopButton } from '../components/LanguageTopButton';
import { Scan, Ticket, Armchair, Building2, Headset, Users, CloudRain, Bell, AlarmClock } from 'lucide-react-native';

export const HomeScreen: React.FC = React.memo(() => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { t } = useTranslation();
  const [fromStation, setFromStation] = useState('SDAH');
  const [toStation, setToStation] = useState('DKAE');
  const formatCurrentJourneyDate = (date: Date) => {
    const shortFormatted = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    return `Today, ${shortFormatted}`;
  };

  const [dateObj, setDateObj] = useState(new Date());
  const [journeyDate, setJourneyDate] = useState(() => formatCurrentJourneyDate(new Date()));
  const [showDatePicker, setShowDatePicker] = useState(false);
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

    // Auto-update date at midnight / background tick
    const timer = setInterval(() => {
      const now = new Date();
      if (now.toDateString() !== dateObj.toDateString()) {
        setDateObj(now);
        setJourneyDate(formatCurrentJourneyDate(now));
      }
    }, 30000);

    return () => {
      task.cancel();
      clearInterval(timer);
    };
  }, [loadAlerts, dateObj]);

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
            <LanguageTopButton variant="glass" />
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
            {t('India Moves', 'India Moves')}{'\n'}
            <Text style={{ color: '#FF671F' }}>{t('With Progress', 'With Progress')}</Text>
          </Text>
          <Text style={styles.heroSubheadline}>
            {t('hero.subheadline', 'Smart Journey. Stronger Connections. Real-time train updates, seamless booking, and a better travel experience for every Indian.')}
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
            <Text style={styles.searchCardTitle}>🔍 {t('search.find_trains', 'Search Train & AI Predictions')}</Text>
            <View style={styles.demoBadge}>
              <Text style={styles.demoBadgeText}>LIVE GPS</Text>
            </View>
          </View>

          {/* From & To Station Row with Swap Button */}
          <View style={styles.stationsRow}>
            <View style={styles.stationInputBox}>
              <Text style={styles.stationInputLabel}>{t('FROM', 'FROM')}</Text>
              <TextInput
                style={styles.stationInput}
                value={fromStation}
                onChangeText={setFromStation}
                placeholder="SDAH"
                placeholderTextColor="#64748B"
                autoCapitalize="characters"
              />
              <Text style={styles.stationCityText}>
                {fromStation === 'SDAH' ? 'Sealdah' : fromStation === 'DKAE' ? 'Dankuni Jn' : fromStation === 'DAKE' ? 'Dakshineswar' : fromStation === 'DDJ' ? 'Dum Dum Jn' : 'Station Code'}
              </Text>
            </View>

            <TouchableOpacity style={styles.swapButton} onPress={swapStations}>
              <Text style={styles.swapIcon}>⇄</Text>
            </TouchableOpacity>

            <View style={styles.stationInputBox}>
              <Text style={styles.stationInputLabel}>{t('TO', 'TO')}</Text>
              <TextInput
                style={styles.stationInput}
                value={toStation}
                onChangeText={setToStation}
                placeholder="DKAE"
                placeholderTextColor="#64748B"
                autoCapitalize="characters"
              />
              <Text style={styles.stationCityText}>
                {toStation === 'DKAE' ? 'Dankuni Jn' : toStation === 'SDAH' ? 'Sealdah' : toStation === 'DAKE' ? 'Dakshineswar' : toStation === 'DDJ' ? 'Dum Dum Jn' : 'Station Code'}
              </Text>
            </View>
          </View>

          {/* Date Selector */}
          <TouchableOpacity style={styles.dateSelector} onPress={() => setShowDatePicker(true)}>
            <Text style={styles.dateLabel}>{t('JOURNEY DATE', 'JOURNEY DATE')}</Text>
            <Text style={[styles.dateInput, { color: '#0F172A', paddingTop: 4 }]}>
              {journeyDate}
            </Text>
          </TouchableOpacity>
          
          <Modal visible={showDatePicker} transparent animationType="slide">
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
              <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 20, overflow: 'hidden' }}>
                <Text style={{ fontSize: 18, fontWeight: '800', marginBottom: 16, color: '#0F172A', textAlign: 'center' }}>Select Journey Date</Text>
                
                <Calendar
                  current={dateObj.toISOString()}
                  minDate={new Date().toISOString()}
                  onDayPress={(day: any) => {
                    const selectedDate = new Date(day.timestamp);
                    setDateObj(selectedDate);
                    
                    const today = new Date();
                    const tomorrow = new Date();
                    tomorrow.setDate(today.getDate() + 1);
                    
                    const isToday = today.toDateString() === selectedDate.toDateString();
                    const isTomorrow = tomorrow.toDateString() === selectedDate.toDateString();
                    
                    const shortFormatted = selectedDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
                    setJourneyDate(isToday ? `Today, ${shortFormatted}` : isTomorrow ? `Tomorrow, ${shortFormatted}` : shortFormatted);
                    setShowDatePicker(false);
                  }}
                  markedDates={{
                    [dateObj.toISOString().split('T')[0]]: { selected: true, selectedColor: '#0284C7' }
                  }}
                  theme={{
                    todayTextColor: '#E11D48',
                    selectedDayBackgroundColor: '#0284C7',
                    arrowColor: '#0284C7',
                    textDayFontWeight: '500',
                    textMonthFontWeight: 'bold',
                    textDayHeaderFontWeight: 'bold',
                  }}
                />

                <TouchableOpacity onPress={() => setShowDatePicker(false)} style={{ marginTop: 16, alignItems: 'center', padding: 14, backgroundColor: '#F1F5F9', borderRadius: 12 }}>
                  <Text style={{ fontWeight: '700', color: '#475569', fontSize: 16 }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* Search CTA */}
          <TouchableOpacity style={styles.searchCta} onPress={handleSearch}>
            <Text style={styles.searchCtaText}>{t('SEARCH TRAINS WITH AI', 'SEARCH TRAINS WITH AI')}</Text>
          </TouchableOpacity>
        </View>

        {/* 3-Card Quick Service Row */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16, paddingHorizontal: 16 }}>
          {/* 1. Live Train Status */}
          <TouchableOpacity
            style={[styles.quickServiceCard, { flex: 1, width: undefined }]}
            onPress={() => navigation.navigate('LiveTrain', { trainNumber: '32216' })}
          >
            <View style={[styles.quickServiceIcon, { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' }]}>
              <Image source={require('../../assets/footer_svg_transparent.png')} style={{ width: 40, height: 40, tintColor: '#0284C7' }} resizeMode="contain" />
            </View>
            <Text style={styles.quickServiceTitle}>{t('Live Train Status', 'Live Train Status')}</Text>
            <Text style={styles.quickServiceSub}>{t('Get real-time updates', 'Get real-time updates')}</Text>
          </TouchableOpacity>

          {/* 2. PNR Enquiry */}
          <TouchableOpacity
            style={[styles.quickServiceCard, { flex: 1, width: undefined }]}
            onPress={() => navigation.navigate('SearchResults', { from: fromStation, to: toStation, date: journeyDate })}
          >
            <View style={[styles.quickServiceIcon, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
              <Ticket size={20} color="#D97706" strokeWidth={2.5} />
            </View>
            <Text style={styles.quickServiceTitle}>{t('PNR Enquiry', 'PNR Enquiry')}</Text>
            <Text style={styles.quickServiceSub}>{t('Check your status', 'Check your status')}</Text>
          </TouchableOpacity>

          {/* 3. VIP Smart Services */}
          <TouchableOpacity
            style={[styles.quickServiceCard, { flex: 1, width: undefined }]}
            onPress={() => navigation.navigate('SmartServices', { trainNumber: '32216' })}
          >
            <View style={[styles.quickServiceIcon, { backgroundColor: '#F3E8FF', borderColor: '#D8B4FE' }]}>
              <AlarmClock size={20} color="#9333EA" strokeWidth={2.5} />
            </View>
            <Text style={styles.quickServiceTitle}>{t('Smart Alarms', 'Smart Alarms')}</Text>
            <Text style={styles.quickServiceSub}>{t('ETA-Synced Alerts', 'ETA-Synced Alerts')}</Text>
          </TouchableOpacity>
        </View>

        {/* Beautiful 24/7 Helpline Area */}
        <View style={{ marginTop: 24, marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 }}>
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFE4E6', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
              <Headset size={18} color="#E11D48" strokeWidth={2.5} />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#881337' }}>
              {t('24/7 Helplines & Emergency', '24/7 Helplines & Emergency')}
            </Text>
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingBottom: 10 }}>
            {[
              { num: '139', title: 'Rail Madad', desc: 'Enquiry, Complaints, PNR & Security', icon: '📞', action: 'tel:139' },
              { num: '14646', title: 'IRCTC Care', desc: 'Tickets, Refund, Booking', icon: '🎫', action: 'tel:14646' },
              { num: '1323', title: 'eCatering', desc: 'Food orders & complaints', icon: '🍲', action: 'tel:1323' },
              { num: '+91 8750001323', title: 'WhatsApp', desc: 'Food ordering support', icon: '💬', action: 'whatsapp://send?phone=918750001323' },
              { num: '112', title: 'Emergency', desc: 'Police, Medical, Fire', icon: '🚨', action: 'tel:112' },
              { num: '1098', title: 'Child Help', desc: 'Help involving children', icon: '👶', action: 'tel:1098' },
              { num: '+91 8044647999', title: 'Intl Support', desc: 'Outside India support', icon: '🌐', action: 'tel:+918044647999' },
            ].map((item, idx) => (
              <TouchableOpacity 
                key={idx} 
                onPress={() => Linking.openURL(item.action).catch(() => {})} 
                style={{
                  backgroundColor: '#FFF1F2',
                  borderRadius: 16,
                  padding: 16,
                  width: 175,
                  borderWidth: 1,
                  borderColor: '#FECDD3',
                  shadowColor: '#E11D48',
                  shadowOpacity: 0.05,
                  shadowRadius: 5,
                  elevation: 1,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                  <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#FFE4E6', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                    <Text style={{ fontSize: 16 }}>{item.icon}</Text>
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#9F1239', flex: 1 }} numberOfLines={1}>{item.title}</Text>
                </View>
                <Text style={{ color: '#BE123C', fontSize: 12, fontWeight: '500', marginBottom: 12, height: 32 }} numberOfLines={2}>
                  {item.desc}
                </Text>
                <View style={{ backgroundColor: '#FFFFFF', paddingVertical: 8, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#FFE4E6' }}>
                  <Text style={{ color: '#E11D48', fontWeight: 'bold', fontSize: 14 }}>{item.num}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>


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
            <Text style={styles.suburbanHeroArrow}>{t('Search Locals →', 'Search Locals →')}</Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <Image source={require('../../assets/logo.png')} style={{ width: 22, height: 22, marginRight: 8 }} resizeMode="contain" />
            <Text style={[styles.suburbanHeroTitle, { marginBottom: 0 }]}>
              {t('Dakshineswar ⇄ Sealdah Local', 'Dakshineswar ⇄ Sealdah Local')}
            </Text>
          </View>
          <Text style={styles.suburbanHeroSub}>
            {t('suburban.desc', 'Next Train in 4 min • Live 12-Coach Cellular Crowd Heatmap & Smart Boarding Advice')}
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
              💡 <Text style={{ color: '#10B981', fontWeight: 'bold' }}>Coach C3 & C9</Text> {t('have lowest device density (~16 phone signals).', 'have lowest device density (~16 phone signals).')}
            </Text>
          </View>
        </TouchableOpacity>

        {/* 4 Core Action Cards (Prompt Requirement) */}
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>{t('Intelligence Services', 'Intelligence Services')}</Text>
          <Text style={styles.sectionSubtitle}>{t('AI & IoT Powered', 'AI & IoT Powered')}</Text>
        </View>

        <View style={styles.actionGrid}>
          {/* Coach Crowd Intelligence */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('CoachCrowd', { trainNumber: '32216' })}
          >
            <View style={[styles.actionIconBox, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
              <Users size={24} color="#A855F7" strokeWidth={2.5} />
            </View>
            <Text style={styles.actionCardTitle}>{t('Coach Crowd', 'Coach Crowd')}</Text>
            <Text style={styles.actionCardSub}>{t('Least Density Finder', 'Least Density Finder')}</Text>
            <View style={styles.actionCardBadge}>
              <Text style={[styles.actionCardBadgeText, { color: '#A855F7' }]}>CV Heatmap</Text>
            </View>
          </TouchableOpacity>

          {/* Weather Intelligence */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('WeatherIntelligence', { stationCode: 'SDAH' })}
          >
            <View style={[styles.actionIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <CloudRain size={24} color="#10B981" strokeWidth={2.5} />
            </View>
            <Text style={styles.actionCardTitle}>{t('Weather', 'Weather')}</Text>
            <Text style={styles.actionCardSub}>{t('Rain & Delay Impact', 'Rain & Delay Impact')}</Text>
            <View style={styles.actionCardBadge}>
              <Text style={[styles.actionCardBadgeText, { color: '#10B981' }]}>Live Radar</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Beautiful Station Board Card */}
        <TouchableOpacity
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            padding: 16,
            marginTop: 14,
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: '#E2E8F0',
            shadowColor: '#000',
            shadowOpacity: 0.05,
            shadowRadius: 5,
            elevation: 2,
          }}
          onPress={() => navigation.navigate('StationArrivalBoard', { stationCode: 'HWH' })}
        >
          <View style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            backgroundColor: '#F0F9FF',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 14,
          }}>
            <Building2 size={24} color="#0284C7" strokeWidth={2.5} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#1E293B', marginBottom: 4 }}>
              {t('Live Station Board', 'Live Station Board')}
            </Text>
            <Text style={{ fontSize: 13, color: '#64748B', fontWeight: '500' }}>
              {t('Real-time arrivals & departures', 'Real-time arrivals & departures')}
            </Text>
          </View>
          <View style={{
            backgroundColor: '#F8FAFC',
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: '#E2E8F0',
          }}>
            <Text style={{ color: '#0284C7', fontSize: 12, fontWeight: '700' }}>{t('View', 'View')}</Text>
          </View>
        </TouchableOpacity>

        {/* Live Railway Network Status Bar */}
        <View style={styles.statusPillCard}>
          <View style={styles.statusPillHeader}>
            <Text style={styles.statusPillTitle}>{t('LIVE RAILWAY STATUS', 'LIVE RAILWAY STATUS')}</Text>
            <View style={styles.liveTick}>
              <View style={styles.greenPulse} />
              <Text style={styles.liveTickText}>LIVE</Text>
            </View>
          </View>

          <View style={styles.statusPillRow}>
            <View style={styles.statusItem}>
              <Text style={styles.statusNumber}>40</Text>
              <Text style={styles.statusLabel}>{t('Active Trains', 'Active Trains')}</Text>
            </View>
            <View style={styles.statusDivider} />
            <View style={styles.statusItem}>
              <Text style={[styles.statusNumber, { color: '#F59E0B' }]}>6</Text>
              <Text style={styles.statusLabel}>{t('Delayed', 'Delayed')}</Text>
            </View>
            <View style={styles.statusDivider} />
            <View style={styles.statusItem}>
              <Text style={[styles.statusNumber, { color: '#EF4444' }]}>1</Text>
              <Text style={styles.statusLabel}>{t('Critical Risks', 'Critical Risks')}</Text>
            </View>
            <View style={styles.statusDivider} />
            <View style={styles.statusItem}>
              <Text style={[styles.statusNumber, { color: '#10B981' }]}>92%</Text>
              <Text style={styles.statusLabel}>{t('Punctual', 'Punctual')}</Text>
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
  },
  heroSection: {
    position: 'relative',
    height: 160,
    marginVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroGlow: {
    position: 'absolute',
    width: 260,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 103, 31, 0.15)',
    top: 40,
  },
  searchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  searchCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  searchCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  demoBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
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
    borderColor: '#E2E8F0',
  },
  stationInputLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#64748B',
    marginBottom: 2,
  },
  stationInput: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    padding: 0,
  },
  stationCityText: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  swapButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
  },
  swapIcon: {
    fontSize: 18,
    color: '#FF671F',
    fontWeight: 'bold',
  },
  dateSelector: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  dateLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#64748B',
    marginBottom: 2,
  },
  dateInput: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    padding: 0,
  },
  searchCta: {
    backgroundColor: '#FF671F',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#FF671F',
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  searchCtaText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  quickServicesScroll: {
    marginHorizontal: -16,
    marginBottom: 16,
  },
  quickServicesContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  quickServiceCard: {
    width: 105,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  quickServiceIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
  },
  quickServiceTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  quickServiceSub: {
    fontSize: 8.5,
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
  cameraNavHeroSegment: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#FF671F',
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
});
