import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';

export const SearchTrainScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [from, setFrom] = useState('HWH');
  const [to, setTo] = useState('NDLS');
  const [date, setDate] = useState('Today, 28 Aug');

  const popularRoutes = [
    { from: 'HWH', to: 'NDLS', name: 'Howrah ↔ New Delhi' },
    { from: 'NDLS', to: 'BSB', name: 'New Delhi ↔ Varanasi (Vande Bharat)' },
    { from: 'MMCT', to: 'NDLS', name: 'Mumbai ↔ New Delhi' },
    { from: 'HWH', to: 'MAS', name: 'Howrah ↔ Chennai Central' },
    { from: 'HWH', to: 'RNC', name: 'Howrah ↔ Ranchi (Vande Bharat)' },
  ];

  const handleSearch = () => {
    navigation.navigate('SearchResults', { from, to, date });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Plan Your Train Journey</Text>
        <Text style={styles.subtext}>Search over 20+ express, Rajdhani, and Vande Bharat trains</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Origin Station Code</Text>
          <TextInput
            style={styles.input}
            value={from}
            onChangeText={setFrom}
            placeholder="e.g. HWH"
            placeholderTextColor="#64748B"
            autoCapitalize="characters"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Destination Station Code</Text>
          <TextInput
            style={styles.input}
            value={to}
            onChangeText={setTo}
            placeholder="e.g. NDLS"
            placeholderTextColor="#64748B"
            autoCapitalize="characters"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Journey Date</Text>
          <TextInput
            style={styles.input}
            value={date}
            onChangeText={setDate}
            placeholder="Today"
            placeholderTextColor="#64748B"
          />
        </View>

        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
          <Text style={styles.searchBtnText}>Search Trains with AI Delay Predictor</Text>
        </TouchableOpacity>
      </View>

      {/* 🌟 Suburban Local Trains Special Segment */}
      <View style={styles.suburbanSection}>
        <View style={styles.suburbanHeaderRow}>
          <Text style={styles.suburbanTitle}>🚉 Kolkata Suburban Local Network</Text>
          <View style={styles.livePulseTag}>
            <Text style={styles.livePulseTagText}>CELLULAR TRACKING</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.suburbanCardBtn}
          onPress={() => navigation.navigate('SuburbanLocal', { from: 'DAKE', to: 'SDAH' })}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.suburbanCardTitle}>Dakshineswar ⇄ Sealdah Local</Text>
            <Text style={styles.suburbanCardSub}>
              Live upcoming locals based on current time + 12-coach cellular crowd heatmap
            </Text>
          </View>
          <Text style={styles.suburbanCardArrow}>→</Text>
        </TouchableOpacity>
      </View>

      {/* Popular Routes */}
      <View style={styles.popularSection}>
        <Text style={styles.popularTitle}>Popular High-Speed Corridors</Text>
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
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtext: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#64748B',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#0F172A',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  searchBtn: {
    backgroundColor: '#FF671F',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    elevation: 2,
    shadowColor: '#FF671F',
    shadowOpacity: 0.2,
  },
  searchBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  popularSection: {
    marginTop: 8,
  },
  popularTitle: {
    fontSize: 13,
    fontWeight: 'bold',
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
    fontWeight: '600',
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
    fontWeight: 'bold',
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
    fontWeight: 'bold',
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
