import { useCallback, useEffect, useRef, useState } from 'react';
import { STAGES, TEAM } from '../constants.js';
import { useDismiss } from '../hooks/useDismiss.js';
import Avatar from './Avatar.jsx';
import CopyContextButton from './CopyContextButton.jsx';

const chevron = (open) => (
  <svg aria-hidden="true" viewBox="0 0 20 20" className={`h-3.5 w-3.5 shrink-0 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} fill="currentColor">
    <path d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4Z" />
  </svg>
);

/**
 * The bottom of each card: the owner (click to reassign), "Move", and
 * "Copy Context".
 *
 * "Move" is the keyboard and single-click way to change a card's column –
 * the alternative to dragging that WCAG 2.2 requires (SC 2.1.1 Keyboard,
 * SC 2.5.7 Dragging Movements). It was my original D3 idea.
 *
 * Both lists open *inside* the card (they push the card down rather than
 * covering the next card). When a list opens, focus moves into it; Escape or
 * a click outside closes it and puts focus back on the button that opened it.
 *
 * @param {{
 *   task: import('../lib/createTask.js').Task,
 *   onHandOff: (id: string, name: string) => void,
 *   onMove: (id: string, status: string) => void,
 *   onCopied: (ok: boolean) => void,
 * }} props
 */
export default function CardActions({ task, onHandOff, onMove, onCopied }) {
  const [open, setOpen] = useState(null); // null | 'owner' | 'move'
  const ref = useRef(null);
  const ownerButton = useRef(null);
  const moveButton = useRef(null);
  const list = useRef(null);

  const close = useCallback(() => {
    setOpen((current) => {
      (current === 'move' ? moveButton : ownerButton).current?.focus();
      return null;
    });
  }, []);
  useDismiss(ref, open !== null, close);

  // Put focus on the first choice as soon as a list opens.
  useEffect(() => {
    if (open) list.current?.querySelector('button')?.focus();
  }, [open]);

  const owner = task.assignee || 'Unassigned';
  const people = TEAM.filter((name) => name !== task.assignee);
  const stages = STAGES.filter((s) => s.id !== task.status);
  const listId = `card-${task.id}-${open}`;
  const toggle = (which) => setOpen((o) => (o === which ? null : which));

  const choose = (action) => {
    setOpen(null);
    action();
  };

  return (
    <div ref={ref} className="mt-3">
      {/* Wraps onto more lines when the column is narrow, so nothing overlaps. */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          ref={ownerButton}
          type="button"
          aria-expanded={open === 'owner'}
          aria-controls={open === 'owner' ? listId : undefined}
          aria-label={`Owner: ${owner}. Change who owns “${task.title}”`}
          title="Assign to someone else"
          onClick={() => toggle('owner')}
          // relative + z-10 keeps the buttons above the card's stretched click area
          className={`relative z-10 -ml-1 mr-auto flex min-h-[28px] min-w-0 items-center gap-2 rounded-md px-1 py-0.5 text-xs font-medium text-slate-700 hover:bg-slate-900/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${open === 'owner' ? 'bg-slate-900/5' : ''}`}
        >
          <Avatar name={task.assignee} />
          <span className="text-left [overflow-wrap:anywhere]">{owner}</span>
          {chevron(open === 'owner')}
        </button>

        {/* Move + Copy stay together, on the right; they drop below the owner together when space is tight. */}
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
        <button
          ref={moveButton}
          type="button"
          aria-expanded={open === 'move'}
          aria-controls={open === 'move' ? listId : undefined}
          aria-label={`Move “${task.title}” to another column`}
          onClick={() => toggle('move')}
          className={`relative z-10 inline-flex min-h-[28px] items-center gap-1 whitespace-nowrap rounded-md border px-2 py-1 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${
            open === 'move' ? 'border-slate-400 bg-slate-100 text-slate-900' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
          }`}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
          Move
        </button>

        <CopyContextButton task={task} onCopied={onCopied} />
        </div>
      </div>

      {open && (
        <div id={listId} ref={list} className="relative z-10 mt-2 rounded-md border border-slate-200 bg-white p-1">
          <p id={`${listId}-label`} className="px-2 pb-1 pt-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
            {open === 'owner' ? 'Assign to' : 'Move to'}
          </p>
          <ul aria-labelledby={`${listId}-label`} className="grid gap-0.5">
            {open === 'owner'
              ? people.map((name) => (
                  <li key={name}>
                    <button
                      type="button"
                      onClick={() => choose(() => { ownerButton.current?.focus(); onHandOff(task.id, name); })}
                      className="flex min-h-[32px] w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-slate-800 hover:bg-slate-100 focus:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                    >
                      <Avatar name={name} size="sm" />
                      {name}
                    </button>
                  </li>
                ))
              : stages.map((stage) => (
                  <li key={stage.id}>
                    <button
                      type="button"
                      onClick={() => choose(() => onMove(task.id, stage.id, { fromKeyboardMenu: true }))}
                      className="flex min-h-[32px] w-full items-center rounded px-2 py-1.5 text-left text-sm text-slate-800 hover:bg-slate-100 focus:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                    >
                      {stage.label}
                    </button>
                  </li>
                ))}
          </ul>
        </div>
      )}
    </div>
  );
}
