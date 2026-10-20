// Shared constants, defined once and imported everywhere
// (avoids hard-coded values scattered across components).

/** The four columns of the board, in render order (PRD §7). Use these IDs everywhere. */
export const STAGES = [
  { id: 'todo',        label: 'To Do' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'review',      label: 'Review' },
  { id: 'done',        label: 'Done' },
];

/** Allowed values for `Task.type` (PRD §5), with display labels. */
export const TASK_TYPES = [
  { id: 'feature', label: 'Feature' },
  { id: 'bug',     label: 'Bug' },
];

/**
 * Allowed values for `Task.assignee` (PRD §8).
 * Replace these placeholders with the names from PRD §8.
 */
export const TEAM = ['Teammate A', 'Teammate B', 'Teammate C'];

/** localStorage key for the task list. */
export const TASKS_STORAGE_KEY = 'vibetracker.tasks';
