import { useEffect, useRef, useState } from 'react';
import { STAGES, TASK_TYPES } from '../constants.js';
import { usePeople } from '../lib/people.js';
import { typeStyle } from '../lib/typeStyles.js';
import ContextSection from './ContextSection.jsx';
import CopyContextButton from './CopyContextButton.jsx';
import TaskDetails from './TaskDetails.jsx';
import { useMilestones } from '../lib/milestones.js';
import TypeBadge, { TypeIcon } from './TypeBadge.jsx';

const inputClass =
  'w-full rounded-md border border-slate-300 bg-surface px-2 py-1.5 text-sm text-slate-900 ' +
  'focus:outline-none focus:ring-2 focus:ring-brand-primary';
const labelClass = 'grid gap-1 text-sm font-medium text-slate-700';

/** Formats an ISO date ('YYYY-MM-DD') for display, e.g. "20 Oct 2026". */
function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return isNaN(d) ? iso : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Add / edit modal for a task (M5), built on the native <dialog> element:
 * keyboard focus stays inside it and Escape closes it (DESIGN.md §4).
 *
 * The same modal is used for a new task and for editing an existing one.
 * Status is changed with a dropdown here. Since M12 cards can also be
 * dragged, but this dropdown stays as the keyboard and single-click way.
 * M6: the modal's top edge, the heading badge and the type picker all use
 * the same type colours as the cards, and update as soon as the type changes.
 * M9: a Context section (see ContextSection.jsx). `contextUpdatedAt` is set
 * automatically on save, but only when the context or AI tool changed.
 * M10: "Copy Context" in the Context section copies what is in the form now,
 * including unsaved edits.
 *
 * View first, edit on request: clicking a card opens a read-only view
 * (TaskDetails). Only the "Edit task" button switches to the form, and
 * "Cancel" goes back to the view without saving. New tasks open straight
 * in the form.
 *
 * @param {{
 *   task: import('../lib/createTask.js').Task | null,  // null = closed
 *   isNew: boolean,
 *   onSave: (task: import('../lib/createTask.js').Task) => void,
 *   onDelete: (id: string) => void,
 *   onClose: () => void,
 *   today: string,
 * }} props
 */
