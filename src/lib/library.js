import { DEFAULT_PROJECT_ID } from '../constants.js';

/**
 * The prompt library and the AI skills library (D69–D71): data model,
 * factory, tags and search. Same idea as createTask() (P4) – one place that
 * gives every item its id, defaults and dates.
 *
 * @typedef {Object} LibraryItem
 * @property {string} id
 * @property {'prompt'|'skill'} kind
 * @property {string|null} boardId      the board whose team library it is in; null = private
 * @property {string} name
 * @property {string[]} tags
 * @property {string|null} aiTool       one of AI_TOOLS, or null
 * @property {string} ownerId           who created it (set by the database in cloud mode)
 * @property {string} authorName
 * @property {string} createdAt         ISO timestamp
 * @property {string} updatedAt         ISO timestamp
 * Prompts only:
 * @property {string} [body]            the prompt itself
 * @property {string} [result]          what it produced
 * @property {string[]} [taskIds]       the tasks it was used for (on the same board)
 * Skills only:
 * @property {string} [overview]        a short summary
 * @property {string} [instructions]    how to use it
 */

export const KINDS = {
  prompt: { label: 'Prompt', plural: 'Prompts', title: 'Prompt library', path: 'prompts' },
  skill: { label: 'AI skill', plural: 'AI skills', title: 'AI skills library', path: 'skills' },
};

/** Limits, matching supabase/migrations/005_prompt_library.sql. */
export const LIMITS = { name: 120, body: 20000, result: 50000, overview: 2000, instructions: 50000, tags: 20, tagLength: 40 };

const newId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : String(Date.now()) + Math.random().toString(36).slice(2, 7);

/**
 * @param {'prompt'|'skill'} kind
 * @param {Partial<LibraryItem>} fields
 * @returns {LibraryItem}
 */
export function createLibraryItem(kind, fields = {}) {
  const now = new Date().toISOString();
  const base = { id: newId(), kind, boardId: null, name: '', tags: [], aiTool: null, ownerId: '', authorName: '', createdAt: now, updatedAt: now };
  const extra = kind === 'prompt' ? { body: '', result: '', taskIds: [] } : { overview: '', instructions: '' };
  return { ...base, ...extra, ...fields, kind };
}

/**
 * "UI, copy,  ui , Onboarding" → ["UI", "copy", "Onboarding"]: trimmed,
 * duplicates removed (ignoring case), at most 20, each at most 40 characters.
 */
export function parseTags(text) {
  const seen = new Set();
  const tags = [];
  for (const raw of String(text || '').split(',')) {
    const tag = raw.trim().replace(/\s+/g, ' ').slice(0, LIMITS.tagLength);
    if (!tag || seen.has(tag.toLowerCase())) continue;
    seen.add(tag.toLowerCase());
    tags.push(tag);
    if (tags.length === LIMITS.tags) break;
  }
  return tags;
}

/** Every tag used by these items, sorted A–Z (case-insensitive, first spelling wins). */
export function allTags(items) {
  const map = new Map();
  for (const item of items) for (const tag of item.tags) if (!map.has(tag.toLowerCase())) map.set(tag.toLowerCase(), tag);
  return [...map.values()].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

/** The words the search box looks through: name, tags and the item's text. */
function searchText(item) {
  return [item.name, item.tags.join(' '), item.body, item.result, item.overview, item.instructions, item.aiTool, item.authorName]
    .filter(Boolean)
    .join(' \n ')
    .toLowerCase();
}

/**
 * Search + filters (FR37–FR39). Every word typed must appear somewhere in the
 * item, in any order ("login bug" finds "Fix the bug in login").
 *
 * @param {LibraryItem[]} items
 * @param {{ query?: string, board?: string, tag?: string }} filters
 *        board: 'all' | 'private' | a board id; tag: '' (any) or a tag
 */
export function filterItems(items, { query = '', board = 'all', tag = '' } = {}) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return items
    .filter((item) => board === 'all' || (board === 'private' ? item.boardId === null : item.boardId === board))
    .filter((item) => !tag || item.tags.some((t) => t.toLowerCase() === tag.toLowerCase()))
    .filter((item) => {
      if (!words.length) return true;
      const text = searchText(item);
      return words.every((w) => text.includes(w));
    })
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
}

/** Browser-only mode starts with one example of each, so the pages aren't empty. */
export function seedPrompts() {
  return [
    createLibraryItem('prompt', {
      boardId: DEFAULT_PROJECT_ID,
      name: 'Build a kanban column component',
      tags: ['React', 'UI'],
      aiTool: 'Claude',
      body:
        'Write a React component for one kanban column. It gets a title and a list of task cards, shows a count of the cards, and says "Nothing here yet." when the list is empty. Use Tailwind classes and make it work by keyboard.',
      result: 'Produced Column.jsx with a heading, a task count for screen readers and an empty state. Needed one fix: the count was not announced.',
      authorName: 'You',
    }),
  ];
}

export function seedSkills() {
  return [
    createLibraryItem('skill', {
      boardId: null,
      name: 'Accessibility review',
      tags: ['Accessibility'],
      aiTool: 'Claude',
      overview: 'Checks a screen against WCAG 2.2 AA before it is merged.',
      instructions:
        '1. Paste the component code and a screenshot.\n2. Ask: "Review this against WCAG 2.2 AA. List each problem with the success criterion it breaks and a fix."\n3. Check every suggestion yourself before applying it.',
      authorName: 'You',
    }),
  ];
}
