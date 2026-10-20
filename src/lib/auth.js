import { supabase } from './supabase.js';

/**
 * Account actions (sign up, sign in, reset password, sign out), with
 * Supabase's error messages turned into plain English.
 *
 * Supabase does the security-critical parts on its server: passwords are
 * hashed with bcrypt and never stored or sent back, sign-in attempts are
 * rate-limited, and sessions are short-lived tokens that refresh themselves.
 */

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72; // bcrypt only uses the first 72 bytes

/**
 * Plain-English version of an auth error. Anything we don't recognise is
 * shown with Supabase's own message, so problems can actually be diagnosed.
 */
export function friendlyError(error) {
  const raw = error?.message || String(error || '');
  const msg = raw.toLowerCase();
  if (typeof console !== 'undefined') console.error('[auth]', error);
  if (msg.includes('invalid login credentials')) return "That email and password don't match an account.";
  if (msg.includes('email not confirmed')) return 'Confirm your email first – check your inbox for the link we sent.';
  if (msg.includes('already registered')) return 'There is already an account with that email. Try signing in.';
  if (msg.includes('rate limit') || msg.includes('too many')) return 'Too many attempts or emails sent. Wait a few minutes and try again.';
  if (msg.includes('sending') && msg.includes('email')) return "Couldn't send the confirmation email. (Site owner: check the email settings in Supabase → Authentication.)";
  if (msg.includes('signups not allowed') || msg.includes('signup is disabled')) return 'New sign-ups are switched off at the moment.';
  if (msg.includes('invalid path') || msg.includes('invalid api key') || msg.includes('no api key')) return 'The app is not connected to its database correctly. (Site owner: check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.)';
  if (msg.includes('email') && msg.includes('invalid')) return "That email address wasn't accepted. Check it for typos.";
  if (msg.includes('password')) return raw;
  if (msg.includes('fetch') || msg.includes('network')) return "Can't reach the server. Check your internet connection.";
  return `Something went wrong: ${raw || 'unknown error'}`;
}

/** Checks a new password before it is sent. Returns an error message or ''. */
export function checkPassword(password) {
  if (password.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`;
  if (new TextEncoder().encode(password).length > PASSWORD_MAX) return `Use at most ${PASSWORD_MAX} characters.`;
  return '';
}

/**
 * @returns {Promise<{ needsConfirmation: boolean }>}  true when Supabase has
 *          sent a confirmation email (the account can't be used until then)
 */
export async function signUp({ name, username, email, password }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, username },            // A1 data requirements: name + display name
      emailRedirectTo: window.location.origin,
    },
  });
  if (error) throw error;
  return { needsConfirmation: !data.session };
}

export async function signIn({ email, password }) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

/** Sends a reset link. Always "succeeds" so it never reveals who has an account. */
export async function sendPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
  if (error && !/user|not found/i.test(error.message)) throw error;
}

export async function setNewPassword(password) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

export async function signOut() {
  await supabase.auth.signOut();
}

/** What to call the signed-in person in the header. */
export function displayName(user) {
  const meta = user?.user_metadata ?? {};
  return meta.username || meta.name || user?.email || '';
}
