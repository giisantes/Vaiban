import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/boardsApi.js';
import { seedPrompts, seedSkills } from '../lib/library.js';
import { useStoredState } from './useStoredState.js';

/**
 * Where the prompt and AI skills libraries are kept (D69). Two versions with
 * the same shape, like the boards (D62):
 *
 *   useLocalLibrary  – browser-only mode: saved in this browser (localStorage)
 *   useCloudLibrary  – accounts: the prompts / ai_skills tables, with live updates
 *
 * Both return { loaded, prompts, skills, save(item), remove(item) }. save and
 * remove return a Promise, so the library page can say if something failed.
 */

const touch = (item) => ({ ...item, updatedAt: new Date().toISOString() });
const upsertIn = (list, item) => (list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item]);

export function useLocalLibrary(store) {
  const [prompts, setPrompts] = useStoredState(store, 'prompts', seedPrompts);
  const [skills, setSkills] = useStoredState(store, 'skills', seedSkills);
  const setter = (kind) => (kind === 'prompt' ? setPrompts : setSkills);
  return {
    loaded: prompts !== undefined && skills !== undefined,
    prompts: prompts ?? [],
    skills: skills ?? [],
    save: async (item) => {
      const saved = touch({ ...item, authorName: item.authorName || 'You' });
      setter(item.kind)((list) => upsertIn(list ?? [], saved));
      return saved;
    },
    remove: async (item) => setter(item.kind)((list) => (list ?? []).filter((x) => x.id !== item.id)),
  };
}

/**
 * @param {{ id: string }} user
 * @param {string} myName   shown as the author until the database confirms it
 */
export function useCloudLibrary(user, myName) {
  const [state, setState] = useState(null); // { prompts, skills } once loaded
  const current = useRef({ prompts: [], skills: [] });
  const loadedOnce = useRef(false);
  const commit = useCallback((next) => { current.current = next; setState(next); }, []);

  const reload = useCallback(async () => {
    try {
      const [prompts, skills] = await Promise.all([api.loadLibrary('prompt'), api.loadLibrary('skill')]);
      loadedOnce.current = true;
      commit({ prompts, skills });
    } catch {
      // First load failed: show the library as unavailable. A later reload
      // failing (e.g. briefly offline) keeps what is already on screen.
      if (!loadedOnce.current) commit({ prompts: [], skills: [], failed: true });
    }
  }, [commit]);

  // Several live events often arrive together; reload once for all of them.
  const reloadSoon = useMemo(() => {
    let timer;
    return () => { clearTimeout(timer); timer = setTimeout(reload, 300); };
  }, [reload]);

  useEffect(() => { reload(); }, [reload]);
  useEffect(() => api.subscribeLibrary(user.id, reloadSoon), [user.id, reloadSoon]);
  useEffect(() => {
    const recheck = () => document.visibilityState === 'visible' && reloadSoon();
    document.addEventListener('visibilitychange', recheck);
    return () => document.removeEventListener('visibilitychange', recheck);
  }, [reloadSoon]);

  const key = (kind) => (kind === 'prompt' ? 'prompts' : 'skills');

  // Show the change straight away; if the database refuses it, put the list back and say why.
  const save = useCallback(async (item) => {
    const listKey = key(item.kind);
    const before = current.current;
    const exists = before[listKey].some((x) => x.id === item.id);
    const saved = touch(exists ? item : { ...item, ownerId: user.id, authorName: myName });
    commit({ ...before, [listKey]: upsertIn(before[listKey], saved) });
    try {
      if (exists) await api.updateLibraryItem(saved);
      else await api.createLibraryItem(saved);
      reloadSoon();
      return saved;
    } catch (error) {
      reload();
      throw error;
    }
  }, [commit, reload, reloadSoon, user.id, myName]);

  const remove = useCallback(async (item) => {
    const listKey = key(item.kind);
    const before = current.current;
    commit({ ...before, [listKey]: before[listKey].filter((x) => x.id !== item.id) });
    try {
      await api.deleteLibraryItem(item);
    } catch (error) {
      reload();
      throw error;
    }
  }, [commit, reload]);

  return {
    loaded: state !== null,
    failed: Boolean(state?.failed),
    prompts: state?.prompts ?? [],
    skills: state?.skills ?? [],
    save,
    remove,
  };
}
