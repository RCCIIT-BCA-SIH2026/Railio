import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { AppBackground } from '../components/AppBackground';
import { useTranslation } from '../context/LanguageContext';
import { StationPickerModal } from '../components/StationPickerModal';
import { getStationByCode } from '../data/stationsData';
import {
  ArrowRightLeft,
  Calendar as CalendarIcon,
  Sparkles,
  ChevronDown,
  Train,
} from 'lucide-react-native';

export const SearchTrainScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { t } = useTranslation();
  const [from, setFrom] = useState('SDAH');
  const [to, setTo] = useState('DKAE');
  const [stationModalType, setStationModalType] = useState<'FROM' | 'TO' | null>(null);

  const fromStationItem = useMemo(() => getStationByCode(from), [from]);
  const toStationItem = useMemo(() => getStationByCode(to), [to]);

  const formatDate = (d: Date) => `Today, ${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`;
  const [dateObj, setDateObj] = useState(new Date());
  const [date, setDate] = useState(() => formatDate(new Date()));
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      if (now.toDateString() !== dateObj.toDateString()) {
        setDateObj(now);
        setDate(formatDate(now));
      }
    }, 60000);
    return () => clearInterval(timer);
  }, [dateObj]);

  const popularRoutes = [
    { from: 'SDAH', to: 'DKAE', name: t('Sealdah ↔ Dankuni Local') },
    { from: 'DKAE', to: 'SDAH', name: t('Dankuni ↔ Sealdah Local') },
    { from: 'DAKE', to: 'SDAH', name: t('Dakshineswar ↔ Sealdah') },
    { from: 'DDJ', to: 'DKAE', name: t('Dum Dum Jn ↔ Dankuni') },
    { from: 'HWH', to: 'NDLS', name: t('Howrah ↔ New Delhi Express') },
    { from: 'CSMT', to: 'PUNE', name: t('Mumbai CSMT ↔ Pune Intercity') },
  ];

  const handleSearch = () => {
    navigation.navigate('SearchResults', { from, to, date });
  };

  const swapStations = () => {
    setFrom(to);
    setTo(from);
  };

  return (
    <AppBackground variant="blue">
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('Plan Your Train Journey', 'Plan Your Train Journey')}</Text>
          <Text style={styles.subtext}>
            {t(
              'Real-time timetable, live GPS ground-truth & AI delay predictions across India',
              'Real-time timetable, live GPS ground-truth & AI delay predictions across India'
            )}
          </Text>
        </View>

        {/* Station Search Card */}
        <View style={styles.card}>
          {/* Station Selection Row */}
          <View style={styles.stationsRow}>
            {/* Origin (FROM) Box */}
            <TouchableOpacity
              style={styles.stationBox}
              onPress={() => setStationModalType('FROM')}
              activeOpacity={0.8}
            >
              <View style={styles.stationHeaderRow}>
                <View style={[styles.indicatorDot, { backgroundColor: '#10B981' }]} />
                <Text style={styles.stationLabel}>{t('FROM (ORIGIN)', 'FROM (ORIGIN)')}</Text>
              </View>

              <View style={styles.codeRow}>
                <Text style={styles.codeText}>{from}</Text>
                <ChevronDown size={14} color="#94A3B8" />
              </View>

              <Text style={styles.cityNameText} numberOfLines={1}>
                {fromStationItem?.name || from}
                {fromStationItem?.city ? `, ${fromStationItem.city}` : ''}
              </Text>
            </TouchableOpacity>

            {/* Swap Button */}
            <TouchableOpacity style={styles.swapBtn} onPress={swapStations} activeOpacity={0.7}>
              <ArrowRightLeft size={16} color="#FF671F" strokeWidth={2.5} />
            </TouchableOpacity>

            {/* Destination (TO) Box */}
            <TouchableOpacity
              style={styles.stationBox}
              onPress={() => setStationModalType('TO')}
              activeOpacity={0.8}
            >
              <View style={styles.stationHeaderRow}>
                <View style={[styles.indicatorDot, { backgroundColor: '#FF671F' }]} />
                <Text style={styles.stationLabel}>{t('TO (DESTINATION)', 'TO (DESTINATION)')}</Text>
              </View>

              <View style={styles.codeRow}>
                <Text style={styles.codeText}>{to}</Text>
                <ChevronDown size={14} color="#94A3B8" />
              </View>

              <Text style={styles.cityNameText} numberOfLines={1}>
                {toStationItem?.name || to}
                {toStationItem?.city ? `, ${toStationItem.city}` : ''}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Quick Route Preset Chips */}
          <View style={styles.quickRoutesRow}>
            {[
              { from: 'SDAH', to: 'DKAE', label: 'SDAH ⇄ DKAE' },
              { from: 'DAKE', to: 'SDAH', label: 'DAKE ⇄ SDAH' },
              { from: 'HWH', to: 'NDLS', label: 'HWH ⇄ NDLS' },
              { from: 'CSMT', to: 'PUNE', label: 'CSMT ⇄ PUNE' },
            ].map((route, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.quickRouteChip,
                  from === route.from && to === route.to && styles.quickRouteChipActive,
                ]}
                onPress={() => {
                  setFrom(route.from);
                  setTo(route.to);
                }}
              >
                <Text
                  style={[
                    styles.quickRouteChipText,
                    from === route.from && to === route.to && styles.quickRouteChipTextActive,
                  ]}
                >
                  {route.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Date Selector Section */}
          <View style={styles.dateContainer}>
            <View style={styles.dateHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <CalendarIcon size={14} color="#64748B" />
                <Text style={styles.dateLabelText}>{t('JOURNEY DATE', 'JOURNEY DATE')}</Text>
              </View>
              <Text style={styles.dateValueText}>{date}</Text>
            </View>

            <View style={styles.datePillsRow}>
              <TouchableOpacity
                style={[styles.datePill, date.startsWith('Today') && styles.datePillActive]}
                onPress={() => {
                  const now = new Date();
                  setDateObj(now);
                  setDate(formatDate(now));
                }}
              >
                <Text style={[styles.datePillText, date.startsWith('Today') && styles.datePillTextActive]}>
                  {t('Today', 'Today')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.datePill, date.startsWith('Tomorrow') && styles.datePillActive]}
                onPress={() => {
                  const tom = new Date();
                  tom.setDate(tom.getDate() + 1);
                  setDateObj(tom);
                  const shortFormatted = tom.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
                  setDate(`Tomorrow, ${shortFormatted}`);
                }}
              >
                <Text style={[styles.datePillText, date.startsWith('Tomorrow') && styles.datePillTextActive]}>
                  {t('Tomorrow', 'Tomorrow')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.datePill,
                  !date.startsWith('Today') && !date.startsWith('Tomorrow') && styles.datePillActive,
                ]}
                onPress={() => setShowDatePicker(true)}
              >
                <Text
                  style={[
                    styles.datePillText,
                    !date.startsWith('Today') && !date.startsWith('Tomorrow') && styles.datePillTextActive,
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
                <Text style={{ fontSize: 18, fontWeight: '800', marginBottom: 16, color: '#0F172A', textAlign: 'center' }}>
                  {t('Select Journey Date', 'Select Journey Date')}
                </Text>

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
                    setDate(isToday ? `Today, ${shortFormatted}` : isTomorrow ? `Tomorrow, ${shortFormatted}` : shortFormatted);
                    setShowDatePicker(false);
                  }}
                  markedDates={{
                    [dateObj.toISOString().split('T')[0]]: { selected: true, selectedColor: '#0284C7' },
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

                <TouchableOpacity
                  onPress={() => setShowDatePicker(false)}
                  style={{ marginTop: 16, alignItems: 'center', padding: 14, backgroundColor: '#F1F5F9', borderRadius: 12 }}
                >
                  <Text style={{ fontWeight: '700', color: '#475569', fontSize: 16 }}>{t('Cancel', 'Cancel')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* Search Button */}
          <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} activeOpacity={0.85}>
            <Sparkles size={16} color="#FFFFFF" />
            <Text style={styles.searchBtnText}>{t('Search Trains with AI Delay Predictor', 'Search Trains with AI Delay Predictor')}</Text>
          </TouchableOpacity>
        </View>

        {/* Suburban Local Trains Segment */}
        <View style={styles.suburbanSection}>
          <View style={styles.suburbanHeaderRow}>
            <Text style={styles.suburbanTitle}>🚉 {t('Kolkata Suburban Local Network', 'Kolkata Suburban Local Network')}</Text>
            <View style={styles.livePulseTag}>
              <Text style={styles.livePulseTagText}>{t('CELLULAR TRACKING', 'CELLULAR TRACKING')}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.suburbanCardBtn}
            onPress={() => navigation.navigate('SuburbanLocal', { from: 'DAKE', to: 'SDAH' })}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.suburbanCardTitle}>{t('Dakshineswar ⇄ Sealdah Local', 'Dakshineswar ⇄ Sealdah Local')}</Text>
              <Text style={styles.suburbanCardSub}>
                {t(
                  'Live upcoming locals based on current time + 12-coach cellular crowd heatmap',
                  'Live upcoming locals based on current time + 12-coach cellular crowd heatmap'
                )}
              </Text>
            </View>
            <Text style={styles.suburbanCardArrow}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Popular Routes */}
        <View style={styles.popularSection}>
          <Text style={styles.popularTitle}>{t('Popular Corridor Segments', 'Popular Corridor Segments')}</Text>
          <View style={styles.routesList}>
            {popularRoutes.map((r, i) => (
              <TouchableOpacity
                key={i}
                style={styles.routeChip}
                onPress={() => {
                  setFrom(r.from);
                  setTo(r.to);
                  navigation.navigate('SearchResults', { from: r.from, to: r.to, date });
                }}
              >
                <Text style={styles.routeChipText}>🚆 {r.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Station Picker Modal */}
      <StationPickerModal
        visible={stationModalType !== null}
        onClose={() => setStationModalType(null)}
        type={stationModalType || 'FROM'}
        currentCode={stationModalType === 'FROM' ? from : to}
        title={
          stationModalType === 'FROM'
            ? t('Select Departure Station', 'Select Departure Station')
            : t('Select Destination Station', 'Select Destination Station')
        }
        onSelectStation={(st) => {
          if (stationModalType === 'FROM') {
            setFrom(st.code);
            setTimeout(() => {
              setStationModalType('TO');
            }, 300);
          } else {
            setTo(st.code);
            setStationModalType(null);
          }
        }}
      />
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
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.3,
  },
  subtext: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 3,
    lineHeight: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  stationsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  stationBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    minHeight: 74,
    justifyContent: 'space-between',
  },
  stationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  indicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stationLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  codeText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  cityNameText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 1,
  },
  swapBtn: {
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
  quickRoutesRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  quickRouteChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickRouteChipActive: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FF671F',
  },
  quickRouteChipText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#475569',
  },
  quickRouteChipTextActive: {
    color: '#FF671F',
    fontWeight: '800',
  },
  dateContainer: {
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
  dateLabelText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  dateValueText: {
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
  searchBtn: {
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
  searchBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  popularSection: {
    marginTop: 8,
  },
  popularTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },
  routesList: {
    gap: 8,
  },
  routeChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.03,
  },
  routeChipText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '700',
  },
  suburbanSection: {
    marginBottom: 20,
  },
  suburbanHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  suburbanTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  livePulseTag: {
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  livePulseTagText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#0284C7',
  },
  suburbanCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    elevation: 2,
    shadowColor: '#0284C7',
    shadowOpacity: 0.08,
  },
  suburbanCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  suburbanCardSub: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },
  suburbanCardArrow: {
    fontSize: 18,
    color: '#FF671F',
    fontWeight: 'bold',
    marginLeft: 10,
  },
});
