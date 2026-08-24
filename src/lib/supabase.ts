import { createClient } from "@supabase/supabase-js";

// Only the publishable (anon) key and URL are used in the browser. The service
// role key never ships to the client; it lives in Edge Function secrets.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseReady = Boolean(url && anonKey);

// A single shared client. When env vars are missing (e.g. a preview before
// Supabase is wired), supabaseReady is false and callers fall back to seed data.
export const supabase = supabaseReady
  ? createClient(url!, anonKey!, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : (null as unknown as ReturnType<typeof createClient>);
