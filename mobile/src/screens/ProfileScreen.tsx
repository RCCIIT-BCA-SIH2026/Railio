import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Header */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={{ fontSize: 32 }}>👤</Text>
        </View>
        <Text style={styles.userName}>Aarav Sharma</Text>
        <Text style={styles.userEmail}>passenger@railsathi.ai • +91 98765 43210</Text>
        <View style={styles.verifiedBadge}>
          <Text style={styles.verifiedText}>✓ IRCTC DigiLocker Verified</Text>
        </View>
      </View>

      {/* Quick Menu Options */}
      <View style={styles.menuCard}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('CanICatch', { trainNumber: '12301' })}
        >
          <Text style={styles.menuText}>🎯 Can I Catch My Train?</Text>
          <Text style={styles.menuArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('AIAssistant', undefined)}
        >
          <Text style={styles.menuText}>🤖 AI Travel Sathi Assistant</Text>
          <Text style={styles.menuArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('WhatsAppSimulator')}
        >
          <Text style={styles.menuText}>💬 WhatsApp Bot Simulator</Text>
          <Text style={styles.menuArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('AdminQuickAlerts')}
        >
          <Text style={styles.menuText}>🛡️ Switch to Controller View</Text>
          <Text style={styles.menuArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, { borderBottomWidth: 0 }]}
          onPress={() => navigation.navigate('Settings')}
        >
          <Text style={styles.menuText}>⚙️ App Preferences & Demo Mode</Text>
          <Text style={styles.menuArrow}>→</Text>
        </TouchableOpacity>
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
  profileCard: {
    backgroundColor: 'rgba(19, 47, 86, 0.8)',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#0B2545',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FF671F',
    marginBottom: 10,
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  userEmail: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  verifiedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#10B981',
  },
  menuCard: {
    backgroundColor: 'rgba(19, 47, 86, 0.7)',
    borderRadius: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  menuText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  menuArrow: {
    fontSize: 16,
    color: '#FF671F',
    fontWeight: 'bold',
  },
});
