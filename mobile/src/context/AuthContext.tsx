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

  const fetchUserProfile = React.useCallback(async (authUser: User) => {
    try {
      const prof = await AuthService.getProfile(authUser.id);
      setProfile(prof);
    } catch (err) {
      // Non-fatal, profile can load gracefully
    }
  }, []);

  const refreshProfile = React.useCallback(async () => {
    if (user) {
      await fetchUserProfile(user);
    }
  }, [user, fetchUserProfile]);

  useEffect(() => {
    let isMounted = true;

    // 1. Initial Session Restoration — non-blocking
    supabase.auth.getSession().then(({ data: { session: initSession } }) => {
      if (!isMounted) return;
      setSession(initSession);
      setUser(initSession?.user ?? null);
      setIsLoading(false);

      if (initSession?.user) {
        fetchUserProfile(initSession.user);
      }
    }).catch(() => {
      if (isMounted) setIsLoading(false);
    });

    // 2. Realtime Auth State Changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      if (!isMounted) return;
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      if (currentSession?.user) {
        fetchUserProfile(currentSession.user);
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  const signIn = React.useCallback(async (email: string, pass: string) => {
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
  }, [fetchUserProfile]);

  const signUp = React.useCallback(async (email: string, pass: string, fullName: string, phone?: string) => {
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
  }, [fetchUserProfile]);

  const signInWithGoogle = React.useCallback(async () => {
    await AuthService.signInWithGoogle();
  }, []);

  const signOut = React.useCallback(async () => {
    setIsLoading(true);
    try {
      await AuthService.signOut();
      setSession(null);
      setUser(null);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verifyPhone = React.useCallback(async (phone: string, truecallerPayload?: any) => {
    const res = await AuthService.verifyPhone(phone, truecallerPayload);
    if (res.success && user) {
      await fetchUserProfile(user);
    }
    return res;
  }, [user, fetchUserProfile]);

  const role = profile?.role || 'user';
  const phoneVerified = profile?.phone_verified || false;

  const contextValue = React.useMemo(() => ({
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
  }), [
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
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
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
