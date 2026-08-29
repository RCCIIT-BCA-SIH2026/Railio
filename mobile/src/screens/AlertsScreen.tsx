import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { getAlertsApi } from '../services/api';
import { AlertItem } from '../types';
import { colors } from '../theme/colors';

export const AlertsScreen: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      const list = await getAlertsApi();
      setAlerts(list);
    } catch (err) {}
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Safety & Incident Alerts</Text>
        <Text style={styles.subtext}>
          Live track anomalies, weather restrictions, and platform congestion notices
        </Text>
      </View>

      <View style={styles.alertsList}>
        {alerts.map((a) => {
          const isCritical = a.severity === 'CRITICAL' || a.severity === 'HIGH_RISK';
          const badgeColor = isCritical ? '#EF4444' : '#F59E0B';

          return (
            <View
              key={a.id}
              style={[
                styles.alertCard,
                isCritical ? styles.cardCritical : styles.cardWarning,
              ]}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.alertTitle}>{a.title}</Text>
                <View style={[styles.badge, { backgroundColor: `${badgeColor}20`, borderColor: `${badgeColor}40` }]}>
                  <Text style={[styles.badgeText, { color: badgeColor }]}>{a.severity}</Text>
                </View>
              </View>

              <Text style={styles.alertDesc}>{a.description}</Text>

              {a.recommendedAction && (
                <View style={styles.actionBox}>
                  <Text style={styles.actionText}>⚡ Action: {a.recommendedAction}</Text>
                </View>
              )}

              <View style={styles.cardFooter}>
                <Text style={styles.categoryText}>Category: {a.category}</Text>
                <Text style={styles.timeText}>{a.timestamp}</Text>
              </View>
            </View>
          );
        })}
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
  alertsList: {
    gap: 12,
  },
  alertCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  cardCritical: {
    backgroundColor: colors.dangerLight,
    borderColor: colors.danger,
  },
  cardWarning: {
    backgroundColor: colors.warningLight,
    borderColor: colors.warning,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  alertDesc: {
    fontSize: 11.5,
    color: colors.textMuted,
    lineHeight: 17,
  },
  actionBox: {
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionText: {
    fontSize: 11,
    color: colors.warningDark,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  categoryText: {
    fontSize: 10,
    color: colors.textMuted,
  },
  timeText: {
    fontSize: 10,
    color: colors.textLight,
    fontFamily: 'monospace',
  },
});
