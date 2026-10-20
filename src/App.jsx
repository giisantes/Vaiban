import { useMemo } from 'react';
import { useAuth } from './hooks/useAuth.js';
import { signOut } from './lib/auth.js';
import { cloudStore, localStore } from './lib/storage.js';
import { supabase } from './lib/supabase.js';
import AuthScreen from './components/AuthScreen.jsx';
import FullPageMessage from './components/FullPageMessage.jsx';
import Workspace from './components/Workspace.jsx';

/**
 * Vibeboard – the entry point decides what to show:
 *
 *   accounts not set up (no Supabase keys) → the board, saved in this browser
 *   checking who is signed in               → "Loading…"
 *   arrived from a password-reset link       → "Choose a new password"
 *   signed out                               → sign in / sign up
 *   signed in                                → that user's projects (Workspace)
 *
 * The board itself (Workspace) doesn't know where its data is saved – it is
 * handed a Store (lib/storage.js, Adapter pattern).
 */
export default function App() {
  const auth = useAuth();
  const userId = auth.user?.id;
  const store = useMemo(() => (userId ? cloudStore(userId) : localStore), [userId]);

  if (!supabase) return <Workspace store={localStore} user={null} />;
  if (auth.session === undefined) return <FullPageMessage>Loading…</FullPageMessage>;
  if (auth.recovering) {
    // key: start the screen afresh in "reset" mode, even if it was already showing
    return <AuthScreen key="reset" initialMode="reset" onPasswordReset={auth.doneRecovering} />;
  }
  if (!auth.session) return <AuthScreen key="auth" />;

  // key: a different user gets a completely fresh workspace (no leftover state)
  return <Workspace key={userId} store={store} user={auth.user} onSignOut={signOut} />;
}
