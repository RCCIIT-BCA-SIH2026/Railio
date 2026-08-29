import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { VandeBharatHero } from '../components/VandeBharatHero';

export const SplashScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('MainTabs');
    }, 2400);
    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      {/* Background Gradient Effect */}
      <View style={styles.glowCircle} />

      <View style={styles.content}>
        <View style={styles.logoBadge}>
          <Text style={styles.trainEmoji}>🚆</Text>
        </View>

        <Text style={styles.title}>RailSathi</Text>
        <Text style={styles.tagline}>Predict • Protect • Connect</Text>
        <Text style={styles.subtext}>AI-Powered Railway Intelligence Ecosystem</Text>

        <View style={styles.trainWrapper}>
          <VandeBharatHero height={160} />
        </View>

        <View style={styles.loaderContainer}>
          <View style={styles.pulseDot} />
          <Text style={styles.loadingText}>Synchronizing Indian Railways Digital Twin...</Text>
        </View>

        <TouchableOpacity style={styles.skipButton} onPress={() => navigation.replace('MainTabs')}>
          <Text style={styles.skipText}>Enter Platform →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  glowCircle: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(255, 103, 31, 0.08)',
    top: '25%',
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  logoBadge: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#FFF7ED',
    borderWidth: 2,
    borderColor: '#FF671F',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#FF671F',
    shadowOpacity: 0.2,
  },
  trainEmoji: {
    fontSize: 42,
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 1.5,
  },
  tagline: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF671F',
    marginTop: 6,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  subtext: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 20,
  },
  trainWrapper: {
    width: '100%',
    marginVertical: 12,
  },
  loaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 8,
  },
  loadingText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
  },
  skipButton: {
    marginTop: 32,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#FF671F',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#FF671F',
    shadowOpacity: 0.25,
  },
  skipText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
