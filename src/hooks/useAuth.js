import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';

/**
 * Who is signed in. Supabase tells us whenever this changes (sign in,
 * sign out, token refresh, or arriving from a password-reset link).
 *
 * @returns {{
 *   session: object | null | undefined,   // undefined while still checking
 *   user: object | null,
 *   recovering: boolean,                  // arrived from a reset link: ask for a new password
 *   doneRecovering: () => void,
 * }}
 */
export function useAuth() {
  const [session, setSession] = useState(supabase ? undefined : null);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (alive) setSession(data.session ?? null);
    });
    const { data } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession ?? null);
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return {
    session,
    user: session?.user ?? null,
    recovering,
    doneRecovering: () => setRecovering(false),
  };
}
