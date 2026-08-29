import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { colors } from '../theme/colors';

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
    backgroundColor: colors.background,
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
    color: colors.text,
  },
  subtext: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.textMuted,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 13,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  searchBtnText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: 'bold',
  },
  popularSection: {
    marginTop: 8,
  },
  popularTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 10,
  },
  routesList: {
    gap: 8,
  },
  routeChip: {
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  routeChipText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '600',
  },
});
