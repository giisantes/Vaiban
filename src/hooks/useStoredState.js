import { useEffect, useRef, useState } from 'react';

/**
 * Like useState, but loaded from and saved to a Store (lib/storage.js).
 * Replaces the starter's useLocalStorage now that data can live in the cloud.
 *
 * - Loads once when the store or key changes (`value` is undefined until then).
 * - Saves after every change – straight away locally, after a 0.6 s pause in
 *   the cloud so typing doesn't send a request per key press.
 * - If a save fails (e.g. offline) it retries every 5 seconds.
 *
 * @template T
 * @param {import('../lib/storage.js').Store} store
 * @param {string} key
 * @param {() => T} makeInitial   used when nothing has been saved yet
 * @returns {[T | undefined, (v: T | ((prev: T) => T)) => void, 'loading'|'saving'|'saved'|'error'|'load-error', () => void]}
 *          value, setter, save status, and a retry function for a failed load
 */
export function useStoredState(store, key, makeInitial) {
  const [value, setValue] = useState(undefined);
  const [status, setStatus] = useState('loading');
  const [attempt, setAttempt] = useState(0);
  const loaded = useRef(false);
  const justLoaded = useRef(false);
  const initial = useRef(makeInitial);

  // Load
  useEffect(() => {
    let alive = true;
    loaded.current = false;
    setStatus('loading');
    store
      .load(key)
      .then((saved) => {
        if (!alive) return;
        const nothingSaved = saved === undefined || saved === null;
        // Don't send back what we just loaded – but do save a freshly made
        // starting value, so it stays the same after a reload.
        justLoaded.current = !nothingSaved;
        loaded.current = true;
        setValue(nothingSaved ? initial.current() : saved);
        setStatus('saved');
      })
      .catch(() => alive && setStatus('load-error'));
    return () => { alive = false; };
  }, [store, key, attempt]);

  // Save after each change (but not the value that was just loaded)
  useEffect(() => {
    if (!loaded.current) return;
    if (justLoaded.current) { justLoaded.current = false; return; }
    let alive = true;
    let retry;
    setStatus('saving');
    const save = () =>
      store
        .save(key, value)
        .then(() => alive && setStatus('saved'))
        .catch(() => {
          if (!alive) return;
          setStatus('error');
          retry = setTimeout(save, 5000);
        });
    const timer = setTimeout(save, store.kind === 'cloud' ? 600 : 0);
    return () => { alive = false; clearTimeout(timer); clearTimeout(retry); };
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  return [value, setValue, status, () => setAttempt((n) => n + 1)];
}
