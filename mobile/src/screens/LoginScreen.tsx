import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useAuth } from '../context/AuthContext';
import { AppBackground } from '../components/AppBackground';

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { signIn, signInWithGoogle } = useAuth();

  const [email, setEmail] = useState('passenger@railsathi.ai');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<'user' | 'admin'>('user');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Validation Error', 'Please enter email and password.');
      return;
    }
    setIsSubmitting(true);
    try {
      await signIn(email, password);
      navigation.replace('MainTabs');
    } catch (err: any) {
      Alert.alert('Authentication Failed', err.message || 'Invalid email or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err: any) {
      Alert.alert('Google Auth Failed', err.message || 'Unable to connect with Google.');
    }
  };

  const handleQuickDemo = async (selectedRole: 'user' | 'admin') => {
    setRole(selectedRole);
    const demoEmail = selectedRole === 'user' ? 'passenger@railsathi.ai' : 'admin@railsathi.ai';
    const demoPass = 'password123';
    setEmail(demoEmail);
    setPassword(demoPass);
    setIsSubmitting(true);
    try {
      await signIn(demoEmail, demoPass);
      navigation.replace('MainTabs');
    } catch (err: any) {
      try {
        const { AuthService } = require('../services/authService');
        await AuthService.signUp(demoEmail, demoPass, selectedRole === 'user' ? 'Demo Passenger' : 'System Controller');
        await signIn(demoEmail, demoPass);
        navigation.replace('MainTabs');
      } catch (signUpErr: any) {
        Alert.alert('Demo Access Failed', signUpErr.message || 'Could not log in with demo account.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppBackground variant="orange">
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.logoIcon}>
            <Text style={{ fontSize: 32 }}>🚆</Text>
          </View>
          <Text style={styles.title}>Welcome to RailSathi</Text>
          <Text style={styles.subtitle}>Sign in with Supabase Auth to access live railway AI</Text>
        </View>

        {/* Role Switcher */}
        <View style={styles.roleContainer}>
          <TouchableOpacity
            style={[styles.roleButton, role === 'user' && styles.roleActive]}
            onPress={() => setRole('user')}
          >
            <Text style={[styles.roleText, role === 'user' && styles.roleTextActive]}>
              Passenger App
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleButton, role === 'admin' && styles.roleActive]}
            onPress={() => setRole('admin')}
          >
            <Text style={[styles.roleText, role === 'admin' && styles.roleTextActive]}>
              Controller / Admin
            </Text>
          </TouchableOpacity>
        </View>

        {/* Inputs & Form */}
        <View style={styles.card}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="name@railsathi.ai"
              placeholderTextColor="#64748B"
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#64748B"
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
                activeOpacity={0.7}
              >
                <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={isSubmitting}>
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.loginButtonText}>Sign In with Supabase</Text>
            )}
          </TouchableOpacity>

          {/* Google OAuth Button */}
          <TouchableOpacity style={styles.googleButton} onPress={handleGoogleSignIn}>
            <Text style={styles.googleButtonText}>🌐 Continue with Google</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Demo Access Bar */}
        <View style={styles.quickAccessSection}>
          <Text style={styles.quickAccessTitle}>⚡ ONE-TAP DEMO ACCESS</Text>
          <View style={styles.demoButtonsRow}>
            <TouchableOpacity
              style={styles.demoBtn}
              onPress={() => handleQuickDemo('user')}
            >
              <Text style={styles.demoBtnText}>👤 Demo Passenger</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.demoBtn, styles.demoBtnAdmin]}
              onPress={() => handleQuickDemo('admin')}
            >
              <Text style={[styles.demoBtnText, { color: '#FF671F' }]}>🛡️ Demo Controller</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={styles.registerLink}
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={styles.registerText}>
            Don't have an account? <Text style={{ color: '#FF671F', fontWeight: 'bold' }}>Register</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </AppBackground>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: 24, paddingTop: 60 },
  header: { alignItems: 'center', marginBottom: 24 },
  logoIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#FFF7ED',
    borderWidth: 1.5,
    borderColor: '#FF671F',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 24, fontWeight: '800', color: '#0F172A' },
  subtitle: { fontSize: 12, color: '#64748B', marginTop: 4 },
  roleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  roleButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  roleActive: { backgroundColor: '#FF671F' },
  roleText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  roleTextActive: { color: '#FFFFFF', fontWeight: 'bold' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
  },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 11, fontWeight: '600', color: '#64748B', marginBottom: 6, textTransform: 'uppercase' },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#0F172A',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#0F172A',
    fontSize: 13,
  },
  eyeButton: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeIcon: {
    fontSize: 16,
  },
  loginButton: {
    backgroundColor: '#FF671F',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  googleButton: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  googleButtonText: { color: '#0F172A', fontSize: 13, fontWeight: '600' },
  quickAccessSection: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickAccessTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#64748B',
    letterSpacing: 1,
    marginBottom: 10,
    textAlign: 'center',
  },
  demoButtonsRow: { flexDirection: 'row', gap: 10 },
  demoBtn: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  demoBtnAdmin: { borderColor: '#FED7AA', backgroundColor: '#FFF7ED' },
  demoBtnText: { color: '#334155', fontSize: 11, fontWeight: 'bold' },
  registerLink: { marginTop: 24, alignItems: 'center' },
  registerText: { fontSize: 12, color: '#64748B' },
});
