import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { getCoachCrowdApi } from '../services/api';
import { colors } from '../theme/colors';

export const CoachCrowdScreen: React.FC = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'CoachCrowd'>>();
  const { trainNumber = '12301' } = route.params || {};

  const [crowdData, setCrowdData] = useState<any>(null);

  useEffect(() => {
    loadCrowd();
  }, [trainNumber]);

  const loadCrowd = async () => {
    try {
      const data = await getCoachCrowdApi(trainNumber);
      setCrowdData(data);
    } catch (err) {}
  };

  const coaches = crowdData?.coaches || [
    { coach: 'H1', density: 38, status: 'GREEN' },
    { coach: 'A1', density: 82, status: 'RED' },
    { coach: 'A2', density: 46, status: 'YELLOW' },
    { coach: 'A3', density: 29, status: 'GREEN' },
    { coach: 'A4', density: 91, status: 'RED' },
    { coach: 'B1', density: 77, status: 'RED' },
    { coach: 'B2', density: 65, status: 'YELLOW' },
    { coach: 'B3', density: 58, status: 'YELLOW' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.trainNum}>Train #{trainNumber}</Text>
            <Text style={styles.title}>Coach-Wise Crowd Intelligence</Text>
          </View>
          <View style={styles.cvBadge}>
            <Text style={styles.cvBadgeText}>AI SENSORS</Text>
          </View>
        </View>
        <Text style={styles.subtext}>
          Predictive passenger load analysis per coach based on reservation charts & boarding history
        </Text>
      </View>

      {/* AI Recommendation Highlight Box */}
      <View style={styles.recommendationBox}>
        <View style={styles.recIconBox}>
          <Text style={{ fontSize: 24 }}>✨</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.recTitle}>
            Recommended Coach: <Text style={{ color: colors.greenDark }}>{crowdData?.recommendedCoach || 'A3'}</Text>
          </Text>
          <Text style={styles.recDesc}>
            {crowdData?.reason || 'Lowest estimated crowd density (29% occupancy). Ideal for smooth boarding.'}
          </Text>
        </View>
      </View>

      {/* Coach Layout Rake Grid */}
      <View style={styles.rakeSection}>
        <Text style={styles.rakeSectionTitle}>Train Coach Composition Heatmap</Text>

        <View style={styles.coachesGrid}>
          {coaches.map((c: any, i: number) => {
            const isRed = c.status === 'RED';
            const isYellow = c.status === 'YELLOW';
            const badgeColor = isRed ? '#EF4444' : isYellow ? '#F59E0B' : '#10B981';

            return (
              <View
                key={i}
                style={[
                  styles.coachCard,
                  c.coach === (crowdData?.recommendedCoach || 'A3') && styles.coachCardBest,
                ]}
              >
                <View style={styles.coachCardHeader}>
                  <Text style={styles.coachId}>{c.coach}</Text>
                  <View style={[styles.densityDot, { backgroundColor: badgeColor }]} />
                </View>

                <Text style={[styles.densityPct, { color: badgeColor }]}>{c.density}%</Text>
                <Text style={styles.densityLabel}>
                  {isRed ? 'High Load' : isYellow ? 'Moderate' : 'Low Crowd'}
                </Text>

                {/* Progress Mini Bar */}
                <View style={styles.miniBar}>
                  <View
                    style={[styles.miniBarFill, { width: `${c.density}%`, backgroundColor: badgeColor }]}
                  />
                </View>
              </View>
            );
          })}
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
  headerCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  trainNum: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.primary,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginTop: 2,
  },
  cvBadge: {
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  cvBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#9333EA',
  },
  subtext: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 16,
  },
  recommendationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.greenLight,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.green,
    marginBottom: 16,
    gap: 12,
  },
  recIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },
  recDesc: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },
  rakeSection: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  rakeSectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 14,
  },
  coachesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  coachCard: {
    width: '47%',
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  coachCardBest: {
    borderColor: colors.green,
    backgroundColor: colors.greenLight,
  },
  coachCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  coachId: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  densityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  densityPct: {
    fontSize: 22,
    fontWeight: '900',
  },
  densityLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  miniBar: {
    width: '100%',
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  miniBarFill: {
    height: '100%',
    borderRadius: 2,
  },
});
