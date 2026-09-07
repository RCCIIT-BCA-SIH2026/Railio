import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity } from 'react-native';
import { AppBackground } from '../components/AppBackground';
import { useTranslation } from '../context/LanguageContext';

export const SettingsScreen: React.FC = () => {
  const { openLanguageModal, activeLanguageOption, t } = useTranslation();
  const [demoMode, setDemoMode] = useState(true);
  const [gpsSim, setGpsSim] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);
  const [waSync, setWaSync] = useState(true);

  return (
    <AppBackground variant="orange">
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('settings.title', 'System Settings & Demo Engine')}</Text>
        <Text style={styles.subtext}>{t('settings.sub', 'Configure real-time telemetry simulation and data streams')}</Text>
      </View>

      {/* Language Selection Card */}
      <View style={[styles.card, { marginBottom: 16 }]}>
        <TouchableOpacity
          style={[styles.settingRow, { borderBottomWidth: 0 }]}
          onPress={openLanguageModal}
          activeOpacity={0.7}
        >
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 16, marginRight: 6 }}>🌐</Text>
              <Text style={styles.settingTitle}>{t('lang.modal_title', 'App Language')}</Text>
            </View>
            <Text style={styles.settingSub}>
              {t('lang.modal_sub', 'Powered by Google Translate • 12 Indian Languages')}
            </Text>
          </View>
          <View style={styles.langPill}>
            <Text style={styles.langPillText}>{activeLanguageOption.nativeName} ({activeLanguageOption.code.toUpperCase()})</Text>
            <Text style={{ fontSize: 12, color: '#FF671F', marginLeft: 4 }}>→</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <View style={styles.settingRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingTitle}>Demo Data Mode (Offline Resilient)</Text>
            <Text style={styles.settingSub}>Falls back to seeded railway records if offline</Text>
          </View>
          <Switch value={demoMode} onValueChange={setDemoMode} trackColor={{ true: '#FF671F', false: '#CBD5E1' }} />
        </View>

        <View style={styles.settingRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingTitle}>Live 3s GPS Stream Simulator</Text>
            <Text style={styles.settingSub}>Broadcasts continuous train vector movements</Text>
          </View>
          <Switch value={gpsSim} onValueChange={setGpsSim} trackColor={{ true: '#FF671F', false: '#CBD5E1' }} />
        </View>

        <View style={styles.settingRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingTitle}>Push Notifications</Text>
            <Text style={styles.settingSub}>Alert for train delays & platform crowd surges</Text>
          </View>
          <Switch value={pushNotifs} onValueChange={setPushNotifs} trackColor={{ true: '#FF671F', false: '#CBD5E1' }} />
        </View>

        <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingTitle}>WhatsApp AI Channel Sync</Text>
            <Text style={styles.settingSub}>Enable instant mobile travel alerts via WhatsApp</Text>
          </View>
          <Switch value={waSync} onValueChange={setWaSync} trackColor={{ true: '#FF671F', false: '#CBD5E1' }} />
        </View>
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
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  settingTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  settingSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  langPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C2410C',
  },
});
