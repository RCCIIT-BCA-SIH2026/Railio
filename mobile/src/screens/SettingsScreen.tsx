import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';

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
          <Switch value={demoMode} onValueChange={setDemoMode} trackColor={{ true: colors.primary, false: colors.border }} />
        </View>

        <View style={styles.settingRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingTitle}>Live 3s GPS Stream Simulator</Text>
            <Text style={styles.settingSub}>Broadcasts continuous train vector movements</Text>
          </View>
          <Switch value={gpsSim} onValueChange={setGpsSim} trackColor={{ true: colors.primary, false: colors.border }} />
        </View>

        <View style={styles.settingRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingTitle}>Push Notifications</Text>
            <Text style={styles.settingSub}>Alert for train delays & platform crowd surges</Text>
          </View>
          <Switch value={pushNotifs} onValueChange={setPushNotifs} trackColor={{ true: colors.primary, false: colors.border }} />
        </View>

        <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingTitle}>WhatsApp AI Channel Sync</Text>
            <Text style={styles.settingSub}>Enable instant mobile travel alerts via WhatsApp</Text>
          </View>
          <Switch value={waSync} onValueChange={setWaSync} trackColor={{ true: colors.primary, false: colors.border }} />
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
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.text,
  },
  settingSub: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
});
