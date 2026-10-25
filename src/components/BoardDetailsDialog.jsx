import { useEffect, useRef, useState } from 'react';
import ConfirmButton from './ConfirmButton.jsx';

const button =
  'inline-flex min-h-[32px] items-center justify-center rounded-md border border-slate-300 bg-surface px-3 py-1 text-sm font-medium text-slate-800 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary disabled:opacity-50';
const primary =
  'inline-flex min-h-[32px] items-center justify-center rounded-md bg-brand-primary px-4 py-1.5 text-sm font-medium text-white hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2';
const input =
  'w-full min-w-0 rounded-md border border-slate-300 bg-surface px-2.5 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-primary aria-[invalid=true]:border-due-overdue';

/**
 * "Edit board" window (D75): rename the board, change its description, or
 * delete it. Opened from the pencil next to the board's name in the header –
 * where people look to change a name – instead of being inside Share.
 *
 * Shown to the board's owner, and always in browser-only mode (one person).
 * Built on the native <dialog> like the other windows (D17): focus starts on
 * the name, Escape closes it, focus returns to the Edit button.
 *
 * @param {{
 *   open: boolean, onClose: () => void,
 *   project: object, taskCount: number, memberCount: number,
 *   onSave: (fields: { name: string, description: string }) => void,
 *   onDelete: () => void,
 * }} props
 */
export default function BoardDetailsDialog({ open, onClose, project, taskCount, memberCount, onSave, onDelete }) {
  const ref = useRef(null);
  const nameRef = useRef(null);
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || '');
  const [error, setError] = useState('');

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setName(project.name);
      setDescription(project.description || '');
      setError('');
      dialog.showModal();
      nameRef.current?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Give the board a name.'); nameRef.current?.focus(); return; }
    onSave({ name: name.trim(), description: description.trim() });
  };

  const tasks = `${taskCount} ${taskCount === 1 ? 'task' : 'tasks'}`;
  const question =
    memberCount > 1
      ? `Delete “${project.name}” and its ${tasks} for all ${memberCount} members? This can't be undone.`
      : `Delete “${project.name}” and its ${tasks}? This can't be undone.`;

  return (
    <dialog
      ref={ref}
      aria-labelledby="board-details-title"
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      className="max-h-[calc(100vh-32px)] w-[min(560px,calc(100vw-32px))] overflow-y-auto rounded-lg border border-slate-200 bg-surface p-0 text-slate-900 shadow-xl backdrop:bg-black/60"
    >
      {open && (
        <div className="grid gap-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <h2 id="board-details-title" className="text-lg font-semibold">Edit board</h2>
            <button type="button" onClick={onClose} className={button}>Close</button>
          </div>

          <form onSubmit={submit} noValidate className="grid gap-3">
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              <span>Name</span>
              <input
                ref={nameRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={120}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'board-name-error' : undefined}
                className={input}
              />
              {error && <span id="board-name-error" className="text-xs font-medium text-due-overdue">{error}</span>}
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              <span>Description (optional)</span>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} rows={2} className={input} />
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className={button}>Cancel</button>
              <button type="submit" className={primary}>Save changes</button>
            </div>
          </form>

          <section aria-labelledby="board-delete-title" className="grid gap-2 border-t border-slate-200 pt-4">
            <h3 id="board-delete-title" className="text-sm font-semibold text-slate-900">Delete this board</h3>
            <p className="text-sm text-slate-600">Removes the board and all its tasks{memberCount > 1 ? ' for everyone on it' : ''}.</p>
            <div>
              <ConfirmButton label="Delete board" confirmLabel={memberCount > 1 ? 'Delete for everyone' : 'Delete'} question={question} onConfirm={onDelete} />
            </div>
          </section>
        </div>
      )}
    </dialog>
  );
}
