import { useState, useEffect } from 'react';

/**
 * A tiny localStorage hook — survives reloads, no library needed.
 * (Moved unchanged from the starter's App.jsx.)
 *
 * @template T
 * @param {string} key                  localStorage key
 * @param {T} initialValue              used when nothing is stored yet
 * @returns {[T, (value: T | ((prev: T) => T)) => void]}
 *
 * @example
 * const [tasks, setTasks] = useLocalStorage('vibetracker.tasks', []);
 */
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw != null ? JSON.parse(raw) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* quota or private-mode error — silently ignore for hackathon */
    }
  }, [key, value]);

  return [value, setValue];
}
