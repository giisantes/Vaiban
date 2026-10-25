import { createContext, useContext } from 'react';

/**
 * Addresses for the libraries (D69), kept in the URL hash like the boards, so
 * Back, reload and links work:
 *
 *   #/library/prompts                          all prompts you can see
 *   #/library/prompts?board=<id>               one board's prompts (or board=private)
 *   #/library/prompts?id=<prompt id>           one prompt open
 *   #/library/prompts?new=1&board=<id>&task=<task id>   new prompt, already linked to a task
 *   #/library/skills…                          the same for AI skills
 */
const PATHS = { prompts: 'prompt', skills: 'skill' };

/** @returns {{ kind: 'prompt'|'skill', board: string, id: string|null, isNew: boolean, task: string|null } | null} */
export function parseLibraryRoute(hash = window.location.hash) {
  const match = hash.match(/^#\/library\/(prompts|skills)(?:\?(.*))?$/);
  if (!match) return null;
  const q = new URLSearchParams(match[2] || '');
  return { kind: PATHS[match[1]], board: q.get('board') || 'all', id: q.get('id'), isNew: q.get('new') === '1', task: q.get('task') };
}

/** The hash for a library view (without the leading "#"). */
export function libraryHash({ kind = 'prompt', board = 'all', id = null, isNew = false, task = null } = {}) {
  const q = new URLSearchParams();
  if (board && board !== 'all') q.set('board', board);
  if (id) q.set('id', id);
  if (isNew) q.set('new', '1');
  if (task) q.set('task', task);
  const query = q.toString();
  return `/library/${kind === 'skill' ? 'skills' : 'prompts'}${query ? `?${query}` : ''}`;
}

/**
 * The libraries, shared with the board, the task window and the library page
 * through one React Context – instead of passing them through every component
 * in between (the prop-drilling fix in P5).
 *
 * @typedef {{
 *   prompts: import('./library.js').LibraryItem[],
 *   skills: import('./library.js').LibraryItem[],
 *   openLibrary: (route: object) => void,
 * }} Library
 */
export const LibraryContext = createContext({ prompts: [], skills: [], openLibrary: () => {} });
export const useLibraryContext = () => useContext(LibraryContext);
