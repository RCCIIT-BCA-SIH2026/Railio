import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { AppBackground } from '../components/AppBackground';

export const ConnectingTrainScreen: React.FC = () => {
  return (
    <AppBackground variant="orange">
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Connecting Train Transfer Intelligence</Text>
        <Text style={styles.subtext}>
          Multi-leg journey connection buffer & transfer missed-connection risk
        </Text>
      </View>

      {/* Connection Card */}
      <View style={styles.connectionCard}>
        <View style={styles.legCard}>
          <Text style={styles.legBadge}>LEG 1 (INBOUND)</Text>
          <Text style={styles.trainTitle}>Train 12301 (Howrah Rajdhani)</Text>
          <Text style={styles.timing}>Scheduled Arrival at CNB: 04:50 | Predicted: 05:04 (+14m)</Text>
        </View>

        {/* Transfer Buffer Meter */}
        <View style={styles.transferMeter}>
          <View style={styles.transferCircle}>
            <Text style={{ fontSize: 18 }}>🔄</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bufferTitle}>Transfer Window at Kanpur Central (CNB)</Text>
            <Text style={styles.bufferMinutes}>Available Buffer: 38 min (Min Required: 25 min)</Text>
            <Text style={styles.probText}>🟡 Connection Probability: 64% (Tight Window)</Text>
          </View>
        </View>

        <View style={styles.legCard}>
          <Text style={styles.legBadge}>LEG 2 (CONNECTING)</Text>
          <Text style={styles.trainTitle}>Train 12004 (Lucknow Shatabdi)</Text>
          <Text style={styles.timing}>Scheduled Departure from CNB: 05:42 (Platform 1)</Text>
        </View>
      </View>

      <View style={styles.recCard}>
        <Text style={styles.recTitle}>💡 AI Recommendation:</Text>
        <Text style={styles.recDesc}>
          Consider alternate connecting rake Train 12566 at 06:15 AM to ensure 100% missed-connection safety.
        </Text>
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
  connectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    gap: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
  },
  legCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  legBadge: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#FF671F',
    marginBottom: 2,
  },
  trainTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  timing: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  transferMeter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 10,
  },
  transferCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  bufferTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  bufferMinutes: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  probText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#D97706',
    marginTop: 2,
  },
  recCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  recTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#059669',
  },
  recDesc: {
    fontSize: 11,
    color: '#166534',
    marginTop: 4,
    lineHeight: 16,
  },
});
