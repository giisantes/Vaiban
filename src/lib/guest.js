/**
 * Using Vaiban without an account (D74).
 *
 * Signed-out visitors get the browser-only workspace: boards, tasks, prompts
 * and AI skills are saved in this browser (localStorage, via localStore).
 * When they sign in or create an account, everything they made here is moved
 * into the account (Workspace.jsx → useGuestSync) and then removed from the
 * browser, so it can't be copied into a second account later.
 *
 * Only real work is moved: the example boards every new visitor starts with
 * are saved straight away (so they survive a reload), so a flag records
 * whether the visitor actually changed anything. Untouched examples stay behind.
 */

const PREFIX = 'vibetracker.';
const KEYS = ['projects', 'tasks', 'prompts', 'skills'];
const CHANGED = PREFIX + 'guestChanged';

const read = (key) => {
  try {
    const value = JSON.parse(window.localStorage.getItem(PREFIX + key) || 'null');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

const write = (key, value) => {
  try {
    if (value.length) window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
    else window.localStorage.removeItem(PREFIX + key);
  } catch {
    /* storage blocked – nothing to move */
  }
};

/** Called whenever a signed-out visitor changes a board, task, prompt or skill. */
export function markGuestChanged() {
  try { window.localStorage.setItem(CHANGED, '1'); } catch { /* ignore */ }
}

/**
 * What this browser has to move into an account, or null if nothing.
 * @returns {{ projects: object[], tasks: object[], prompts: object[], skills: object[] } | null}
 */
export function readGuestData() {
  try {
    if (!window.localStorage.getItem(CHANGED)) return null;
  } catch {
    return null;
  }
  const data = Object.fromEntries(KEYS.map((k) => [k, read(k)]));
  return KEYS.some((k) => data[k].length) ? data : null;
}

/** Boards and tasks have been handed to the account – take them out of the browser. */
export function clearGuestBoards() {
  write('projects', []);
  write('tasks', []);
}

/** Keep the prompts/skills that still need moving (e.g. after a failed save). */
export function writeGuestLibrary(prompts, skills) {
  write('prompts', prompts);
  write('skills', skills);
}

/** Everything has been moved. */
export function finishGuestSync() {
  KEYS.forEach((k) => write(k, []));
  try { window.localStorage.removeItem(CHANGED); } catch { /* ignore */ }
}
