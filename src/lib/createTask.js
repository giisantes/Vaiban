import { STAGES } from '../constants.js';

/**
 * A single vibecoding task — the locked data model from PRD §5.
 * (The M9 context fields are added in that milestone.)
 *
 * @typedef {Object} Task
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {'feature'|'bug'} type
 * @property {'todo'|'in-progress'|'review'|'done'} status
 * @property {string} assignee          one of TEAM
 * @property {string|null} dueDate      ISO 'YYYY-MM-DD'
 * @property {string} createdDate       ISO 'YYYY-MM-DD'
 */

/** Today's date as ISO 'YYYY-MM-DD' (local time). */
export function todayISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return String(Date.now()) + Math.random().toString(36).slice(2, 7);
}

/**
 * Factory for tasks: the one place a Task gets its id, defaults and
 * system-set createdDate, so every task has the same shape.
 *
 * @param {Partial<Task>} fields  values to override the defaults
 * @returns {Task}
 */
export function createTask(fields = {}) {
  const task = {
    id: newId(),
    title: '',
    description: '',
    type: 'feature',
    status: STAGES[0].id,
    assignee: '',
    dueDate: null,
    createdDate: todayISO(),
    ...fields,
  };
  if (!STAGES.some((s) => s.id === task.status)) {
    throw new Error(`Unknown status "${task.status}"`);
  }
  if (task.type !== 'feature' && task.type !== 'bug') {
    throw new Error(`Unknown type "${task.type}"`);
  }
  return task;
}
