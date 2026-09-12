import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  FlatList,
  Platform,
  KeyboardAvoidingView,
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Search,
  X,
  MapPin,
  Train,
  Clock,
  Flame,
  Check,
  Building2,
  ArrowRight,
  Compass,
} from 'lucide-react-native';
import {
  StationItem,
  searchStations,
  ALL_INDIAN_STATIONS,
  getStationByCode,
} from '../data/stationsData';
import { useTranslation } from '../context/LanguageContext';

interface StationPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectStation: (station: StationItem) => void;
  title?: string;
  placeholder?: string;
  currentCode?: string;
  type?: 'FROM' | 'TO';
}

const RECENT_STATIONS_KEY = '@railio_recent_stations_v1';

export const StationPickerModal: React.FC<StationPickerModalProps> = ({
  visible,
  onClose,
  onSelectStation,
  title = 'Select Station',
  placeholder = 'Type station name, code, or city...',
  currentCode,
  type = 'FROM',
}) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [recentCodes, setRecentCodes] = useState<string[]>(['SDAH', 'DKAE', 'HWH', 'NDLS']);
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'POPULAR' | 'SUBURBAN' | 'METRO'>('ALL');
  const inputRef = useRef<TextInput>(null);

  // Load recent searches on open
  useEffect(() => {
    if (visible) {
      setQuery('');
      setSelectedFilter('ALL');
      loadRecentStations();
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [visible]);

  const loadRecentStations = async () => {
    try {
      const stored = await AsyncStorage.getItem(RECENT_STATIONS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRecentCodes(parsed);
        }
      }
    } catch {
      // ignore
    }
  };

  const saveRecentStation = async (code: string) => {
    try {
      const updated = [code, ...recentCodes.filter((c) => c !== code)].slice(0, 6);
      setRecentCodes(updated);
      await AsyncStorage.setItem(RECENT_STATIONS_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const clearRecentStations = async () => {
    try {
      setRecentCodes([]);
      await AsyncStorage.removeItem(RECENT_STATIONS_KEY);
    } catch {
      // ignore
    }
  };

  // Filtered stations based on query & category filter
  const filteredStations = useMemo(() => {
    let results = searchStations(query, 40);

    if (selectedFilter === 'POPULAR') {
      results = results.filter((s) => s.isPopular);
    } else if (selectedFilter === 'SUBURBAN') {
      results = results.filter((s) => s.category === 'SUBURBAN');
    } else if (selectedFilter === 'METRO') {
      results = results.filter((s) => s.category === 'METRO' || s.isJunction);
    }

    return results;
  }, [query, selectedFilter]);

  const handleSelect = (station: StationItem) => {
    saveRecentStation(station.code);
    onSelectStation(station);
    onClose();
  };

  const recentStationObjects = useMemo(() => {
    return recentCodes
      .map((c) => getStationByCode(c))
      .filter((s): s is StationItem => Boolean(s));
  }, [recentCodes]);

  const highlightMatch = (text: string, matchQuery: string) => {
    if (!matchQuery || matchQuery.trim().length === 0) {
      return <Text style={styles.stationNameText}>{text}</Text>;
    }

    const q = matchQuery.trim();
    const index = text.toLowerCase().indexOf(q.toLowerCase());

    if (index === -1) {
      return <Text style={styles.stationNameText}>{text}</Text>;
    }

    const before = text.substring(0, index);
    const matched = text.substring(index, index + q.length);
    const after = text.substring(index + q.length);

    return (
      <Text style={styles.stationNameText}>
        {before}
        <Text style={styles.highlightText}>{matched}</Text>
        {after}
      </Text>
    );
  };

  const renderStationItem = ({ item }: { item: StationItem }) => {
    const isSelected = item.code.toUpperCase() === currentCode?.toUpperCase();

    return (
      <TouchableOpacity
        style={[styles.stationCard, isSelected && styles.stationCardSelected]}
        onPress={() => handleSelect(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconBox, item.category === 'SUBURBAN' && styles.iconBoxSuburban]}>
          <Train
            size={20}
            color={item.category === 'SUBURBAN' ? '#0284C7' : '#FF671F'}
            strokeWidth={2.2}
          />
        </View>

        <View style={styles.stationInfo}>
          <View style={styles.stationNameRow}>
            {highlightMatch(item.name, query)}
            {item.isJunction && (
              <View style={styles.junctionBadge}>
                <Text style={styles.junctionBadgeText}>JN</Text>
              </View>
            )}
          </View>

          <Text style={styles.stationMetaText} numberOfLines={1}>
            {item.city}, {item.state} • <Text style={{ color: '#0284C7', fontWeight: '700' }}>{item.zone}</Text> • {item.platforms} {t('Platforms', 'Platforms')}
          </Text>
        </View>

        <View style={styles.codeContainer}>
          <View style={[styles.codeBadge, isSelected && styles.codeBadgeSelected]}>
            <Text style={[styles.codeBadgeText, isSelected && styles.codeBadgeTextSelected]}>
              {item.code}
            </Text>
          </View>
          {isSelected && (
            <View style={styles.checkIcon}>
              <Check size={14} color="#10B981" strokeWidth={3} />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View>
      {/* Category Pills */}
      <View style={styles.filterPillsRow}>
        <TouchableOpacity
          style={[styles.filterPill, selectedFilter === 'ALL' && styles.filterPillActive]}
          onPress={() => setSelectedFilter('ALL')}
        >
          <Text style={[styles.filterPillText, selectedFilter === 'ALL' && styles.filterPillTextActive]}>
            {t('All Stations', 'All Stations')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterPill, selectedFilter === 'SUBURBAN' && styles.filterPillActive]}
          onPress={() => setSelectedFilter('SUBURBAN')}
        >
          <Text style={[styles.filterPillText, selectedFilter === 'SUBURBAN' && styles.filterPillTextActive]}>
            🚆 {t('Suburban Corridor', 'Suburban Corridor')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterPill, selectedFilter === 'POPULAR' && styles.filterPillActive]}
          onPress={() => setSelectedFilter('POPULAR')}
        >
          <Text style={[styles.filterPillText, selectedFilter === 'POPULAR' && styles.filterPillTextActive]}>
            🔥 {t('Popular Junctions', 'Popular Junctions')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Quick Suggestions / Recent Searches when query is empty */}
      {query.trim().length === 0 && (
        <View style={styles.quickSection}>
          {recentStationObjects.length > 0 && (
            <View style={styles.recentBlock}>
              <View style={styles.sectionHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Clock size={15} color="#64748B" />
                  <Text style={styles.sectionHeading}>{t('Recent Searches', 'Recent Searches')}</Text>
                </View>
                <TouchableOpacity onPress={clearRecentStations}>
                  <Text style={styles.clearRecentText}>{t('Clear', 'Clear')}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.chipsContainer}>
                {recentStationObjects.map((station) => (
                  <TouchableOpacity
                    key={station.code}
                    style={styles.recentChip}
                    onPress={() => handleSelect(station)}
                  >
                    <Text style={styles.recentChipCode}>{station.code}</Text>
                    <Text style={styles.recentChipName} numberOfLines={1}>
                      {station.name.split(' ')[0]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Popular Hubs Grid */}
          <View style={styles.popularHubsBlock}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Flame size={15} color="#FF671F" />
              <Text style={styles.sectionHeading}>{t('Major Travel Hubs', 'Major Travel Hubs')}</Text>
            </View>

            <View style={styles.hubChipsGrid}>
              {[
                { code: 'SDAH', name: 'Sealdah' },
                { code: 'DKAE', name: 'Dankuni' },
                { code: 'DAKE', name: 'Dakshineswar' },
                { code: 'DDJ', name: 'Dum Dum' },
                { code: 'HWH', name: 'Howrah' },
                { code: 'NDLS', name: 'New Delhi' },
                { code: 'CSMT', name: 'Mumbai CSMT' },
                { code: 'MAS', name: 'Chennai Central' },
                { code: 'SBC', name: 'Bengaluru' },
                { code: 'PNBE', name: 'Patna' },
              ].map((hub) => (
                <TouchableOpacity
                  key={hub.code}
                  style={styles.hubChip}
                  onPress={() => {
                    const st = getStationByCode(hub.code);
                    if (st) handleSelect(st);
                  }}
                >
                  <Text style={styles.hubChipCode}>{hub.code}</Text>
                  <Text style={styles.hubChipName}>{hub.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, marginBottom: 6 }}>
            <Compass size={15} color="#64748B" />
            <Text style={styles.sectionHeading}>{t('All Stations Directory', 'All Stations Directory')}</Text>
          </View>
        </View>
      )}
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.container}
        >
          {/* Top Bar */}
          <View style={styles.topBar}>
            <View style={styles.topBarLeft}>
              <View
                style={[
                  styles.typeIndicator,
                  { backgroundColor: type === 'FROM' ? '#10B981' : '#FF671F' },
                ]}
              />
              <View>
                <Text style={styles.modalTitle}>
                  {type === 'FROM'
                    ? t('Select Departure Station', 'Select Departure Station')
                    : t('Select Destination Station', 'Select Destination Station')}
                </Text>
                <Text style={styles.modalSub}>
                  {type === 'FROM'
                    ? t('Where are you starting from?', 'Where are you starting from?')
                    : t('Where do you want to travel to?', 'Where do you want to travel to?')}
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color="#0F172A" />
            </TouchableOpacity>
          </View>

          {/* Search Input Box */}
          <View style={styles.searchBarWrapper}>
            <View style={styles.searchBar}>
              <Search size={19} color="#FF671F" strokeWidth={2.5} style={styles.searchIcon} />
              <TextInput
                ref={inputRef}
                style={styles.searchInput}
                value={query}
                onChangeText={setQuery}
                placeholder={placeholder}
                placeholderTextColor="#94A3B8"
                autoCapitalize="characters"
                autoCorrect={false}
                clearButtonMode="while-editing"
              />
              {query.length > 0 && (
                <TouchableOpacity
                  style={styles.clearBtn}
                  onPress={() => setQuery('')}
                >
                  <X size={16} color="#64748B" />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.resultCountRow}>
              <Text style={styles.resultCountText}>
                {filteredStations.length}{' '}
                {filteredStations.length === 1 ? t('station found', 'station found') : t('stations found', 'stations found')}
              </Text>
              {query.length > 0 && (
                <Text style={styles.typingHint}>
                  {t('Searching by code, city & name', 'Searching by code, city & name')}
                </Text>
              )}
            </View>
          </View>

          {/* Station List */}
          <FlatList
            data={filteredStations}
            keyExtractor={(item) => item.code}
            renderItem={renderStationItem}
            ListHeaderComponent={renderHeader}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Building2 size={44} color="#CBD5E1" strokeWidth={1.5} />
                <Text style={styles.emptyTitle}>
                  {t('No stations found for', 'No stations found for')} "{query}"
                </Text>
                <Text style={styles.emptySub}>
                  {t('Try searching with station code (e.g. SDAH, DKAE, HWH) or city name (e.g. Kolkata, Delhi)', 'Try searching with station code (e.g. SDAH, DKAE, HWH) or city name (e.g. Kolkata, Delhi)')}
                </Text>
              </View>
            }
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  typeIndicator: {
    width: 8,
    height: 32,
    borderRadius: 4,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBarWrapper: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    height: '100%',
  },
  clearBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  resultCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  typingHint: {
    fontSize: 10,
    color: '#0284C7',
    fontWeight: '600',
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 12,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterPillActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  quickSection: {
    marginBottom: 8,
  },
  recentBlock: {
    marginBottom: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  clearRecentText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E11D48',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.03,
  },
  recentChipCode: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FF671F',
  },
  recentChipName: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  popularHubsBlock: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 6,
  },
  hubChipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hubChip: {
    width: '31%',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  hubChipCode: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0F172A',
  },
  hubChipName: {
    fontSize: 9.5,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  stationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  stationCardSelected: {
    borderColor: '#FF671F',
    backgroundColor: '#FFF7ED',
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconBoxSuburban: {
    backgroundColor: '#F0F9FF',
  },
  stationInfo: {
    flex: 1,
  },
  stationNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  stationNameText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  highlightText: {
    backgroundColor: '#FEF08A',
    color: '#854D0E',
    fontWeight: '900',
  },
  junctionBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  junctionBadgeText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#475569',
  },
  stationMetaText: {
    fontSize: 10.5,
    color: '#64748B',
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 8,
  },
  codeBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  codeBadgeSelected: {
    backgroundColor: '#FF671F',
    borderColor: '#FF671F',
  },
  codeBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  codeBadgeTextSelected: {
    color: '#FFFFFF',
  },
  checkIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 12,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 16,
  },
});
