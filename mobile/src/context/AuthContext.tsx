import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { AuthService, UserProfile } from '../services/authService';
import { PhoneVerificationResult } from '../services/phoneVerificationProvider';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  role: string;
  phoneVerified: boolean;
  signIn: (email: string, pass: string) => Promise<void>;
  signUp: (email: string, pass: string, fullName: string, phone?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  verifyPhone: (phone: string, truecallerPayload?: any) => Promise<PhoneVerificationResult>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchUserProfile = async (authUser: User) => {
    try {
      const prof = await AuthService.getProfile(authUser.id);
      setProfile(prof);
    } catch (err) {
      console.warn('[AuthContext] Failed to load profile:', err);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchUserProfile(user);
    }
  };

  useEffect(() => {
    // 1. Initial Session Restoration
    supabase.auth.getSession().then(({ data: { session: initSession } }) => {
      setSession(initSession);
      setUser(initSession?.user ?? null);
      if (initSession?.user) {
        fetchUserProfile(initSession.user).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    // 2. Realtime Auth State Changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      if (currentSession?.user) {
        await fetchUserProfile(currentSession.user);
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const data = await AuthService.signIn(email, pass);
      setSession(data.session);
      setUser(data.user);
      if (data.user) {
        await fetchUserProfile(data.user);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, pass: string, fullName: string, phone?: string) => {
    setIsLoading(true);
    try {
      const data = await AuthService.signUp(email, pass, fullName, phone);
      setSession(data.session);
      setUser(data.user);
      if (data.user) {
        await fetchUserProfile(data.user);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    await AuthService.signInWithGoogle();
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      await AuthService.signOut();
      setSession(null);
      setUser(null);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyPhone = async (phone: string, truecallerPayload?: any) => {
    const res = await AuthService.verifyPhone(phone, truecallerPayload);
    if (res.success) {
      await refreshProfile();
    }
    return res;
  };

  const role = profile?.role || 'user';
  const phoneVerified = profile?.phone_verified || false;

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        isLoading,
        role,
        phoneVerified,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        verifyPhone,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
