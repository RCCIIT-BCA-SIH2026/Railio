import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  (typeof process !== 'undefined' && process.env?.REACT_APP_SUPABASE_URL) ||
  import.meta.env?.VITE_SUPABASE_URL ||
  'https://wsxqiiatlhfkydrgptua.supabase.co';

const supabaseKey =
  (typeof process !== 'undefined' && process.env?.REACT_APP_SUPABASE_PUBLISHABLE_KEY) ||
  import.meta.env?.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_BvFvNU3DQBXawK-Wgok3XA_DFZjuB_-';

export const supabase = createClient(supabaseUrl, supabaseKey);
