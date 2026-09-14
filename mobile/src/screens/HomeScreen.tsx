import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { StationPickerModal } from '../components/StationPickerModal';
import { getStationByCode, StationItem } from '../data/stationsData';
import { liveNavigationService } from '../services/navigation/LiveNavigationService';
import {
  Scan,
  Ticket,
  Armchair,
  Building2,
  Headset,
  Users,
  CloudRain,
  Bell,
  AlarmClock,
  ArrowRightLeft,
  Calendar as CalendarIcon,
  Sparkles,
  MapPin,
  ChevronDown,
  ShieldAlert,
  PhoneCall,
  X,
  MessageCircle,
} from 'lucide-react-native';

export const HomeScreen: React.FC = React.memo(() => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { t } = useTranslation();
  const [fromStation, setFromStation] = useState('SDAH');
  const [toStation, setToStation] = useState('DKAE');
  const [stationModalType, setStationModalType] = useState<'FROM' | 'TO' | null>(null);
  const [showSosModal, setShowSosModal] = useState(false);

  const fromStationItem = useMemo(() => getStationByCode(fromStation), [fromStation]);
  const toStationItem = useMemo(() => getStationByCode(toStation), [toStation]);

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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Sparkles size={16} color="#FF671F" />
              <Text style={styles.searchCardTitle}>{t('search.find_trains', 'Search Trains & AI Predictions')}</Text>
            </View>
            <View style={styles.demoBadge}>
              <Text style={styles.demoBadgeText}>LIVE GPS • ML 2.0</Text>
            </View>
          </View>

          {/* From & To Interactive Cards with Animated Swap Button */}
          <View style={styles.stationsRow}>
            {/* FROM Station Box */}
            <TouchableOpacity
              style={styles.stationInputBox}
              onPress={() => setStationModalType('FROM')}
              activeOpacity={0.8}
            >
              <View style={styles.stationLabelRow}>
                <View style={[styles.stationIndicatorDot, { backgroundColor: '#10B981' }]} />
                <Text style={styles.stationInputLabel}>{t('FROM (SOURCE)', 'FROM (SOURCE)')}</Text>
              </View>

              <View style={styles.stationCodeRow}>
                <Text style={styles.stationCodeText}>{fromStation}</Text>
                <ChevronDown size={14} color="#94A3B8" />
              </View>

              <Text style={styles.stationCityText} numberOfLines={1}>
                {fromStationItem?.name || fromStation}
                {fromStationItem?.city ? `, ${fromStationItem.city}` : ''}
              </Text>
            </TouchableOpacity>

            {/* Swap Button */}
            <TouchableOpacity style={styles.swapButton} onPress={swapStations} activeOpacity={0.7}>
              <ArrowRightLeft size={16} color="#FF671F" strokeWidth={2.5} />
            </TouchableOpacity>

            {/* TO Station Box */}
            <TouchableOpacity
              style={styles.stationInputBox}
              onPress={() => setStationModalType('TO')}
              activeOpacity={0.8}
            >
              <View style={styles.stationLabelRow}>
                <View style={[styles.stationIndicatorDot, { backgroundColor: '#FF671F' }]} />
                <Text style={styles.stationInputLabel}>{t('TO (DESTINATION)', 'TO (DESTINATION)')}</Text>
              </View>

              <View style={styles.stationCodeRow}>
                <Text style={styles.stationCodeText}>{toStation}</Text>
                <ChevronDown size={14} color="#94A3B8" />
              </View>

              <Text style={styles.stationCityText} numberOfLines={1}>
                {toStationItem?.name || toStation}
                {toStationItem?.city ? `, ${toStationItem.city}` : ''}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Quick Corridor Chips */}
          <View style={styles.quickCorridorsRow}>
            {[
              { from: 'SDAH', to: 'DKAE', label: 'SDAH ⇄ DKAE' },
              { from: 'DAKE', to: 'SDAH', label: 'DAKE ⇄ SDAH' },
              { from: 'HWH', to: 'NDLS', label: 'HWH ⇄ NDLS' },
              { from: 'CSMT', to: 'PUNE', label: 'CSMT ⇄ PUNE' },
            ].map((route, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.corridorChip,
                  fromStation === route.from && toStation === route.to && styles.corridorChipActive,
                ]}
                onPress={() => {
                  setFromStation(route.from);
                  setToStation(route.to);
                }}
              >
                <Text
                  style={[
                    styles.corridorChipText,
                    fromStation === route.from && toStation === route.to && styles.corridorChipTextActive,
                  ]}
                >
                  {route.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Date Selector with Quick Pills */}
          <View style={styles.dateSelectorContainer}>
            <View style={styles.dateHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <CalendarIcon size={14} color="#64748B" />
                <Text style={styles.dateLabel}>{t('JOURNEY DATE', 'JOURNEY DATE')}</Text>
              </View>
              <Text style={styles.currentDateValue}>{journeyDate}</Text>
            </View>

            <View style={styles.datePillsRow}>
              <TouchableOpacity
                style={[
                  styles.datePill,
                  journeyDate.startsWith('Today') && styles.datePillActive,
                ]}
                onPress={() => {
                  const now = new Date();
                  setDateObj(now);
                  setJourneyDate(formatCurrentJourneyDate(now));
                }}
              >
                <Text style={[styles.datePillText, journeyDate.startsWith('Today') && styles.datePillTextActive]}>
                  {t('Today', 'Today')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.datePill,
                  journeyDate.startsWith('Tomorrow') && styles.datePillActive,
                ]}
                onPress={() => {
                  const tom = new Date();
                  tom.setDate(tom.getDate() + 1);
                  setDateObj(tom);
                  const shortFormatted = tom.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
                  setJourneyDate(`Tomorrow, ${shortFormatted}`);
                }}
              >
                <Text style={[styles.datePillText, journeyDate.startsWith('Tomorrow') && styles.datePillTextActive]}>
                  {t('Tomorrow', 'Tomorrow')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.datePill,
                  !journeyDate.startsWith('Today') && !journeyDate.startsWith('Tomorrow') && styles.datePillActive,
                ]}
                onPress={() => setShowDatePicker(true)}
              >
                <Text
                  style={[
                    styles.datePillText,
                    !journeyDate.startsWith('Today') && !journeyDate.startsWith('Tomorrow') && styles.datePillTextActive,
                  ]}
                >
                  📅 {t('Select Date', 'Select Date')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <Modal visible={showDatePicker} transparent animationType="slide">
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
              <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 20, overflow: 'hidden' }}>
                <Text style={{ fontSize: 18, fontWeight: '800', marginBottom: 16, color: '#0F172A', textAlign: 'center' }}>{t('Select Journey Date', 'Select Journey Date')}</Text>
                
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
                  <Text style={{ fontWeight: '700', color: '#475569', fontSize: 16 }}>{t('Cancel', 'Cancel')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* Search CTA */}
          <TouchableOpacity style={styles.searchCta} onPress={handleSearch} activeOpacity={0.85}>
            <Sparkles size={16} color="#FFFFFF" />
            <Text style={styles.searchCtaText}>{t('SEARCH TRAINS WITH AI', 'SEARCH TRAINS WITH AI')}</Text>
          </TouchableOpacity>
        </View>



        {/* 🚨 Sleek Clickable 24/7 SOS Button */}
        <View style={{ alignItems: 'center', marginVertical: 14 }}>
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              backgroundColor: '#E11D48',
              paddingHorizontal: 28,
              paddingVertical: 14,
              borderRadius: 30,
              shadowColor: '#E11D48',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 8,
              elevation: 5,
              borderWidth: 1.5,
              borderColor: '#FDA4AF',
            }}
            onPress={() => setShowSosModal(true)}
            activeOpacity={0.8}
          >
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' }} />
            <ShieldAlert size={22} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '900', letterSpacing: 0.8 }}>
              {t('24/7 SOS HELPLINES', '24/7 SOS HELPLINES')}
            </Text>
          </TouchableOpacity>
        </View>




        {/* 4 Core Action Cards (Prompt Requirement) */}
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>{t('Intelligence Services', 'Intelligence Services')}</Text>
        </View>

        <View style={styles.actionGrid}>
          {/* Live Station Board */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('StationArrivalBoard', { stationCode: 'HWH' })}
          >
            <View style={[styles.actionIconBox, { backgroundColor: 'rgba(2, 132, 199, 0.15)' }]}>
              <Building2 size={24} color="#0284C7" strokeWidth={2.5} />
            </View>
            <Text style={styles.actionCardTitle}>{t('Live Station Board', 'Live Station Board')}</Text>
            <Text style={styles.actionCardSub}>{t('Arrivals & Departures', 'Arrivals & Departures')}</Text>
            <View style={styles.actionCardBadge}>
              <Text style={[styles.actionCardBadgeText, { color: '#0284C7' }]}>Live Board</Text>
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
      </ScrollView>

      {/* Real-time Station Autocomplete & Directory Picker Modal */}
      <StationPickerModal
        visible={stationModalType !== null}
        onClose={() => setStationModalType(null)}
        type={stationModalType || 'FROM'}
        currentCode={stationModalType === 'FROM' ? fromStation : toStation}
        title={
          stationModalType === 'FROM'
            ? t('Select Departure Station', 'Select Departure Station')
            : t('Select Destination Station', 'Select Destination Station')
        }
        onSelectStation={(st) => {
          if (stationModalType === 'FROM') {
            setFromStation(st.code);
            // Seamless auto-flow: Automatically prompt TO station picker if user is selecting journey
            setTimeout(() => {
              setStationModalType('TO');
            }, 300);
          } else {
            setToStation(st.code);
            setStationModalType(null);
          }
        }}
      />

      {/* 🚨 SOS EMERGENCY & 24/7 HELPLINES MODAL */}
      <Modal visible={showSosModal} transparent animationType="slide" onRequestClose={() => setShowSosModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.75)', justifyContent: 'flex-end' }}>
          <View style={{
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 20,
            maxHeight: '85%',
            elevation: 20,
          }}>
            {/* Modal Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF1F2', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldAlert size={20} color="#E11D48" strokeWidth={2.5} />
                </View>
                <View>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: '#0F172A' }}>24/7 Helplines & SOS</Text>
                  <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '500' }}>Tap any helpline for instant call or WhatsApp support</Text>
                </View>
              </View>

              <TouchableOpacity onPress={() => setShowSosModal(false)} style={{ padding: 8, backgroundColor: '#F1F5F9', borderRadius: 20 }}>
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Helplines List */}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 20 }}>
              {[
                { num: '139', title: 'Rail Madad Hotline', desc: 'Enquiry, Complaints, PNR, Security & Medical', icon: <PhoneCall size={18} color="#E11D48" />, isWhatsApp: false, action: 'tel:139' },
                { num: '112', title: 'National Emergency', desc: 'Police, Medical Ambulance & Fire Services', icon: <ShieldAlert size={18} color="#E11D48" />, isWhatsApp: false, action: 'tel:112' },
                { num: '14646', title: 'IRCTC Customer Care', desc: 'Train Tickets, Refund & E-Booking Assistance', icon: <Headset size={18} color="#0284C7" />, isWhatsApp: false, action: 'tel:14646' },
                { num: '1323', title: 'eCatering Food Support', desc: 'In-train food order helpline & quality complaints', icon: <PhoneCall size={18} color="#F59E0B" />, isWhatsApp: false, action: 'tel:1323' },
                { num: '+91 8750001323', title: 'WhatsApp Food & Support', desc: 'Order food on track & instant chat assistance', icon: <MessageCircle size={18} color="#25D366" />, isWhatsApp: true, action: 'whatsapp://send?phone=918750001323' },
                { num: '1098', title: 'Childline Emergency', desc: 'National hotline for child protection & assistance', icon: <PhoneCall size={18} color="#8B5CF6" />, isWhatsApp: false, action: 'tel:1098' },
                { num: '+91 8044647999', title: 'International Tourist Support', desc: 'Support for international travelers & non-Indian SIMs', icon: <PhoneCall size={18} color="#059669" />, isWhatsApp: false, action: 'tel:+918044647999' },
              ].map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => {
                    Linking.openURL(item.action).catch(() => {
                      if (item.isWhatsApp) {
                        Linking.openURL('https://wa.me/918750001323');
                      }
                    });
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#F8FAFC',
                    borderRadius: 16,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    gap: 12,
                  }}
                  activeOpacity={0.7}
                >
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: item.isWhatsApp ? '#DCFCE7' : '#FFF1F2', alignItems: 'center', justifyContent: 'center' }}>
                    {item.icon}
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A', marginBottom: 2 }}>{item.title}</Text>
                    <Text style={{ fontSize: 11, color: '#64748B' }}>{item.desc}</Text>
                  </View>

                  <View style={{
                    backgroundColor: item.isWhatsApp ? '#25D366' : '#0F172A',
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: 10,
                  }}>
                    <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12 }}>{item.isWhatsApp ? 'WhatsApp' : `Call ${item.num}`}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    marginBottom: 10,
  },
  stationInputBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    minHeight: 74,
    justifyContent: 'space-between',
  },
  stationLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  stationIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stationInputLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  stationCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  stationCodeText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  stationCityText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 1,
  },
  swapButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#FF671F',
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  quickCorridorsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  corridorChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  corridorChipActive: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FF671F',
  },
  corridorChipText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#475569',
  },
  corridorChipTextActive: {
    color: '#FF671F',
    fontWeight: '800',
  },
  dateSelectorContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  dateHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dateLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  currentDateValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  datePillsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  datePill: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePillActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  datePillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#334155',
  },
  datePillTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  searchCta: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#FF671F',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#FF671F',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
  },
  searchCtaText: {
    color: '#FFFFFF',
    fontSize: 12.5,
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
