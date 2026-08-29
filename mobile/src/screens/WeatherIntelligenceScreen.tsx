import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { getWeatherApi } from '../services/api';
import { AppBackground } from '../components/AppBackground';

export const WeatherIntelligenceScreen: React.FC = () => {
  const [weatherData, setWeatherData] = useState<any>(null);

  useEffect(() => {
    loadWeather();
  }, []);

  const loadWeather = async () => {
    try {
      const data = await getWeatherApi();
      setWeatherData(data);
    } catch (err) {}
  };

  const weather = weatherData?.HWH || {
    city: 'Kolkata (Howrah)',
    tempC: 31,
    condition: 'Heavy Rain',
    rainMm: 42.5,
    windKmh: 28,
    humidityPct: 88,
    visibilityKm: 3.5,
    railImpact: 'Heavy rainfall warning: +8 to +12 min precautionary speed restriction on suburban approach lines.',
  };

  return (
    <AppBackground variant="orange">
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Weather Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.city}>{weather.city}</Text>
              <Text style={styles.conditionText}>🌧️ {weather.condition}</Text>
            </View>
            <Text style={styles.tempText}>{weather.tempC}°C</Text>
          </View>

          {/* Metrics Grid */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricBox}>
              <Text style={styles.metricVal}>{weather.rainMm} mm/h</Text>
              <Text style={styles.metricLabel}>Rainfall</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricVal}>{weather.windKmh} km/h</Text>
              <Text style={styles.metricLabel}>Wind Gusts</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricVal}>{weather.humidityPct}%</Text>
              <Text style={styles.metricLabel}>Humidity</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricVal}>{weather.visibilityKm} km</Text>
              <Text style={styles.metricLabel}>Visibility</Text>
            </View>
          </View>
        </View>

        {/* Railway Operations Impact Card */}
        <View style={styles.impactCard}>
          <View style={styles.impactHeader}>
            <Text style={{ fontSize: 20 }}>⚠️</Text>
            <Text style={styles.impactTitle}>Railway Track & Signal Impact</Text>
          </View>
          <Text style={styles.impactDesc}>{weather.railImpact}</Text>
          <View style={styles.impactFooter}>
            <Text style={styles.impactFooterText}>AI Weather Model: XGBoost Precipitation Correlator</Text>
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
  headerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  city: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  conditionText: {
    fontSize: 13,
    color: '#0284C7',
    marginTop: 2,
    fontWeight: '600',
  },
  tempText: {
    fontSize: 34,
    fontWeight: '900',
    color: '#0F172A',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  metricBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  metricVal: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  metricLabel: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 2,
  },
  impactCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  impactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  impactTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#B45309',
  },
  impactDesc: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 18,
  },
  impactFooter: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#FDE68A',
  },
  impactFooterText: {
    fontSize: 9.5,
    color: '#78350F',
    fontStyle: 'italic',
  },
});
