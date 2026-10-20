import { createClient } from '@supabase/supabase-js';

/**
 * The one Supabase client for the whole app (accounts + database).
 *
 * The URL and the publishable ("anon") key come from environment variables –
 * `.env.local` on your computer, and Project Settings → Environment Variables
 * on Vercel. The publishable key is meant to be public: what protects the data
 * is the row-level security in supabase/schema.sql. Never use a *secret* /
 * service_role key here.
 *
 * If the variables are missing, `supabase` is null and the app runs in
 * browser-only mode (no accounts), exactly as it did before.
 */

/**
 * Accepts the URL however it was pasted and keeps only the project address:
 * "https://abc.supabase.co/rest/v1/" → "https://abc.supabase.co".
 * (The library adds /rest/v1 and /auth/v1 itself.)
 */
function cleanUrl(value) {
  if (!value) return '';
  try {
    return new URL(value.trim()).origin;
  } catch {
    return value.trim();
  }
}

const url = cleanUrl(import.meta.env.VITE_SUPABASE_URL);
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

/**
 * A setup mistake the site owner needs to fix, or '' if the settings look right.
 * A secret key must never be shipped to browsers, so the app refuses to use one.
 */
export const configError =
  url && key && /^(sb_secret_|service_role)/.test(key)
    ? 'VITE_SUPABASE_ANON_KEY is a secret key. Use the publishable key (sb_publishable_…) instead, and create a new secret key in Supabase because this one has been exposed.'
    : url && key && !/^https:\/\/.+/.test(url)
      ? `VITE_SUPABASE_URL should look like https://your-project.supabase.co (it is "${url}").`
      : '';

export const supabase =
  url && key && !configError
    ? createClient(url, key, {
        auth: {
          flowType: 'pkce',          // email links use ?code=… instead of tokens in the URL
          persistSession: true,      // stay signed in after a reload
          autoRefreshToken: true,
          detectSessionInUrl: true,  // finish sign-in from confirmation / reset links
        },
      })
    : null;
