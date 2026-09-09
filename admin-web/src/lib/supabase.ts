import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  (import.meta.env as any).REACT_APP_SUPABASE_URL ||
  '';

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  (import.meta.env as any).REACT_APP_SUPABASE_PUBLISHABLE_KEY ||
  '';

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);
