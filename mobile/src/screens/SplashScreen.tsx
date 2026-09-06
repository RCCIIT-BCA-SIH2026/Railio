import React, { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { VandeBharatHero } from '../components/VandeBharatHero';
import { AppBackground } from '../components/AppBackground';

export const SplashScreen: React.FC = React.memo(() => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleEnter = useCallback(() => {
    if (typeof (navigation as any).replace === 'function') {
      navigation.replace('MainTabs');
    } else {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'MainTabs' }],
        })
      );
    }
  }, [navigation]);

  useEffect(() => {
    const timer = setTimeout(handleEnter, 2400);
    return () => clearTimeout(timer);
  }, [handleEnter]);

  return (
    <AppBackground variant="orange">
      <View style={styles.container}>
        {/* Background Gradient Effect */}
        <View style={styles.glowCircle} />

        <View style={styles.content}>
          <View style={styles.logoBadge}>
            <Image source={require('../../assets/logo.png')} style={{ width: 180, height: 180 }} resizeMode="contain" />
          </View>

          <Text style={styles.title}>Rail<Text style={styles.titleIo}>Io</Text></Text>
          <Text style={styles.tagline}>Predict • Protect • Connect</Text>
          <Text style={styles.subtext}>AI-Powered Railway Intelligence Ecosystem</Text>

          <View style={styles.trainWrapper}>
            <VandeBharatHero height={160} />
          </View>

          <View style={styles.loaderContainer}>
            <View style={styles.pulseDot} />
            <Text style={styles.loadingText}>Synchronizing Indian Railways Digital Twin...</Text>
          </View>

          <TouchableOpacity style={styles.skipButton} onPress={handleEnter}>
            <Text style={styles.skipText}>Enter Platform →</Text>
          </TouchableOpacity>
        </View>
      </View>
    </AppBackground>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
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
    fontFamily: 'Sora_800ExtraBold',
    color: '#0F172A',
    letterSpacing: 1.5,
  },
  titleIo: {
    fontFamily: 'PlaypenSans_800ExtraBold',
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
