import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { colors } from '../theme/colors';

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
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
    marginBottom: 10,
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  userEmail: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  verifiedBadge: {
    backgroundColor: colors.greenLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.green,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.greenDark,
  },
  menuCard: {
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
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  menuArrow: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: 'bold',
  },
});
