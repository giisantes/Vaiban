import { useCallback, useEffect, useState } from 'react';
import { applySettings, cleanSettings, readLocalSettings, writeLocalSettings } from '../lib/settings.js';

/**
 * The user's display settings.
 *
 * - Always kept in this browser too, so they apply straight away on the next
 *   visit – even before sign-in (someone who needs large text needs it on the
 *   sign-in screen as well).
 * - When signed in, also saved to the account (key "settings"), so they follow
 *   the user to other devices. A failed cloud save is ignored: the setting
 *   still works on this device.
 *
 * @param {import('../lib/storage.js').Store} store
 * @returns {[ {textSize: string, theme: string}, (changes: object) => void ]}
 */
export function useSettings(store) {
  const [settings, setSettings] = useState(readLocalSettings);

  // Apply + remember locally on every change.
  useEffect(() => {
    applySettings(settings);
    writeLocalSettings(settings);
  }, [settings]);

  // Signed in: the account's settings win over this browser's, so the same
  // settings appear on every device. If the account has none yet (first
  // sign-in), this browser's current settings are saved to the account.
  useEffect(() => {
    if (store.kind !== 'cloud') return;
    let alive = true;
    store
      .load('settings')
      .then((saved) => {
        if (!alive) return;
        if (saved) setSettings(cleanSettings(saved));
        else store.save('settings', readLocalSettings()).catch(() => {});
      })
      .catch(() => { /* keep this browser's settings */ });
    return () => { alive = false; };
  }, [store]);

  const update = useCallback(
    (changes) => {
      setSettings((prev) => {
        const next = cleanSettings({ ...prev, ...changes });
        if (store.kind === 'cloud') store.save('settings', next).catch(() => {});
        return next;
      });
    },
    [store]
  );

  return [settings, update];
}
