// src/utils/supabase/client.tsx
// Browser-side Supabase client (Vite compatible)
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn("[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env");
}

export const supabase = createClient(SUPABASE_URL || "", SUPABASE_ANON_KEY || "", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});