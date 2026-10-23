/**
 * Keeps an invite link's token while someone signs in or creates an account
 * (D62). Confirming a new account opens the site from the email, without the
 * #/join/… part, so the token is remembered in this browser for a day.
 */
const KEY = 'vibetracker.joinToken';
const DAY = 24 * 60 * 60 * 1000;

/** The token in the address bar (#/join/<token>), or null. */
export function joinTokenFromHash(hash = window.location.hash) {
  const match = hash.match(/^#\/join\/([A-Za-z0-9]{16,128})$/);
  return match ? match[1] : null;
}

export function rememberJoinToken(token) {
  try { window.localStorage.setItem(KEY, JSON.stringify({ token, at: Date.now() })); } catch { /* ignore */ }
}

/** Returns a remembered token (if under a day old) and forgets it. */
export function takeJoinToken() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(KEY) || 'null');
    window.localStorage.removeItem(KEY);
    return saved && Date.now() - saved.at < DAY ? saved.token : null;
  } catch {
    return null;
  }
}
