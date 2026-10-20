import { createClient } from '@supabase/supabase-js';

/**
 * The one Supabase client for the whole app (accounts + database).
 *
 * The URL and the "anon" key come from environment variables – `.env.local`
 * on your computer, and Project Settings → Environment Variables on Vercel.
 * The anon key is meant to be public: what protects the data is the
 * row-level security in supabase/schema.sql, not keeping this key secret.
 * Never put the *service_role* key in the front end.
 *
 * If the variables are missing, `supabase` is null and the app runs in
 * browser-only mode (no accounts), exactly as it did before.
 */
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          flowType: 'pkce',          // email links use ?code=… instead of tokens in the URL
          persistSession: true,      // stay signed in after a reload
          autoRefreshToken: true,
          detectSessionInUrl: true,  // finish sign-in from confirmation / reset links
        },
      })
    : null;
