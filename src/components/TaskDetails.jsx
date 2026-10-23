import { STAGES } from '../constants.js';
import { dueState } from '../lib/dueState.js';
import { relativeTime } from '../lib/relativeTime.js';
import Avatar from './Avatar.jsx';
import CopyContextButton from './CopyContextButton.jsx';
import DueChip from './DueChip.jsx';
import TypeBadge from './TypeBadge.jsx';

/** "20 Oct 2026" */
function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso);
  return isNaN(d) ? iso : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** One label + value pair in the facts list. */
function Fact({ label, children }) {
  return (
    <div className="grid gap-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-600">{label}</dt>
      <dd className="text-sm text-slate-900">{children}</dd>
    </div>
  );
}

/**
 * Read-only view of a task – what opens when a card is clicked.
 * Nothing here can be changed by accident; the "Edit task" button switches
 * the modal to the edit form (TaskModal).
 *
 * @param {{
 *   task: import('../lib/createTask.js').Task,
 *   today: string,
 *   onEdit: () => void,
 *   onClose: () => void,
 * }} props
 */
export default function TaskDetails({ task, today, onEdit, onClose }) {
  const due = dueState(task, today);
  const status = STAGES.find((s) => s.id === task.status)?.label ?? task.status;
  const context = (task.context || '').trim();

  return (
    <div className="grid gap-5 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="grid min-w-0 justify-items-start gap-2">
          <TypeBadge type={task.type} />
          <h2 id="task-modal-title" className="text-xl font-semibold text-slate-900 [overflow-wrap:anywhere]">
            {task.title}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-md border border-slate-300 px-2.5 py-1 text-sm hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
        >
          Close
        </button>
      </div>

      <dl className="grid grid-cols-1 gap-4 rounded-md border border-slate-200 p-3 sm:grid-cols-2">
        <Fact label="Status">{status}</Fact>
        <Fact label="Owner">
          <span className="flex items-center gap-2">
            <Avatar name={task.assignee} size="sm" />
            {task.assignee || 'Unassigned'}
          </span>
        </Fact>
        <Fact label="Due">
          {task.dueDate ? (
            <span className="grid justify-items-start gap-1">
              {formatDate(task.dueDate)}
              <DueChip due={due} />
            </span>
          ) : (
            <span className="text-slate-600">No due date</span>
          )}
        </Fact>
        <Fact label="Created">{formatDate(task.createdDate)}</Fact>
      </dl>

      <section aria-labelledby="details-description" className="grid gap-1">
        <h3 id="details-description" className="text-sm font-semibold text-slate-900">Description</h3>
        <p className="whitespace-pre-wrap text-sm text-slate-800">
          {task.description?.trim() || <span className="text-slate-600">No description.</span>}
        </p>
      </section>

      <section aria-labelledby="details-context" className="grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 id="details-context" className="text-sm font-semibold text-slate-900">Context</h3>
          <p className="text-xs text-slate-600">
            {task.contextTool ? `${task.contextTool} · ` : ''}
            {task.contextUpdatedAt ? `Last updated ${relativeTime(task.contextUpdatedAt)}` : 'Not saved yet'}
          </p>
        </div>
        {context ? (
          <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap font-mono text-sm leading-relaxed text-slate-800">{context}</pre>
        ) : (
          <p className="text-sm text-slate-600">No context yet. Press "Edit task" to add a briefing.</p>
        )}
        <div className="flex justify-end">
          <CopyContextButton task={task} className="py-1.5 text-sm" />
        </div>
      </section>

      <div className="flex justify-end border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={onEdit}
          autoFocus
          data-autofocus
          className="inline-flex items-center gap-1.5 rounded-md bg-brand-primary px-4 py-1.5 text-sm font-medium text-white hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
          Edit task
        </button>
      </div>
    </div>
  );
}
