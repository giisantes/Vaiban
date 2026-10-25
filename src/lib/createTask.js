import { DEFAULT_PROJECT_ID, STAGES } from '../constants.js';

/**
 * A single vibecoding task — the locked data model from PRD §5.
 *
 * @typedef {Object} Task
 * @property {string} id
 * @property {string} projectId       which project's board it is on (home page)
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
 * @property {number} order             position in its column (lower = higher up). Set when a
 *                                      task is made or moved, so the order is the same on every
 *                                      teammate's screen (D63). Older tasks without one sort first.
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
    projectId: DEFAULT_PROJECT_ID,
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
    milestoneId: null, // D79
    order: Date.now(),
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

/** Sorts a column's tasks by `order`, keeping the list order for ties. */
export function byOrder(a, b) {
  return (a.order ?? 0) - (b.order ?? 0);
}

/**
 * Fills in fields that older saved tasks don't have yet (the M9 context
 * fields, and `projectId` from the home page), so older
 * localStorage data keeps working without being wiped.
 *
 * @param {Partial<Task>} task
 * @returns {Task}
 */
export function withTaskDefaults(task) {
  return { projectId: DEFAULT_PROJECT_ID, context: '', contextTool: null, contextUpdatedAt: null, milestoneId: null, ...task };
}
