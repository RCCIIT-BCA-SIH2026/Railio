import { supabase } from '../lib/supabase';

export interface AdminProfile {
  id: string;
  auth_user_id: string;
  full_name: string;
  email: string;
  phone_number?: string;
  role: 'user' | 'admin' | 'super_admin' | string;
  phone_verified: boolean;
  is_active: boolean;
  created_at: string;
}

export interface AdminAuditLog {
  id: string;
  admin_user_id: string;
  action: string;
  target_user_id?: string;
  metadata?: any;
  created_at: string;
}

export class AdminAuthService {
  /**
   * Admin Login with Email & Password
   */
  static async signIn(email: string, pass: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });
    if (error) throw error;
    return data;
  }

  /**
   * Admin Google OAuth
   */
  static async signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
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
   * Get Admin Profile from Supabase
   */
  static async getProfile(userId: string): Promise<AdminProfile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('auth_user_id', userId)
      .single();

    if (error) {
      console.warn('[AdminAuthService] Error fetching profile:', error.message);
      return null;
    }
    return data as AdminProfile;
  }

  /**
   * Fetch All Users (Admin permission required)
   */
  static async fetchAllProfiles(): Promise<AdminProfile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as AdminProfile[];
  }

  /**
   * Invoke Edge Function to modify user role or suspend account securely
   */
  static async executeAdminAction(
    targetUserId: string,
    action: 'UPDATE_ROLE' | 'SUSPEND_USER' | 'ACTIVATE_USER' | 'MANUAL_PHONE_VERIFY',
    newRole?: 'user' | 'admin' | 'super_admin',
    reason?: string
  ) {
    const { data, error } = await supabase.functions.invoke('admin-user-management', {
      body: { action, targetUserId, newRole, reason },
    });

    if (error) throw error;
    return data;
  }

  /**
   * Fetch Admin Audit Logs
   */
  static async fetchAuditLogs(): Promise<AdminAuditLog[]> {
    const { data, error } = await supabase
      .from('admin_audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.warn('[AdminAuthService] Error fetching audit logs:', error.message);
      return [];
    }
    return (data || []) as AdminAuditLog[];
  }
}
