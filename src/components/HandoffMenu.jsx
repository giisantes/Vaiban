import { useCallback, useRef, useState } from 'react';
import { TEAM } from '../constants.js';
import { useDismiss } from '../hooks/useDismiss.js';
import Avatar from './Avatar.jsx';

/**
 * "Hand off to…" button on each card (M7). Opens a small menu of the other
 * teammates; picking one reassigns the task.
 *
 * Built as a button + menu rather than a <select>: with a select, arrowing
 * through the options by keyboard can fire a change on every key press and
 * reassign the task by accident (WCAG 3.2.2 On Input).
 *
 * @param {{ task: import('../lib/createTask.js').Task, onHandOff: (id: string, name: string) => void }} props
 */
export default function HandoffMenu({ task, onHandOff }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);

  const others = TEAM.filter((name) => name !== task.assignee);

  return (
    // relative + z-10 keeps the menu above the card's stretched click area
    <div ref={ref} className="relative z-10">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`Hand off “${task.title}” to someone else`}
        onClick={() => setOpen((o) => !o)}
        className="whitespace-nowrap rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#23466E]"
      >
        Hand off to…
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-20 mt-1 grid min-w-[11rem] gap-0.5 rounded-md border border-slate-200 bg-white p-1 shadow-lg">
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
