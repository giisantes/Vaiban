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

/** Options for `Task.contextTool` (PRD §5, M9). */
export const AI_TOOLS = ['Claude', 'ChatGPT', 'Cursor', 'Lovable', 'Replit', 'Other'];

/**
 * Starting text for a new task's Context field (M9). Headings give the
 * writer a structure to fill in; empty ones are left out when copied (M10).
 */
export const CONTEXT_TEMPLATE = `## Background


## Constraints


## Tried so far


## Pick up from here
`;

/** The four pinned deliverable slots on the Anchor Board (PRD §5, M11). */
export const ANCHORS = [
  { id: 'presentation',  label: 'Presentation' },
  { id: 'demo',          label: 'Demo' },
  { id: 'report',        label: 'Report' },
  { id: 'documentation', label: 'Documentation' },
];

/** localStorage key for the Anchor Board. */
export const ANCHORS_STORAGE_KEY = 'vibetracker.anchors';

/** localStorage key for the list of projects (home page). */
export const PROJECTS_STORAGE_KEY = 'vibetracker.projects';

/**
 * Tasks saved before projects existed belong to this project, so nothing
 * on an existing board goes missing.
 */
export const DEFAULT_PROJECT_ID = 'project-tracker';
