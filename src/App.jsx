import { useEffect, useMemo, useState } from 'react';
import { useAuth } from './hooks/useAuth.js';
import { useHash } from './hooks/useHash.js';
import { useSettings } from './hooks/useSettings.js';
import { signOut } from './lib/auth.js';
import { joinTokenFromHash, rememberJoinToken } from './lib/joinToken.js';
import { applySettings, readLocalSettings } from './lib/settings.js';
import { cloudStore, localStore } from './lib/storage.js';
import { configError, supabase } from './lib/supabase.js';
import AccessibilityStatement from './components/AccessibilityStatement.jsx';
import AuthScreen from './components/AuthScreen.jsx';
import FullPageMessage from './components/FullPageMessage.jsx';
import Workspace from './components/Workspace.jsx';

// Apply this browser's saved text size and theme before the first render,
// so the page doesn't flash at the wrong size or colour.
applySettings(readLocalSettings());

/**
 * Vaiban – the entry point decides what to show:
 *
 *   #/accessibility                          → the accessibility statement (signed in or not)
 *   accounts not set up (no Supabase keys) → the board, saved in this browser
 *   checking who is signed in               → "Loading…"
 *   arrived from a password-reset link       → "Choose a new password"
 *   signed out                               → the board, saved in this browser (D74),
 *                                              with Sign in / Create account buttons
 *   signed out, chose Sign in                → sign in / sign up
 *   signed out, opened an invite link        → sign in / sign up (joining needs an account)
 *   signed in                                → that user's projects (Workspace); anything
 *                                              made before signing in moves into the account
 *
 * The board itself (Workspace) doesn't know where its data is saved – it is
 * handed a Store (lib/storage.js, Adapter pattern).
 */
export default function App() {
  const auth = useAuth();
  const userId = auth.user?.id;
  const store = useMemo(() => (userId ? cloudStore(userId) : localStore), [userId]);
  const hash = useHash();
  // Display settings (text size, theme) – D59, D60.
  const [settings, updateSettings] = useSettings(store);
  const settingsProps = { settings, onSettingsChange: updateSettings };
  // D74: null = use Vaiban without an account; 'signin' / 'signup' = show that screen.
  const [authMode, setAuthMode] = useState(null);
  // After signing in (or out), the next signed-out visit starts on the board again.
  useEffect(() => { if (auth.session) setAuthMode(null); }, [auth.session]);

  if (hash === '#/accessibility') return <AccessibilityStatement />;

  if (configError) {
    return (
      <FullPageMessage>
        <p className="font-semibold text-due-overdue">Accounts are set up incorrectly.</p>
        <p className="mt-2">{configError}</p>
      </FullPageMessage>
    );
  }
  if (!supabase) return <Workspace store={localStore} user={null} {...settingsProps} />;
  if (auth.session === undefined) return <FullPageMessage>Loading…</FullPageMessage>;
  if (auth.recovering) {
    // key: start the screen afresh in "reset" mode, even if it was already showing
    return <AuthScreen key="reset" initialMode="reset" onPasswordReset={auth.doneRecovering} {...settingsProps} />;
  }
  if (!auth.session) {
    // D62: opened an invite link while signed out – keep it for after sign-in.
    const joinToken = joinTokenFromHash(hash);
    if (joinToken) rememberJoinToken(joinToken);
    if (joinToken || authMode) {
      return (
        <AuthScreen
          key={`auth-${authMode}`}
          initialMode={authMode === 'signup' ? 'signup' : 'signin'}
          joining={Boolean(joinToken)}
          onContinueWithout={joinToken ? undefined : () => setAuthMode(null)}
          {...settingsProps}
        />
      );
    }
    return <Workspace key="guest" store={localStore} user={null} onSignIn={setAuthMode} {...settingsProps} />;
  }

  // key: a different user gets a completely fresh workspace (no leftover state)
  return <Workspace key={userId} store={store} user={auth.user} onSignOut={signOut} {...settingsProps} />;
}
