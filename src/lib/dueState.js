/**
 * Due-date states for M8 (due-tint). No new task fields – everything is
 * worked out from the existing `dueDate`, `status` and today's date.
 *
 *   overdue  – the due date has passed          → alarm
 *   warning  – due today or tomorrow            → warning
 *   safe     – due in 2 days or more            → calm
 *   neutral  – the task is Done (even if it was overdue)
 *   none     – no due date: no tint, no label
 *
 * Every state has a text label as well as a colour (D16, WCAG 1.4.1).
 */

/** Class strings per state. Full strings so Tailwind can find them. */
export const DUE_STYLES = {
  overdue: { card: 'bg-due-overdue-soft', chip: 'bg-due-overdue text-due-overdue-on' },
  warning: { card: 'bg-due-warning-soft', chip: 'bg-surface text-due-warning ring-1 ring-inset ring-due-warning' },
  safe:    { card: 'bg-surface',            chip: 'bg-due-safe-soft text-due-safe' },
  neutral: { card: 'bg-surface',            chip: 'bg-due-neutral-soft text-due-neutral' },
  none:    { card: 'bg-surface',            chip: '' },
};

/** Whole days from `fromISO` to `toISO` (both 'YYYY-MM-DD'). */
export function daysBetween(fromISO, toISO) {
  const from = Date.UTC(...fromISO.split('-').map((n, i) => (i === 1 ? n - 1 : +n)));
  const to = Date.UTC(...toISO.split('-').map((n, i) => (i === 1 ? n - 1 : +n)));
  return Math.round((to - from) / 86400000);
}

/** "20 Oct" */
function shortDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/**
 * @param {import('./createTask.js').Task} task
 * @param {string} today  ISO date
 * @returns {{ state: keyof DUE_STYLES, label: string }}
 */
export function dueState(task, today) {
  if (!task.dueDate) return { state: 'none', label: '' };
  if (task.status === 'done') return { state: 'neutral', label: `Due ${shortDate(task.dueDate)}` };

  const days = daysBetween(today, task.dueDate);
  if (days < 0) return { state: 'overdue', label: `Overdue by ${plural(-days, 'day')}` };
  if (days === 0) return { state: 'warning', label: 'Due today' };
  if (days === 1) return { state: 'warning', label: 'Due tomorrow' };
  return { state: 'safe', label: `Due in ${plural(days, 'day')}` };
}
