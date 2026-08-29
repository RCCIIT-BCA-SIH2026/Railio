import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';

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
  connectionCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  legCard: {
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  legBadge: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 2,
  },
  trainTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },
  timing: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  transferMeter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningLight,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.warning,
    gap: 10,
  },
  transferCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bufferTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.text,
  },
  bufferMinutes: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },
  probText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.warningDark,
    marginTop: 2,
  },
  recCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  recTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.greenDark,
  },
  recDesc: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
    lineHeight: 16,
  },
});
