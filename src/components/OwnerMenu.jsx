import { useCallback, useRef, useState } from 'react';
import { TEAM } from '../constants.js';
import { useDismiss } from '../hooks/useDismiss.js';
import Avatar from './Avatar.jsx';

/**
 * The owner on each card (M7, reworked after M12): the avatar and name are
 * themselves the button. Clicking them opens an "Assign to" list of the
 * other teammates; picking one reassigns the task.
 *
 * The list opens *inside* the card and pushes the rest of the card down,
 * instead of floating over it – so it can never cover the next card's text.
 *
 * Built as a button + list rather than a <select>: with a select, arrowing
 * through the options by keyboard can fire a change on every key press and
 * reassign the task by accident (WCAG 3.2.2 On Input).
 *
 * @param {{
 *   task: import('../lib/createTask.js').Task,
 *   onHandOff: (id: string, name: string) => void,
 *   children?: import('react').ReactNode,  // shown on the same row (Copy Context)
 * }} props
 */
export default function OwnerMenu({ task, onHandOff, children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const buttonRef = useRef(null);
  const close = useCallback(() => {
    setOpen(false);
    buttonRef.current?.focus();
  }, []);
  useDismiss(ref, open, close);

  const owner = task.assignee || 'Unassigned';
  const others = TEAM.filter((name) => name !== task.assignee);
  const listId = `assign-${task.id}`;

  return (
    <div ref={ref} className="mt-3">
      {/* Wraps onto two lines when the column is narrow, so the name and button never overlap. */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          ref={buttonRef}
          type="button"
          aria-expanded={open}
          aria-controls={listId}
          aria-label={`Owner: ${owner}. Change who owns “${task.title}”`}
          title="Assign to someone else"
          onClick={() => setOpen((o) => !o)}
          // relative + z-10 keeps it above the card's stretched click area
          className={`relative z-10 -ml-1 flex min-w-0 items-center gap-2 rounded-md px-1 py-0.5 text-xs font-medium text-slate-700 hover:bg-slate-900/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${open ? 'bg-slate-900/5' : ''}`}
        >
          <Avatar name={task.assignee} />
          <span className="text-left [overflow-wrap:anywhere]">{owner}</span>
          <svg aria-hidden="true" viewBox="0 0 20 20" className={`h-3.5 w-3.5 shrink-0 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} fill="currentColor">
            <path d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4Z" />
          </svg>
        </button>
        {children}
      </div>

      {open && (
        <div id={listId} className="relative z-10 mt-2 rounded-md border border-slate-200 bg-white p-1">
          <p id={`${listId}-label`} className="px-2 pb-1 pt-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
            Assign to
          </p>
          <ul aria-labelledby={`${listId}-label`} className="grid gap-0.5">
            {others.map((name) => (
              <li key={name}>
                <button
                  type="button"
                  onClick={() => { setOpen(false); onHandOff(task.id, name); }}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-slate-800 hover:bg-slate-100 focus:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                >
                  <Avatar name={name} size="sm" />
                  {name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
