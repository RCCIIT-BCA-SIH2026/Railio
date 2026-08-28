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
    backgroundColor: '#07162C',
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
    color: '#FFFFFF',
  },
  subtext: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  card: {
    backgroundColor: 'rgba(19, 47, 86, 0.75)',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#94A3B8',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#07162C',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#1E4273',
  },
  searchBtn: {
    backgroundColor: '#FF671F',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
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
    color: '#FFFFFF',
    marginBottom: 10,
  },
  routesList: {
    gap: 8,
  },
  routeChip: {
    backgroundColor: 'rgba(11, 37, 69, 0.8)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E4273',
  },
  routeChipText: {
    fontSize: 12,
    color: '#CBD5E1',
    fontWeight: '600',
  },
});
