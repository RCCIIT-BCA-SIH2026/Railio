import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [email, setEmail] = useState('passenger@railsathi.ai');
  const [password, setPassword] = useState('password123');
  const [role, setRole] = useState<'PASSENGER' | 'ADMIN'>('PASSENGER');

  const handleLogin = () => {
    navigation.replace('MainTabs');
  };

  const handleQuickDemo = (selectedRole: 'PASSENGER' | 'ADMIN') => {
    setRole(selectedRole);
    if (selectedRole === 'PASSENGER') {
      setEmail('passenger@railsathi.ai');
    } else {
      setEmail('admin@railsathi.ai');
    }
    navigation.replace('MainTabs');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.logoIcon}>
          <Text style={{ fontSize: 32 }}>🚆</Text>
        </View>
        <Text style={styles.title}>Welcome to RailSathi</Text>
        <Text style={styles.subtitle}>Sign in to access live railway AI intelligence</Text>
      </View>

      {/* Role Switcher */}
      <View style={styles.roleContainer}>
        <TouchableOpacity
          style={[styles.roleButton, role === 'PASSENGER' && styles.roleActive]}
          onPress={() => setRole('PASSENGER')}
        >
          <Text style={[styles.roleText, role === 'PASSENGER' && styles.roleTextActive]}>
            Passenger
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.roleButton, role === 'ADMIN' && styles.roleActive]}
          onPress={() => setRole('ADMIN')}
        >
          <Text style={[styles.roleText, role === 'ADMIN' && styles.roleTextActive]}>
            Controller / Admin
          </Text>
        </TouchableOpacity>
      </View>

      {/* Inputs */}
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
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor="#64748B"
            secureTextEntry
          />
        </View>

        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          <Text style={styles.loginButtonText}>Sign In as {role}</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Demo Access Bar */}
      <View style={styles.quickAccessSection}>
        <Text style={styles.quickAccessTitle}>⚡ ONE-TAP DEMO ACCESS</Text>
        <View style={styles.demoButtonsRow}>
          <TouchableOpacity
            style={styles.demoBtn}
            onPress={() => handleQuickDemo('PASSENGER')}
          >
            <Text style={styles.demoBtnText}>👤 Demo Passenger</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.demoBtn, styles.demoBtnAdmin]}
            onPress={() => handleQuickDemo('ADMIN')}
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
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 24,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
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
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  roleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  roleButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  roleActive: {
    backgroundColor: '#FF671F',
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  roleTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
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
  loginButton: {
    backgroundColor: '#FF671F',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    elevation: 2,
    shadowColor: '#FF671F',
    shadowOpacity: 0.2,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  quickAccessSection: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.03,
  },
  quickAccessTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#64748B',
    letterSpacing: 1,
    marginBottom: 10,
    textAlign: 'center',
  },
  demoButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  demoBtn: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  demoBtnAdmin: {
    borderColor: '#FED7AA',
    backgroundColor: '#FFF7ED',
  },
  demoBtnText: {
    color: '#334155',
    fontSize: 11,
    fontWeight: 'bold',
  },
  registerLink: {
    marginTop: 24,
    alignItems: 'center',
  },
  registerText: {
    fontSize: 12,
    color: '#64748B',
  },
});
