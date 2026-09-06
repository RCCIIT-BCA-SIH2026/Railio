import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { AuthService } from '../services/authService';
import { AppBackground } from '../components/AppBackground';

export const ProfileScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { profile, user, signOut, refreshProfile } = useAuth();

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
      Alert.alert('Profile Updated', 'Your profile details have been saved.');
    } catch (err: any) {
      Alert.alert('Update Failed', err.message || 'Could not update profile.');
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
          <Text style={styles.userName}>{profile?.full_name || user?.email?.split('@')[0] || 'Rail Passenger'}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>

          {/* Badges Row */}
          <View style={styles.badgesRow}>
            <View style={[styles.badge, { backgroundColor: profile?.role === 'admin' ? '#FEF3C7' : '#E0F2FE' }]}>
              <Text style={[styles.badgeText, { color: profile?.role === 'admin' ? '#D97706' : '#0284C7' }]}>
                ROLE: {profile?.role?.toUpperCase() || 'USER'}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: profile?.phone_verified ? '#DCFCE7' : '#FEE2E2' }]}>
              <Text style={[styles.badgeText, { color: profile?.phone_verified ? '#16A34A' : '#DC2626' }]}>
                {profile?.phone_verified ? 'VERIFIED PHONE ✓' : 'UNVERIFIED PHONE ✗'}
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
            <Text style={styles.verifyCalloutTitle}>⚡ Complete Phone Verification</Text>
            <Text style={styles.verifyCalloutSub}>Verify with Truecaller to enable safety alerts & real-time SOS</Text>
          </TouchableOpacity>
        )}

        {/* Edit Form */}
        <View style={styles.card}>
          <Text style={styles.cardHeaderTitle}>Edit Profile Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Your full name"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="+91 98765 00000"
              keyboardType="phone-pad"
            />
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleUpdateProfile} disabled={isUpdating}>
            {isUpdating ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveBtnText}>Save Profile Changes</Text>}
          </TouchableOpacity>
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutBtnText}>Sign Out of Supabase</Text>
        </TouchableOpacity>
      </ScrollView>
    </AppBackground>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: 20, paddingTop: 20 },
  headerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#FF671F',
  },
  userName: { fontSize: 20, fontWeight: 'bold', color: '#0F172A' },
  userEmail: { fontSize: 13, color: '#64748B', marginTop: 2 },
  badgesRow: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 10, fontWeight: 'bold' },
  verifyCallout: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1.5,
    borderColor: '#FF671F',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  verifyCalloutTitle: { fontSize: 13, fontWeight: 'bold', color: '#C2410C' },
  verifyCalloutSub: { fontSize: 11, color: '#9A3412', marginTop: 2 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeaderTitle: { fontSize: 14, fontWeight: 'bold', color: '#0F172A', marginBottom: 14 },
  inputGroup: { marginBottom: 14 },
  label: { fontSize: 11, fontWeight: '600', color: '#64748B', marginBottom: 4, textTransform: 'uppercase' },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#0F172A',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  saveBtn: { backgroundColor: '#FF671F', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 6 },
  saveBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: 'bold' },
  signOutBtn: { backgroundColor: '#FEE2E2', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  signOutBtnText: { color: '#DC2626', fontSize: 14, fontWeight: 'bold' },
});
