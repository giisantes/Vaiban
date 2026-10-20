import { useEffect, useRef, useState } from 'react';
import { STAGES, TEAM, TASK_TYPES } from '../constants.js';

const inputClass =
  'w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 ' +
  'focus:outline-none focus:ring-2 focus:ring-[#23466E]';
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
 * Status is changed with a dropdown here – no drag-and-drop yet (M5 brief).
 *
 * @param {{
 *   task: import('../lib/createTask.js').Task | null,  // null = closed
 *   isNew: boolean,
 *   onSave: (task: import('../lib/createTask.js').Task) => void,
 *   onDelete: (id: string) => void,
 *   onClose: () => void,
 * }} props
 */
export default function TaskModal({ task, isNew, onSave, onDelete, onClose }) {
  const dialogRef = useRef(null);
  const [form, setForm] = useState(task);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Load the task into the form each time the modal opens with a task.
  useEffect(() => {
    setForm(task);
    setConfirmingDelete(false);
  }, [task]);

  // Open / close the native dialog to match the `task` prop.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (task && !dialog.open) dialog.showModal();
    if (!task && dialog.open) dialog.close();
  }, [task]);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    const title = form.title.trim();
    if (!title) return;
    onSave({ ...form, title, dueDate: form.dueDate || null });
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="task-modal-title"
      onCancel={(e) => {
        e.preventDefault(); // let React state close it, so the two never disagree
        onClose();
      }}
      className="w-[min(640px,calc(100vw-32px))] rounded-lg border border-slate-200 p-0 text-slate-900 shadow-xl backdrop:bg-slate-900/50"
    >
      {form && (
        <form onSubmit={handleSubmit} className="grid gap-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 id="task-modal-title" className="text-lg font-semibold">
              {isNew ? 'New task' : 'Edit task'}
            </h2>
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
            <input id="task-title" type="text" value={form.title} onChange={set('title')} required autoFocus className={inputClass} />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className={labelClass}>
              <span>Type</span>
              <select id="task-type" value={form.type} onChange={set('type')} className={inputClass}>
                {TASK_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </label>

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
                {TEAM.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </label>

            <label className={labelClass}>
              <span>Due date (optional)</span>
              <input id="task-due" type="date" value={form.dueDate || ''} onChange={set('dueDate')} className={inputClass} />
            </label>
          </div>

          <label className={labelClass}>
            <span>Description</span>
            <textarea id="task-description" value={form.description} onChange={set('description')} rows={4} className={inputClass} />
          </label>

          {!isNew && <p className="text-xs text-slate-600">Created {formatDate(form.createdDate)}</p>}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
            <div>
              {!isNew && !confirmingDelete && (
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
                >
                  Delete task
                </button>
              )}
              {confirmingDelete && (
                <div role="alert" className="flex flex-wrap items-center gap-2 text-sm">
                  <span>Delete this task? This can't be undone.</span>
                  <button
                    type="button"
                    onClick={() => onDelete(form.id)}
                    className="rounded-md bg-red-700 px-3 py-1.5 font-medium text-white hover:bg-red-800"
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

            <button type="submit" className="rounded-md bg-[#23466E] px-4 py-1.5 text-sm font-medium text-white hover:brightness-110">
              {isNew ? 'Create task' : 'Save changes'}
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}
