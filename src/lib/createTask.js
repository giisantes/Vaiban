import { STAGES } from '../constants.js';

/**
 * A single vibecoding task — the locked data model from PRD §5.
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
 * @property {string} context           M9: Markdown briefing for the next AI / teammate
 * @property {string|null} contextTool  M9: one of AI_TOOLS, or null
 * @property {string|null} contextUpdatedAt  M9: ISO timestamp, set automatically on save
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
    context: '',
    contextTool: null,
    contextUpdatedAt: null,
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

/**
 * Fills in fields that tasks saved before M9 don't have yet, so older
 * localStorage data keeps working without being wiped.
 *
 * @param {Partial<Task>} task
 * @returns {Task}
 */
export function withTaskDefaults(task) {
  return { context: '', contextTool: null, contextUpdatedAt: null, ...task };
}
