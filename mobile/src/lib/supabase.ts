import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  Constants.expoConfig?.extra?.supabaseUrl ||
  '';

const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  Constants.expoConfig?.extra?.supabaseAnonKey ||
  '';

import AsyncStorage from '@react-native-async-storage/async-storage';

// High-performance asynchronous storage adapter with local memory cache for zero-latency lookups
const memoryCache: Record<string, string> = {};

const asyncStorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (memoryCache[key] !== undefined) {
      return memoryCache[key];
    }
    try {
      const val = await AsyncStorage.getItem(key);
      if (val !== null) {
        memoryCache[key] = val;
      }
      return val;
    } catch {
      return memoryCache[key] || null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    memoryCache[key] = value;
    try {
      await AsyncStorage.setItem(key, value);
    } catch {}
  },
  removeItem: async (key: string): Promise<void> => {
    delete memoryCache[key];
    try {
      await AsyncStorage.removeItem(key);
    } catch {}
  },
};

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      storage: asyncStorageAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
