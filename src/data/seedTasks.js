import { TEAM } from '../constants.js';
import { createTask, todayISO } from '../lib/createTask.js';

/** ISO date `days` from today (negative = in the past). */
function daysFromToday(days) {
  const d = new Date(todayISO());
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** ISO timestamp `hours` ago. */
function hoursAgo(hours) {
  return new Date(Date.now() - hours * 3600000).toISOString();
}

/**
 * Mock tasks so the board is not empty on first load (M4).
 * One per column, both types, and a mix of due dates – together they show
 * every M8 due state (calm, warning, overdue, done/neutral).
 * Assignees come from TEAM, so they update when the PRD §8 names are filled in.
 *
 * @returns {import('../lib/createTask.js').Task[]}
 */
export function seedTasks() {
  return [
    createTask({
      title: 'Add / edit task modal',
      description: 'A "+" button and a click-to-edit modal with every task field.',
      type: 'feature',
      status: 'todo',
      assignee: TEAM[0],
      dueDate: daysFromToday(3),
      context: `## Background
React + Vite + Tailwind, state in localStorage. Tasks follow the locked model in PRD §5.

## Constraints
- Native <dialog> for focus trapping and Escape.
- Only the title is required.

## Pick up from here
Add the inline delete confirmation.`,
      contextTool: 'Claude',
      contextUpdatedAt: hoursAgo(2),
    }),
    createTask({
      title: 'Render the four-column board',
      description: 'Columns from STAGES; cards show the title and assignee.',
      type: 'feature',
      status: 'in-progress',
      assignee: TEAM[1],
      dueDate: daysFromToday(0),
    }),
    createTask({
      title: 'Design tokens missing from Tailwind config',
      description: 'The DESIGN.md colours are not in tailwind.config.js yet.',
      type: 'bug',
      status: 'review',
      assignee: TEAM[2],
      dueDate: daysFromToday(-1),
      context: `## Background
Components still use arbitrary values like bg-[#23466E].

## Tried so far
Added the feature/bug colours in M6; brand and due colours still missing.

## Pick up from here
Add brand + due tokens to tailwind.config.js, then replace the arbitrary values.`,
      contextTool: 'ChatGPT',
      contextUpdatedAt: hoursAgo(26),
    }),
    createTask({
      title: 'Fill in PRD and DESIGN.md',
      description: 'Milestones 2 and 3.',
      type: 'feature',
      status: 'done',
      assignee: TEAM[0],
      dueDate: daysFromToday(-2), // past, but Done – shows the neutral state (M8)
    }),
  ];
}
