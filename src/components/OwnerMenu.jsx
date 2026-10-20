import { useCallback, useRef, useState } from 'react';
import { TEAM } from '../constants.js';
import { useDismiss } from '../hooks/useDismiss.js';
import Avatar from './Avatar.jsx';

/**
 * The owner on each card (M7, reworked after M12): the avatar and name are
 * themselves the button. Clicking them opens a short list of the other
 * teammates; picking one reassigns the task. A small ▾ arrow and a hover
 * background show that the name can be clicked.
 *
 * Built as a button + menu rather than a <select>: with a select, arrowing
 * through the options by keyboard can fire a change on every key press and
 * reassign the task by accident (WCAG 3.2.2 On Input).
 *
 * @param {{ task: import('../lib/createTask.js').Task, onHandOff: (id: string, name: string) => void }} props
 */
export default function OwnerMenu({ task, onHandOff }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);

  const owner = task.assignee || 'Unassigned';
  const others = TEAM.filter((name) => name !== task.assignee);

  return (
    // relative + z-10 keeps the button above the card's stretched click area.
    // While open it jumps to z-40, so the menu sits above everything else on
    // the board (this card's Copy Context button, the cards below it).
    <div ref={ref} className={`relative min-w-0 max-w-full ${open ? 'z-40' : 'z-10'}`}>
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`Owner: ${owner}. Change who owns “${task.title}”`}
        title="Assign to someone else"
        onClick={() => setOpen((o) => !o)}
        className="-ml-1 flex min-w-0 items-center gap-2 rounded-md px-1 py-0.5 text-xs font-medium text-slate-700 hover:bg-slate-900/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
      >
        <Avatar name={task.assignee} />
        <span className="text-left [overflow-wrap:anywhere]">{owner}</span>
        <svg aria-hidden="true" viewBox="0 0 20 20" className={`h-3.5 w-3.5 shrink-0 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} fill="currentColor">
          <path d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4Z" />
        </svg>
      </button>
      {open && (
        <div role="menu" aria-label="Assign to" className="absolute left-0 top-full mt-1 grid min-w-[11rem] gap-0.5 rounded-md border border-slate-300 bg-white p-1 shadow-xl">
          <p aria-hidden="true" className="px-2 pb-1 pt-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600">Assign to</p>
          {others.map((name) => (
            <button
              key={name}
              type="button"
              role="menuitem"
              onClick={() => { setOpen(false); onHandOff(task.id, name); }}
              className="flex items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-slate-800 hover:bg-slate-100 focus:bg-slate-100 focus:outline-none"
            >
              <Avatar name={name} size="sm" />
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
