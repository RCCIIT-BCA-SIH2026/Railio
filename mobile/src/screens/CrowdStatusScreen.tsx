import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { AppBackground } from '../components/AppBackground';

export const CrowdStatusScreen: React.FC = () => {
  const [selectedStation, setSelectedStation] = useState('HWH');

  const platforms = [
    { num: 1, density: 91, status: 'RED', count: 480, label: 'Suburban Entry Surge' },
    { num: 2, density: 54, status: 'YELLOW', count: 210, label: 'Normal Boarding Flow' },
    { num: 3, density: 21, status: 'GREEN', count: 85, label: 'Lowest Crowd (Optimal)' },
    { num: 9, density: 84, status: 'RED', count: 410, label: 'Rajdhani Express Boarding' },
    { num: 21, density: 73, status: 'YELLOW', count: 320, label: 'Coromandel Express Loading' },
  ];

  return (
    <AppBackground variant="blue">
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <Text style={styles.title}>Station Platform Crowd Density</Text>
        <Text style={styles.subtext}>
          Computer vision CCTV person count & platform capacity distribution
        </Text>
      </View>

      <View style={styles.platformsContainer}>
        {platforms.map((p) => {
          const isRed = p.status === 'RED';
          const isYellow = p.status === 'YELLOW';
          const color = isRed ? '#EF4444' : isYellow ? '#F59E0B' : '#10B981';

          return (
            <View key={p.num} style={styles.platformCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.pfTitle}>Platform {p.num}</Text>
                <View style={[styles.badge, { backgroundColor: `${color}20`, borderColor: `${color}40` }]}>
                  <Text style={[styles.badgeText, { color }]}>{p.density}% Occupancy</Text>
                </View>
              </View>

              <View style={styles.barBackground}>
                <View style={[styles.barFill, { width: `${p.density}%`, backgroundColor: color }]} />
              </View>

              <View style={styles.cardFooter}>
                <Text style={styles.countText}>{p.count} People Estimated</Text>
                <Text style={styles.labelText}>{p.label}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
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
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtext: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
  platformsContainer: {
    gap: 12,
  },
  platformCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  pfTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  barBackground: {
    width: '100%',
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  countText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#334155',
  },
  labelText: {
    fontSize: 10,
    color: '#64748B',
  },
});
