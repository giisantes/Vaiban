import { supabase } from './supabase.js';

/**
 * Storage – the Adapter pattern (P3 in the design log).
 *
 * The board only ever calls `store.load(key)` and `store.save(key, value)`.
 * Behind that sit two interchangeable "adapters":
 *
 *   localStore      – this browser's localStorage (no accounts; the
 *                     original hackathon behaviour, keys `vibetracker.*`)
 *   cloudStore(id)  – the signed-in user's rows in the Supabase
 *                     `user_data` table, protected by row-level security
 *
 * So switching from browser-only to real accounts didn't change any
 * board component.
 *
 * @typedef {{ kind: 'local'|'cloud', load: (key: string) => Promise<any>, save: (key: string, value: any) => Promise<void> }} Store
 */

const LOCAL_PREFIX = 'vibetracker.';

/** @type {Store} */
export const localStore = {
  kind: 'local',
  async load(key) {
    try {
      const raw = window.localStorage.getItem(LOCAL_PREFIX + key);
      return raw == null ? undefined : JSON.parse(raw);
    } catch {
      return undefined;
    }
  },
  async save(key, value) {
    window.localStorage.setItem(LOCAL_PREFIX + key, JSON.stringify(value));
  },
};

/**
 * @param {string} userId  the signed-in user's id (auth.uid() in the database)
 * @returns {Store}
 */
export function cloudStore(userId) {
  return {
    kind: 'cloud',
    async load(key) {
      const { data, error } = await supabase
        .from('user_data')
        .select('value')
        .eq('user_id', userId)
        .eq('key', key)
        .maybeSingle();
      if (error) throw error;
      return data?.value ?? undefined;
    },
    async save(key, value) {
      const { error } = await supabase
        .from('user_data')
        .upsert({ user_id: userId, key, value, updated_at: new Date().toISOString() }, { onConflict: 'user_id,key' });
      if (error) throw error;
    },
  };
}

/** Tasks / projects saved in this browser before accounts existed (for the import offer). */
export function readLocalData() {
  try {
    const tasks = JSON.parse(window.localStorage.getItem(LOCAL_PREFIX + 'tasks') || 'null');
    const projects = JSON.parse(window.localStorage.getItem(LOCAL_PREFIX + 'projects') || 'null');
    return Array.isArray(tasks) && tasks.length ? { tasks, projects: Array.isArray(projects) ? projects : null } : null;
  } catch {
    return null;
  }
}
