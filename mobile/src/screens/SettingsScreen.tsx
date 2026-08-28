import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity } from 'react-native';

export const SettingsScreen: React.FC = () => {
  const [demoMode, setDemoMode] = useState(true);
  const [gpsSim, setGpsSim] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);
  const [waSync, setWaSync] = useState(true);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>System Settings & Demo Engine</Text>
        <Text style={styles.subtext}>Configure real-time telemetry simulation and data streams</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.settingRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingTitle}>Demo Data Mode (Offline Resilient)</Text>
            <Text style={styles.settingSub}>Falls back to seeded railway records if offline</Text>
          </View>
          <Switch value={demoMode} onValueChange={setDemoMode} trackColor={{ true: '#FF671F', false: '#334155' }} />
        </View>

        <View style={styles.settingRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingTitle}>Live 3s GPS Stream Simulator</Text>
            <Text style={styles.settingSub}>Broadcasts continuous train vector movements</Text>
          </View>
          <Switch value={gpsSim} onValueChange={setGpsSim} trackColor={{ true: '#FF671F', false: '#334155' }} />
        </View>

        <View style={styles.settingRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingTitle}>Push Notifications</Text>
            <Text style={styles.settingSub}>Alert for train delays & platform crowd surges</Text>
          </View>
          <Switch value={pushNotifs} onValueChange={setPushNotifs} trackColor={{ true: '#FF671F', false: '#334155' }} />
        </View>

        <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingTitle}>WhatsApp AI Channel Sync</Text>
            <Text style={styles.settingSub}>Enable instant mobile travel alerts via WhatsApp</Text>
          </View>
          <Switch value={waSync} onValueChange={setWaSync} trackColor={{ true: '#FF671F', false: '#334155' }} />
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
    backgroundColor: 'rgba(19, 47, 86, 0.7)',
    borderRadius: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  settingTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  settingSub: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
});
