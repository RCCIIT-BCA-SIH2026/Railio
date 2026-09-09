import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  (typeof process !== 'undefined' && process.env?.REACT_APP_SUPABASE_URL) ||
  import.meta.env?.VITE_SUPABASE_URL ||
  '';

const supabaseKey =
  (typeof process !== 'undefined' && process.env?.REACT_APP_SUPABASE_PUBLISHABLE_KEY) ||
  import.meta.env?.VITE_SUPABASE_ANON_KEY ||
  '';

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder-anon-key'
);
