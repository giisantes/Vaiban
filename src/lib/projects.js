import { ANCHORS_STORAGE_KEY, DEFAULT_PROJECT_ID } from '../constants.js';
import { defaultAnchors } from './anchors.js';
import { todayISO } from './createTask.js';

/**
 * A project: its own Kanban board and its own four deliverable links.
 * Tasks point to it with `task.projectId`.
 *
 * @typedef {Object} Project
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {string} createdDate                       ISO 'YYYY-MM-DD'
 * @property {import('./anchors.js').Anchor[]} anchors  the M11 deliverable slots
 */

const newId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : String(Date.now()) + Math.random().toString(36).slice(2, 7);

/**
 * Factory for projects – the one place a Project gets its id, defaults and
 * four empty deliverable slots (same idea as createTask(), P4).
 *
 * @param {Partial<Project>} fields
 * @returns {Project}
 */
export function createProject(fields = {}) {
  return {
    id: newId(),
    name: 'Untitled project',
    description: '',
    createdDate: todayISO(),
    anchors: defaultAnchors(),
    ...fields,
  };
}

/**
 * The starting project list. Uses the fixed DEFAULT_PROJECT_ID so tasks
 * saved before projects existed land here, and carries over any deliverable
 * links saved by M11 (which were stored on their own).
 *
 * @returns {Project[]}
 */
export function seedProjects() {
  let anchors = defaultAnchors();
  try {
    const saved = JSON.parse(window.localStorage.getItem(ANCHORS_STORAGE_KEY));
    if (Array.isArray(saved)) anchors = anchors.map((a) => ({ ...a, url: saved.find((s) => s.id === a.id)?.url ?? null }));
  } catch {
    /* nothing saved, or unreadable – start empty */
  }
  return [
    createProject({
      id: DEFAULT_PROJECT_ID,
      name: 'Vibecoding Project Tracker',
      description: 'The hackathon build – using the tracker to track itself.',
      anchors,
    }),
  ];
}
