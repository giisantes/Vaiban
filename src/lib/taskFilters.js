import { createContext, useContext } from 'react';
import { daysBetween } from './dueState.js';

/** Tags already used on the open board – suggested in the task form (recognition, not recall). */
export const BoardTagsContext = createContext([]);
export const useBoardTags = () => useContext(BoardTagsContext);

/**
 * Board filters (FR16 – D80): by member, milestone, tag and due date.
 * Every filter left on "any" lets everything through; the ones that are
 * set must all match (AND), so adding a filter only ever narrows the board.
 *
 * @typedef {{ assignee: string, milestone: string, tag: string, due: string }} Filters
 *   '' = any. assignee: a name or '__none' (unassigned). milestone: an id or '__none'.
 *   due: 'overdue' | 'week' (due in the next 7 days, not done) | 'none' (no due date).
 */

export const NO_FILTERS = { assignee: '', milestone: '', tag: '', due: '' };
export const NONE = '__none';

export const DUE_FILTERS = [
  { id: 'overdue', label: 'Overdue' },
  { id: 'week', label: 'Due in the next 7 days' },
  { id: 'none', label: 'No due date' },
];

export const TAG_LIMITS = { count: 10, length: 30 };

/** "UI, bug fix,  ui " → ["UI", "bug fix"]: trimmed, no duplicates (ignoring case), at most 10. */
export function parseTaskTags(text) {
  const seen = new Set();
  const tags = [];
  for (const raw of String(text || '').split(',')) {
    const tag = raw.trim().replace(/\s+/g, ' ').slice(0, TAG_LIMITS.length);
    if (!tag || seen.has(tag.toLowerCase())) continue;
    seen.add(tag.toLowerCase());
    tags.push(tag);
    if (tags.length === TAG_LIMITS.count) break;
  }
  return tags;
}

/** Every tag used on these tasks, A–Z (first spelling wins). */
export function boardTags(tasks) {
  const map = new Map();
  for (const t of tasks) for (const tag of t.tags ?? []) if (!map.has(tag.toLowerCase())) map.set(tag.toLowerCase(), tag);
  return [...map.values()].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

export const isFiltering = (f) => Boolean(f.assignee || f.milestone || f.tag || f.due);

/**
 * @param {object[]} tasks
 * @param {Filters} f
 * @param {string} today  'YYYY-MM-DD'
 */
export function applyFilters(tasks, f, today) {
  return tasks.filter((t) => {
    if (f.assignee && (f.assignee === NONE ? Boolean(t.assignee) : t.assignee !== f.assignee)) return false;
    if (f.milestone && (f.milestone === NONE ? Boolean(t.milestoneId) : t.milestoneId !== f.milestone)) return false;
    if (f.tag && !(t.tags ?? []).some((x) => x.toLowerCase() === f.tag.toLowerCase())) return false;
    if (f.due === 'none' && t.dueDate) return false;
    if (f.due === 'overdue' && !(t.dueDate && t.status !== 'done' && daysBetween(today, t.dueDate) < 0)) return false;
    if (f.due === 'week' && !(t.dueDate && t.status !== 'done' && daysBetween(today, t.dueDate) >= 0 && daysBetween(today, t.dueDate) <= 7)) return false;
    return true;
  });
}
