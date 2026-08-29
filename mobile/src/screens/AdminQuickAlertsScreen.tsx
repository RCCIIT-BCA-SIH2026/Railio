import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

export const AdminQuickAlertsScreen: React.FC = () => {
  const [approved, setApproved] = useState(false);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Controller Quick Actions</Text>
        <Text style={styles.subtext}>Mobile decision support for Divisional Railway Managers</Text>
      </View>

      <View style={styles.alertCard}>
        <Text style={styles.alertCategory}>TRACK ANOMALY TELEMETRY (ESP32)</Text>
        <Text style={styles.alertTitle}>Section B-17 Vibration Spike (3.42g)</Text>
        <Text style={styles.alertDesc}>
          Accelerometer RMS exceeded warning baseline. AI recommends imposing 45 km/h caution order between km 64 and km 68.
        </Text>

        <TouchableOpacity
          style={[styles.actionBtn, approved && styles.actionBtnApproved]}
          onPress={() => setApproved(true)}
        >
          <Text style={styles.actionBtnText}>
            {approved ? '✓ Caution Order Dispatched' : 'Approve 45 km/h Caution Order'}
          </Text>
        </TouchableOpacity>
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
  alertCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#FECACA',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.03,
  },
  alertCategory: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#DC2626',
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#991B1B',
    marginTop: 4,
  },
  alertDesc: {
    fontSize: 11.5,
    color: '#7F1D1D',
    marginTop: 6,
    lineHeight: 16,
  },
  actionBtn: {
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 14,
  },
  actionBtnApproved: {
    backgroundColor: '#059669',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
