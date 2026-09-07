// Mobile Supabase Auth & Profile Service

import { supabase } from '../lib/supabase';
import { phoneVerificationProvider, PhoneVerificationResult } from './phoneVerificationProvider';

export interface UserProfile {
  id: string;
  auth_user_id: string;
  full_name: string;
  email: string;
  phone_number?: string;
  avatar_url?: string;
  role: 'user' | 'admin' | 'super_admin' | string;
  phone_verified: boolean;
  email_verified: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export class AuthService {
  /**
   * Email Sign Up
   */
  static async signUp(email: string, password: string, fullName: string, phoneNumber?: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone_number: phoneNumber,
          role: 'user', // Clients forced to default 'user' role
        },
      },
    });

    if (error) throw error;
    return data;
  }

  /**
   * Email Sign In
   */
  static async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  }

  /**
   * Google OAuth Sign In
   */
  static async signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'railio://auth/callback',
      },
    });

    if (error) throw error;
    return data;
  }

  /**
   * Sign Out
   */
  static async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  /**
   * Forgot Password / Reset Password Email
   */
  static async resetPassword(email: string) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'railio://auth/reset-password',
    });

    if (error) throw error;
    return data;
  }

  /**
   * Fetch Profile from 'profiles' table
   */
  static async getProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('auth_user_id', userId)
      .single();

    if (error) {
      console.warn('Error fetching profile:', error.message);
      return null;
    }
    return data as UserProfile;
  }

  /**
   * Update Profile (non-sensitive fields)
   */
  static async updateProfile(userId: string, updates: Partial<UserProfile>) {
    // Delete sensitive fields that clients cannot update
    const safeUpdates = { ...updates };
    delete (safeUpdates as any).role;
    delete (safeUpdates as any).phone_verified;
    delete (safeUpdates as any).email_verified;

    const { data, error } = await supabase
      .from('profiles')
      .update({ ...safeUpdates, updated_at: new Date().toISOString() })
      .eq('auth_user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Verify Phone via Truecaller / Provider
   */
  static async verifyPhone(phoneNumber: string, truecallerPayload?: any): Promise<PhoneVerificationResult> {
    return await phoneVerificationProvider.verifyWithTruecaller(phoneNumber, truecallerPayload);
  }
}
