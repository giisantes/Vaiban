import { STAGES } from '../constants.js';
import { dueState } from '../lib/dueState.js';
import { dropEmptySections } from '../lib/contextPrompt.js';
import { useLibraryContext } from '../lib/libraryRoute.js';
import { useMilestones } from '../lib/milestones.js';
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
    <div className="grid gap-0.5">
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
 * It fits the window without scrolling the whole view (D73): the facts sit in
 * one row, Edit is next to Close, empty template headings are hidden, and only
 * a long context or description scrolls inside its own box.
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
  // Unfilled template headings ("## Constraints" with nothing under it) are left out, as in Copy Context (D43).
  const context = dropEmptySections(task.context || '');
  // FR36: prompts attached to this task (from the prompt library).
  const library = useLibraryContext();
  const milestone = useMilestones().find((m) => m.id === task.milestoneId); // D79
  const prompts = library.prompts.filter((p) => p.boardId === task.projectId && p.taskIds.includes(task.id));

  return (
    <div className="flex max-h-[calc(100dvh-38px)] flex-col gap-4 p-4 sm:p-5">
      <div className="flex shrink-0 items-start justify-between gap-3">
        <div className="grid min-w-0 justify-items-start gap-1.5">
          <span className="flex flex-wrap items-center gap-2">
            <TypeBadge type={task.type} />
            {milestone && (
              <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-800">
                <span aria-hidden="true" className="text-brand-primary">◆</span>
                <span className="sr-only">Milestone: </span>{milestone.name}
              </span>
            )}
          </span>
          <h2 id="task-modal-title" className="text-xl font-semibold text-slate-900 [overflow-wrap:anywhere]">
            {task.title}
          </h2>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onEdit}
            autoFocus
            data-autofocus
            className="inline-flex items-center gap-1.5 rounded-md bg-brand-primary px-3 py-1 text-sm font-medium text-white hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
            Edit task
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-2.5 py-1 text-sm hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
          >
            Close
          </button>
        </div>
      </div>

      <dl className="grid shrink-0 grid-cols-2 gap-3 rounded-md border border-slate-200 p-3 sm:grid-cols-4">
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

      <section aria-labelledby="details-description" className="grid shrink-0 gap-1">
        <h3 id="details-description" className="text-sm font-semibold text-slate-900">Description</h3>
        <p className="max-h-[20vh] overflow-y-auto whitespace-pre-wrap text-sm text-slate-800 [overflow-wrap:anywhere]">
          {task.description?.trim() || <span className="text-slate-600">No description.</span>}
        </p>
      </section>

      <section aria-labelledby="details-context" className="flex min-h-[7rem] flex-col gap-2 rounded-md border border-slate-200 bg-slate-50 p-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 id="details-context" className="text-sm font-semibold text-slate-900">Context</h3>
          <p className="text-xs text-slate-600">
            {task.contextTool ? `${task.contextTool} · ` : ''}
            {task.contextUpdatedAt ? `Last updated ${relativeTime(task.contextUpdatedAt)}` : ''}
          </p>
        </div>
        {context ? (
          <pre tabIndex={0} aria-label="Context" className="min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap font-mono text-sm leading-relaxed text-slate-800">{context}</pre>
        ) : (
          <p className="text-sm text-slate-600">No context yet. Press "Edit task" to add a briefing.</p>
        )}
        <div className="flex justify-end">
          <CopyContextButton task={task} className="py-1.5 text-sm" />
        </div>
      </section>

      <section aria-labelledby="details-prompts" className="grid shrink-0 gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id="details-prompts" className="text-sm font-semibold text-slate-900">Prompts used ({prompts.length})</h3>
          <button
            type="button"
            onClick={() => library.openLibrary({ kind: 'prompt', board: task.projectId, isNew: true, task: task.id })}
            className="inline-flex min-h-[28px] items-center rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-800 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
          >
            + Save a prompt for this task
          </button>
        </div>
        {prompts.length > 0 && (
          <ul className="grid gap-1">
            {prompts.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => library.openLibrary({ kind: 'prompt', board: task.projectId, id: p.id })}
                  className="inline-flex min-h-[24px] items-center rounded text-left text-sm text-link underline underline-offset-2 hover:no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary [overflow-wrap:anywhere]"
                >
                  {p.name}
                </button>
                {p.tags.length > 0 && <span className="text-xs text-slate-600"> · {p.tags.join(', ')}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
