import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  (import.meta.env as any).REACT_APP_SUPABASE_URL ||
  'https://wsxqiiatlhfkydrgptua.supabase.co';

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  (import.meta.env as any).REACT_APP_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_BvFvNU3DQBXawK-Wgok3XA_DFZjuB_-';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
