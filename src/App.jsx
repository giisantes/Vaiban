import { useMemo } from 'react';
import { useAuth } from './hooks/useAuth.js';
import { useHash } from './hooks/useHash.js';
import { useSettings } from './hooks/useSettings.js';
import { signOut } from './lib/auth.js';
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
 * Vibeboard – the entry point decides what to show:
 *
 *   #/accessibility                          → the accessibility statement (signed in or not)
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
  const hash = useHash();
  // Display settings (text size, theme) – D59, D60.
  const [settings, updateSettings] = useSettings(store);
  const settingsProps = { settings, onSettingsChange: updateSettings };

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
  if (!auth.session) return <AuthScreen key="auth" {...settingsProps} />;

  // key: a different user gets a completely fresh workspace (no leftover state)
  return <Workspace key={userId} store={store} user={auth.user} onSignOut={signOut} {...settingsProps} />;
}
