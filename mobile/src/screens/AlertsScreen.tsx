import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { getAlertsApi } from '../services/api';
import { AlertItem } from '../types';

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
  alertsList: {
    gap: 12,
  },
  alertCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
  },
  cardCritical: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  cardWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.4)',
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
    color: '#FFFFFF',
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
    color: '#CBD5E1',
    lineHeight: 17,
  },
  actionBox: {
    backgroundColor: '#07162C',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#1E4273',
  },
  actionText: {
    fontSize: 11,
    color: '#F59E0B',
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  categoryText: {
    fontSize: 10,
    color: '#94A3B8',
  },
  timeText: {
    fontSize: 10,
    color: '#64748B',
    fontFamily: 'monospace',
  },
});
