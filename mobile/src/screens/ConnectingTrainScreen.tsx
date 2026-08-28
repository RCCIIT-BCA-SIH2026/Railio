import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

export const ConnectingTrainScreen: React.FC = () => {
  return (
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
  connectionCard: {
    backgroundColor: 'rgba(19, 47, 86, 0.8)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 14,
    gap: 12,
  },
  legCard: {
    backgroundColor: '#07162C',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1E4273',
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
    color: '#FFFFFF',
  },
  timing: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  transferMeter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    gap: 10,
  },
  transferCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#07162C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bufferTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  bufferMinutes: {
    fontSize: 10,
    color: '#CBD5E1',
    marginTop: 1,
  },
  probText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#F59E0B',
    marginTop: 2,
  },
  recCard: {
    backgroundColor: 'rgba(11, 37, 69, 0.8)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E4273',
  },
  recTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#10B981',
  },
  recDesc: {
    fontSize: 11,
    color: '#CBD5E1',
    marginTop: 4,
    lineHeight: 16,
  },
});
