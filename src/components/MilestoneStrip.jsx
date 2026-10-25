import { useEffect, useRef, useState } from 'react';
import { DUE_STYLES } from '../lib/dueState.js';
import { MILESTONE_LIMITS, createMilestone, milestoneProgress } from '../lib/milestones.js';
import ConfirmButton from './ConfirmButton.jsx';

const OPEN_KEY = 'vibetracker.milestonesOpen';
const readOpen = () => { try { return window.localStorage.getItem(OPEN_KEY) !== '0'; } catch { return true; } };

const button =
  'inline-flex min-h-[28px] items-center justify-center rounded-md border border-slate-300 bg-surface px-2.5 py-1 text-xs font-medium text-slate-800 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary';
const primary =
  'inline-flex min-h-[28px] items-center justify-center rounded-md bg-brand-primary px-3 py-1 text-xs font-medium text-white hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2';
const input =
  'min-w-0 rounded-md border border-slate-300 bg-surface px-2 py-1 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-primary aria-[invalid=true]:border-due-overdue';

/** Add or rename a milestone: name (required) and an optional target date. */
function MilestoneForm({ milestone, onSave, onCancel, idPrefix }) {
  const [name, setName] = useState(milestone?.name ?? '');
  const [dueDate, setDueDate] = useState(milestone?.dueDate ?? '');
  const [error, setError] = useState('');
  const nameRef = useRef(null);
  useEffect(() => { if (milestone) nameRef.current?.focus(); }, [milestone]);

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Give the milestone a name.'); nameRef.current?.focus(); return; }
    onSave({ name: name.trim().slice(0, MILESTONE_LIMITS.name), dueDate: dueDate || null });
    if (!milestone) { setName(''); setDueDate(''); }
    setError('');
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-wrap items-end gap-2" aria-label={milestone ? `Edit milestone ${milestone.name}` : 'Add a milestone'}>
      <label className="grid min-w-[10rem] flex-1 gap-0.5 text-xs font-medium text-slate-700">
        <span>{milestone ? 'Name' : 'New milestone'}</span>
        <input
          ref={nameRef}
          id={`${idPrefix}-name`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={MILESTONE_LIMITS.name}
          placeholder={milestone ? undefined : 'e.g. MVP, Beta, Submission'}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${idPrefix}-error` : undefined}
          className={input}
        />
      </label>
      <label className="grid gap-0.5 text-xs font-medium text-slate-700">
        <span>Target date (optional)</span>
        <input id={`${idPrefix}-date`} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={input} />
      </label>
      <div className="flex gap-2">
        {onCancel && <button type="button" onClick={onCancel} className={button}>Cancel</button>}
        <button type="submit" className={primary}>{milestone ? 'Save' : 'Add milestone'}</button>
      </div>
      {error && <p id={`${idPrefix}-error`} className="basis-full text-xs font-medium text-due-overdue">{error}</p>}
    </form>
  );
}

/** One milestone: name, target date, progress bar, and its actions. */
function MilestoneRow({ milestone, progress, filtering, onFilter, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const editButton = useRef(null);
  const { total, done, percent, complete, overdueTasks, due } = progress;
  const barId = `ms-bar-${milestone.id}`;

  if (editing) {
    return (
      <li className="rounded-md border border-brand-primary/40 bg-surface p-2.5">
        <MilestoneForm
          idPrefix={`ms-edit-${milestone.id}`}
          milestone={milestone}
          onSave={(fields) => { onSave(fields); setEditing(false); setTimeout(() => editButton.current?.focus(), 0); }}
          onCancel={() => { setEditing(false); setTimeout(() => editButton.current?.focus(), 0); }}
        />
      </li>
    );
  }

  return (
    <li className={`grid gap-1.5 rounded-md border bg-surface p-2.5 ${filtering ? 'border-brand-primary ring-1 ring-brand-primary' : 'border-slate-200'}`}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h3 className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-slate-900 [overflow-wrap:anywhere]">
          <span aria-hidden="true" className="text-brand-primary">◆</span>
          {milestone.name}
          {complete && <span className="rounded bg-due-safe-soft px-1.5 text-xs font-semibold text-due-safe">✓ Complete</span>}
        </h3>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {due.state !== 'none' && <span className={`rounded px-1.5 py-0.5 font-medium ${DUE_STYLES[due.state].chip}`}>{due.label}</span>}
          {overdueTasks > 0 && <span className="font-medium text-due-overdue">{overdueTasks} {overdueTasks === 1 ? 'task' : 'tasks'} overdue</span>}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* the bar is a picture of the words next to it, so screen readers get the words */}
        <div aria-hidden="true" className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-200">
          <div className={`h-full rounded-full ${complete ? 'bg-due-safe' : 'bg-brand-primary'}`} style={{ width: `${percent}%` }} />
        </div>
        <p id={barId} className="shrink-0 text-xs text-slate-700">
          {total === 0 ? 'No tasks yet' : `${done} of ${total} ${total === 1 ? 'task' : 'tasks'} done`}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={onFilter} aria-pressed={filtering} className={filtering ? primary : button}>
          {filtering ? 'Showing only these' : 'Show only these tasks'}
          <span className="sr-only"> ({milestone.name})</span>
        </button>
        <button ref={editButton} type="button" onClick={() => setEditing(true)} className={button}>
          Edit<span className="sr-only"> milestone {milestone.name}</span>
        </button>
        <ConfirmButton
          label="Delete"
          confirmLabel="Delete milestone"
          className={button}
          question={total ? `Delete “${milestone.name}”? Its ${total} ${total === 1 ? 'task stays' : 'tasks stay'} on the board, just without a milestone.` : `Delete “${milestone.name}”?`}
          onConfirm={onDelete}
        />
      </div>
    </li>
  );
}

/**
 * Milestones on a board (FR14, FR16, FR17 – D79): each one's progress, a
 * filter to show only its tasks, and adding / editing / deleting them.
 * Folds away like Deliverables (D78), but starts open – progress is the point.
 *
 * @param {{
 *   milestones: import('../lib/milestones.js').Milestone[],
 *   tasks: object[], today: string,
 *   filterId: string | null, onFilter: (id: string | null) => void,
 *   onChange: (milestones: object[]) => void,
 *   onDeleted: (milestone: object) => void,
 * }} props
 */
export default function MilestoneStrip({ milestones, tasks, today, filterId, onFilter, onChange, onDeleted }) {
  const [open, setOpen] = useState(readOpen);
  const [adding, setAdding] = useState(false);
  const toggle = () => setOpen((was) => {
    try { window.localStorage.setItem(OPEN_KEY, was ? '0' : '1'); } catch { /* per-browser convenience only */ }
    return !was;
  });

  const progress = milestones.map((m) => milestoneProgress(m, tasks, today));
  const complete = progress.filter((p) => p.complete).length;

  return (
    <section aria-labelledby="milestones-heading" className="-mx-4 mb-5 border-b border-slate-200 px-4 pb-3 sm:-mx-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="milestones-heading" className="text-sm font-semibold text-slate-800">
          <button
            type="button"
            onClick={toggle}
            aria-expanded={open}
            aria-controls="milestones-list"
            className="-mx-1.5 inline-flex min-h-[32px] items-center gap-2 rounded-md px-1.5 py-1 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className={`h-4 w-4 transition-transform motion-reduce:transition-none ${open ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 6 6 6-6 6" />
            </svg>
            <span className="uppercase tracking-wide">Milestones</span>
            <span className="text-xs font-normal text-slate-600">
              {milestones.length === 0 ? 'none yet' : `${complete} of ${milestones.length} complete`}
            </span>
          </button>
        </h2>
        {open && !adding && (
          <button type="button" onClick={() => setAdding(true)} className={button}>+ Add milestone</button>
        )}
      </div>

      <div id="milestones-list" hidden={!open} className={open ? 'mt-2 grid gap-2' : 'hidden'}>
        {adding && (
          <div className="rounded-md border border-dashed border-slate-300 bg-surface p-2.5">
            <MilestoneForm
              idPrefix="ms-new"
              onSave={(fields) => {
                if (milestones.length >= MILESTONE_LIMITS.count) return;
                onChange([...milestones, createMilestone(fields)]);
                setAdding(false);
              }}
              onCancel={() => setAdding(false)}
            />
          </div>
        )}
        {milestones.length === 0 && !adding ? (
          <p className="rounded-md border border-dashed border-slate-300 p-3 text-sm text-slate-600">
            Milestones are goals like “MVP” or “Submission”. Add one, then pick it on a task to track how close you are.
          </p>
        ) : (
          <ul className="grid gap-2 lg:grid-cols-2">
            {milestones.map((m, i) => (
              <MilestoneRow
                key={m.id}
                milestone={m}
                progress={progress[i]}
                filtering={filterId === m.id}
                onFilter={() => onFilter(filterId === m.id ? null : m.id)}
                onSave={(fields) => onChange(milestones.map((x) => (x.id === m.id ? { ...x, ...fields } : x)))}
                onDelete={() => { onChange(milestones.filter((x) => x.id !== m.id)); onDeleted(m); }}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
