import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { AppBackground } from '../components/AppBackground';

export const PhoneVerificationScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { profile, verifyPhone, signOut } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState(profile?.phone_number || '+91 98765 43210');
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [mode, setMode] = useState<'TRUECALLER' | 'SMS'>('TRUECALLER');

  const handleTruecallerVerify = async () => {
    setIsVerifying(true);
    try {
      const result = await verifyPhone(phoneNumber, { truecallerToken: 'tc_token_demo_valid' });
      if (result.success) {
        Alert.alert('Identity Verified', 'Your phone number has been verified via Truecaller.', [
          { text: 'Continue', onPress: () => navigation.replace('MainTabs') },
        ]);
      } else {
        Alert.alert('Verification Failed', result.message || 'Truecaller verification failed.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to communicate with verification service.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSMSVerify = async () => {
    if (!otp) {
      Alert.alert('Validation Error', 'Please enter the 6-digit OTP code.');
      return;
    }
    setIsVerifying(true);
    try {
      const result = await verifyPhone(phoneNumber, { otpCode: otp });
      if (result.success) {
        Alert.alert('Phone Verified', 'Your phone number has been verified successfully.', [
          { text: 'Continue', onPress: () => navigation.replace('MainTabs') },
        ]);
      } else {
        Alert.alert('Verification Failed', result.message || 'Invalid OTP code.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Verification process failed.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <AppBackground variant="orange">
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.badgeIcon}>
            <Text style={{ fontSize: 32 }}>🛡️</Text>
          </View>
          <Text style={styles.title}>Phone Identity Verification</Text>
          <Text style={styles.subtitle}>
            RailIo requires verified phone numbers for real-time SOS & travel safety alerts.
          </Text>
        </View>

        {/* Verification Method Switcher */}
        <View style={styles.switcher}>
          <TouchableOpacity
            style={[styles.switchBtn, mode === 'TRUECALLER' && styles.switchBtnActive]}
            onPress={() => setMode('TRUECALLER')}
          >
            <Text style={[styles.switchText, mode === 'TRUECALLER' && styles.switchTextActive]}>
              Truecaller Auto Verify
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.switchBtn, mode === 'SMS' && styles.switchBtnActive]}
            onPress={() => setMode('SMS')}
          >
            <Text style={[styles.switchText, mode === 'SMS' && styles.switchTextActive]}>
              SMS OTP
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="+91 98765 00000"
            keyboardType="phone-pad"
          />

          {mode === 'TRUECALLER' ? (
            <View style={styles.truecallerContainer}>
              <View style={styles.truecallerHeader}>
                <Text style={styles.truecallerLogo}>Truecaller ⚡</Text>
                <Text style={styles.truecallerDesc}>Instant 1-Tap Secure Verification</Text>
              </View>

              <TouchableOpacity
                style={styles.truecallerBtn}
                onPress={handleTruecallerVerify}
                disabled={isVerifying}
              >
                {isVerifying ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.truecallerBtnText}>Verify Identity with Truecaller</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.smsContainer}>
              <Text style={styles.label}>6-Digit OTP</Text>
              <TextInput
                style={styles.input}
                value={otp}
                onChangeText={setOtp}
                placeholder="123456"
                keyboardType="number-pad"
                maxLength={6}
              />
              <TouchableOpacity
                style={styles.verifyBtn}
                onPress={handleSMSVerify}
                disabled={isVerifying}
              >
                {isVerifying ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.verifyBtnText}>Verify OTP Code</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={signOut}>
          <Text style={styles.logoutText}>Sign Out & Return</Text>
        </TouchableOpacity>
      </ScrollView>
    </AppBackground>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: 24, paddingTop: 60 },
  header: { alignItems: 'center', marginBottom: 24 },
  badgeIcon: {
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
  title: { fontSize: 22, fontWeight: '800', color: '#0F172A', textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#64748B', marginTop: 6, textAlign: 'center', lineHeight: 18 },
  switcher: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  switchBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  switchBtnActive: { backgroundColor: '#FF671F' },
  switchText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  switchTextActive: { color: '#FFFFFF', fontWeight: 'bold' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
  },
  label: { fontSize: 11, fontWeight: '600', color: '#64748B', marginBottom: 6, textTransform: 'uppercase' },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#0F172A',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginBottom: 16,
  },
  truecallerContainer: { marginTop: 8 },
  truecallerHeader: {
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#0284C7',
  },
  truecallerLogo: { fontSize: 14, fontWeight: 'bold', color: '#0284C7' },
  truecallerDesc: { fontSize: 11, color: '#475569', marginTop: 2 },
  truecallerBtn: {
    backgroundColor: '#0284C7',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  truecallerBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  smsContainer: { marginTop: 8 },
  verifyBtn: {
    backgroundColor: '#FF671F',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  verifyBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  logoutBtn: { marginTop: 24, alignItems: 'center' },
  logoutText: { fontSize: 13, color: '#EF4444', fontWeight: '600' },
});