export default function TaskModal({ task, isNew, onSave, onDelete, onClose, today }) {
  const dialogRef = useRef(null);
  const [form, setForm] = useState(task);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [mode, setMode] = useState('view'); // 'view' | 'edit'
  const people = usePeople();
  const milestones = useMilestones();

  // Load the task into the form each time the modal opens with a task.
  // Existing tasks open in view mode; new ones go straight to the form.
  // (Done during render, not in an effect, so the old mode never flashes up.)
  const [shownTask, setShownTask] = useState(task);
  if (task !== shownTask) {
    setShownTask(task);
    setForm(task);
    setConfirmingDelete(false);
    setMode(isNew ? 'edit' : 'view');
  }

  /** Leave the form without saving: back to the view (or close, for a new task). */
  const cancelEdit = () => {
    if (isNew) return onClose();
    setForm(task);
    setConfirmingDelete(false);
    setMode('view');
  };

  // Open / close the native dialog to match the `task` prop.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (task && !dialog.open) {
      dialog.showModal();
      // The browser focuses the first button (Close); move focus to the main
      // starting point instead – the Edit button, or the title field.
      dialog.querySelector('[data-autofocus]')?.focus();
    }
    if (!task && dialog.open) dialog.close();
  }, [task]);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    const title = form.title.trim();
    if (!title) return;
    const contextChanged = form.context !== task.context || form.contextTool !== task.contextTool;
    onSave({
      ...form,
      title,
      dueDate: form.dueDate || null,
      contextUpdatedAt: contextChanged ? new Date().toISOString() : form.contextUpdatedAt,
    });
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="task-modal-title"
      onCancel={(e) => {
        e.preventDefault(); // let React state close it, so the two never disagree
        onClose();
      }}
      className={`max-h-[calc(100vh-32px)] w-[min(680px,calc(100vw-32px))] overflow-y-auto rounded-lg border border-t-4 border-slate-200 bg-surface p-0 text-slate-900 shadow-xl backdrop:bg-black/60 ${form ? typeStyle(form.type).topEdge : ''}`}
    >
      {form && mode === 'view' && (
        <TaskDetails task={task} today={today} onEdit={() => setMode('edit')} onClose={onClose} />
      )}
      {form && mode === 'edit' && (
        <form onSubmit={handleSubmit} className="grid gap-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 id="task-modal-title" className="text-lg font-semibold">
                {isNew ? 'New task' : 'Edit task'}
              </h2>
              <TypeBadge type={form.type} />
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 px-2.5 py-1 text-sm hover:bg-slate-100"
            >
              Close
            </button>
          </div>

          <label className={labelClass}>
            <span>Title (required)</span>
            <input id="task-title" type="text" value={form.title} onChange={set('title')} required autoFocus data-autofocus className={inputClass} />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <fieldset className="grid gap-1">
              <legend className="mb-1 text-sm font-medium text-slate-700">Type</legend>
              <div className="flex gap-2">
                {TASK_TYPES.map((t) => {
                  const checked = form.type === t.id;
                  return (
                    <label
                      key={t.id}
                      className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-sm font-medium focus-within:ring-2 focus-within:ring-brand-primary ${
                        checked ? typeStyle(t.id).selected : 'border-slate-300 bg-surface text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="task-type"
                        value={t.id}
                        checked={checked}
                        onChange={set('type')}
                        className="sr-only"
                      />
                      <TypeIcon type={t.id} />
                      {t.label}
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <label className={labelClass}>
              <span>Status</span>
              <select id="task-status" value={form.status} onChange={set('status')} className={inputClass}>
                {STAGES.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </label>

            <label className={labelClass}>
              <span>Assignee</span>
              <select id="task-assignee" value={form.assignee} onChange={set('assignee')} className={inputClass}>
                <option value="">Unassigned</option>
                {[...people, ...(form.assignee && !people.includes(form.assignee) ? [form.assignee] : [])].map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </label>

            {/* D79 / FR14: which milestone the task counts towards */}
            <label className={labelClass}>
              <span>Milestone (optional)</span>
              <select id="task-milestone" value={form.milestoneId ?? ''} onChange={(e) => setForm({ ...form, milestoneId: e.target.value || null })} className={inputClass}>
                <option value="">None</option>
                {milestones.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </label>

            <label className={labelClass}>
              <span>Due date (optional)</span>
              <input id="task-due" type="date" value={form.dueDate || ''} onChange={set('dueDate')} className={inputClass} />
            </label>
          </div>

          <label className={labelClass}>
            <span>Description</span>
            <textarea id="task-description" value={form.description} onChange={set('description')} rows={3} className={inputClass} />
          </label>

          <ContextSection
            context={form.context}
            contextTool={form.contextTool}
            contextUpdatedAt={form.contextUpdatedAt}
            onChange={(field, value) => setForm({ ...form, [field]: value })}
            inputClass={inputClass}
          >
            <CopyContextButton task={form} className="py-1.5 text-sm" />
          </ContextSection>

          {!isNew && <p className="text-xs text-slate-600">Created {formatDate(form.createdDate)}</p>}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
            <div>
              {!isNew && !confirmingDelete && (
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-due-overdue hover:bg-due-overdue-soft"
                >
                  Delete task
                </button>
              )}
              {confirmingDelete && (
                <div role="alert" className="flex flex-wrap items-center gap-2 text-sm">
                  <span>Delete this task? You can undo it straight after.</span>
                  <button
                    type="button"
                    onClick={() => onDelete(form.id)}
                    className="rounded-md bg-due-overdue px-3 py-1.5 font-medium text-due-overdue-on hover:brightness-110"
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(false)}
                    className="rounded-md border border-slate-300 px-3 py-1.5 font-medium hover:bg-slate-100"
                  >
                    Keep
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cancelEdit}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-100"
              >
                Cancel
              </button>
              <button type="submit" className="rounded-md bg-brand-primary px-4 py-1.5 text-sm font-medium text-white hover:brightness-110">
                {isNew ? 'Create task' : 'Save changes'}
              </button>
            </div>
          </div>
        </form>
      )}
    </dialog>
  );
}
