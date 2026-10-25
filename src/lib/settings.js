/**
 * Display settings (D59, D60): text size and colour theme.
 *
 * They are applied as attributes on <html> – `data-text-size` and
 * `data-theme` – and index.css does the rest, so no component needs to know
 * about them.
 */

// The id 'standard' is kept for the default so settings saved before still load.
export const TEXT_SIZES = [
  { id: 'smaller',  label: 'Smaller' },
  { id: 'standard', label: 'Default' },
  { id: 'larger',   label: 'Larger' },
];

export const THEMES = [
  { id: 'system', label: 'System default' },
  { id: 'light',  label: 'Light' },
  { id: 'dark',   label: 'Dark' },
];

/** Default text size and "follow the device" are the defaults (D59, D60). */
export const DEFAULT_SETTINGS = { textSize: 'standard', theme: 'system' };

const LOCAL_KEY = 'vibetracker.settings';

/** Keeps only known values, so a bad saved value can't break the page. */
export function cleanSettings(raw) {
  const s = { ...DEFAULT_SETTINGS, ...(raw && typeof raw === 'object' ? raw : {}) };
  if (!TEXT_SIZES.some((t) => t.id === s.textSize)) s.textSize = DEFAULT_SETTINGS.textSize;
  if (!THEMES.some((t) => t.id === s.theme)) s.theme = DEFAULT_SETTINGS.theme;
  return { textSize: s.textSize, theme: s.theme };
}

/** This browser's saved settings (used before sign-in, and to avoid a flash on load). */
export function readLocalSettings() {
  try {
    return cleanSettings(JSON.parse(window.localStorage.getItem(LOCAL_KEY) || 'null'));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function writeLocalSettings(settings) {
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(settings));
  } catch {
    /* private mode etc. – the setting still applies for this visit */
  }
}

/** Puts the settings on <html>, where index.css picks them up. */
export function applySettings(settings) {
  const root = document.documentElement;
  if (settings.textSize === 'standard') delete root.dataset.textSize;
  else root.dataset.textSize = settings.textSize;
  if (settings.theme === 'system') delete root.dataset.theme;
  else root.dataset.theme = settings.theme;
}
