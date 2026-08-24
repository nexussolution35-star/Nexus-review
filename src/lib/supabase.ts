import { createClient } from "@supabase/supabase-js";

// Only the publishable (anon) key and URL are used in the browser. The service
// role key never ships to the client; it lives in Edge Function secrets.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseReady = Boolean(url && anonKey);

// A single shared client. When env vars are missing, supabaseReady is false,
// the auth gate stays open, and the store loads nothing (there is no mock data
// fallback). Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable it.
export const supabase = supabaseReady
  ? createClient(url!, anonKey!, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : (null as unknown as ReturnType<typeof createClient>);
