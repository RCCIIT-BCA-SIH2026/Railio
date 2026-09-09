import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { AuthService } from '../services/authService';
import { AppBackground } from '../components/AppBackground';
import { useTranslation } from '../context/LanguageContext';

export const ProfileScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { profile, user, signOut, refreshProfile } = useAuth();
  const { t } = useTranslation();

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phoneNumber, setPhoneNumber] = useState(profile?.phone_number || '');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdateProfile = async () => {
    if (!user) return;
    setIsUpdating(true);
    try {
      await AuthService.updateProfile(user.id, {
        full_name: fullName,
        phone_number: phoneNumber,
      });
      await refreshProfile();
      Alert.alert(t('Profile Updated'), t('Your profile details have been saved.'));
    } catch (err: any) {
      Alert.alert(t('Update Failed'), err.message || t('Could not update profile.'));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigation.replace('Login');
  };

  return (
    <AppBackground variant="orange">
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* User Header */}
        <View style={styles.headerCard}>
          <View style={styles.avatarCircle}>
            <Text style={{ fontSize: 32 }}>👤</Text>
          </View>
          <Text style={styles.userName}>{profile?.full_name || user?.email?.split('@')[0] || t('Aarav Sharma')}</Text>
          <Text style={styles.userEmail}>{user?.email || 'passenger@railsathi.ai • +91 98765 43210'}</Text>

          {/* Badges Row */}
          <View style={styles.badgesRow}>
            <View style={[styles.badge, { backgroundColor: profile?.role === 'admin' ? '#FEF3C7' : '#E0F2FE' }]}>
              <Text style={[styles.badgeText, { color: profile?.role === 'admin' ? '#D97706' : '#0284C7' }]}>
                ROLE: {profile?.role?.toUpperCase() || 'PASSENGER'}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: profile?.phone_verified ? '#DCFCE7' : '#E0F2FE' }]}>
              <Text style={[styles.badgeText, { color: profile?.phone_verified ? '#16A34A' : '#0284C7' }]}>
                {profile?.phone_verified ? 'VERIFIED PHONE ✓' : t('IRCTC DigiLocker Verified')}
              </Text>
            </View>
          </View>
        </View>

        {/* Verification Callout if unverified */}
        {!profile?.phone_verified && (
          <TouchableOpacity
            style={styles.verifyCallout}
            onPress={() => navigation.navigate('PhoneVerification')}
          >
            <Text style={styles.verifyCalloutTitle}>⚡ {t('Complete Phone Verification')}</Text>
            <Text style={styles.verifyCalloutSub}>{t('Verify with Truecaller to enable safety alerts & real-time SOS')}</Text>
          </TouchableOpacity>
        )}

        {/* Quick Menu Options */}
        <View style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('CanICatch', { trainNumber: '32216' })}
          >
            <Text style={styles.menuText}>🎯 {t('Can I Catch My Train?')}</Text>
            <Text style={styles.menuArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('AIAssistant', undefined)}
          >
            <Text style={styles.menuText}>🤖 {t('AI Travel Sathi Assistant')}</Text>
            <Text style={styles.menuArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('WhatsAppSimulator')}
          >
            <Text style={styles.menuText}>💬 {t('WhatsApp Bot Simulator')}</Text>
            <Text style={styles.menuArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('AdminQuickAlerts')}
          >
            <Text style={styles.menuText}>🛡️ {t('Switch to Controller View')}</Text>
            <Text style={styles.menuArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { borderBottomWidth: 0 }]}
            onPress={() => navigation.navigate('Settings')}
          >
            <Text style={styles.menuText}>⚙️ {t('App Preferences & Demo Mode')}</Text>
            <Text style={styles.menuArrow}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Edit Form */}
        <View style={styles.card}>
          <Text style={styles.cardHeaderTitle}>{t('Edit Profile Information')}</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('Full Name')}</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Your full name"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('Phone Number')}</Text>
            <TextInput
              style={styles.input}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="+91 98765 00000"
              keyboardType="phone-pad"
            />
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleUpdateProfile} disabled={isUpdating}>
            {isUpdating ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveBtnText}>{t('Save Profile Changes')}</Text>}
          </TouchableOpacity>
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutBtnText}>{t('Sign Out')}</Text>
        </TouchableOpacity>
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
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
  },
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#FFD8A8',
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  userEmail: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  verifyCallout: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  verifyCalloutTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#B45309',
  },
  verifyCalloutSub: {
    fontSize: 11,
    color: '#92400E',
    marginTop: 2,
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  menuText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  menuArrow: {
    fontSize: 16,
    color: '#94A3B8',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  cardHeaderTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 14,
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#475569',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
  },
  saveBtn: {
    backgroundColor: '#FF671F',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  signOutBtn: {
    borderWidth: 1,
    borderColor: '#FECDD3',
    backgroundColor: '#FFF1F2',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  signOutBtnText: {
    color: '#E11D48',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
