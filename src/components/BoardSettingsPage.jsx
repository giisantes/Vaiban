import { useEffect, useRef, useState } from 'react';
import ConfirmButton from './ConfirmButton.jsx';

const button =
  'inline-flex min-h-[32px] items-center justify-center rounded-md border border-slate-300 bg-surface px-3 py-1 text-sm font-medium text-slate-800 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary disabled:opacity-50';
const primary =
  'inline-flex min-h-[32px] items-center justify-center rounded-md bg-brand-primary px-4 py-1.5 text-sm font-medium text-white hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 disabled:opacity-50';
const input =
  'w-full min-w-0 rounded-md border border-slate-300 bg-surface px-2.5 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-primary aria-[invalid=true]:border-due-overdue';

/**
 * A board's Settings tab (D76), like a GitHub repository's Settings:
 *
 *   General     – name and description (owner, or anyone in browser-only mode)
 *   Danger zone – delete the board (owner) or leave it (member)
 *
 * Who is on the board stays in the Share window.
 *
 * @param {{
 *   project: object, canEdit: boolean, isCloud: boolean,
 *   taskCount: number, memberCount: number,
 *   onSave: (fields: { name: string, description: string }) => void,
 *   onDelete: () => void, onLeave: () => void, onShare?: () => void,
 * }} props
 */
export default function BoardSettingsPage({ project, canEdit, isCloud, taskCount, memberCount, onSave, onDelete, onLeave, onShare }) {
  const heading = useRef(null);
  const nameRef = useRef(null);
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || '');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');

  // Opening the tab moves focus to its heading, so screen readers hear where they are.
  useEffect(() => { heading.current?.focus(); }, []);
  // Someone else renamed it while this was open: show the new values.
  useEffect(() => { setName(project.name); setDescription(project.description || ''); }, [project.name, project.description]);

  const changed = name.trim() !== project.name || description.trim() !== (project.description || '');

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Give the board a name.'); setSaved(''); nameRef.current?.focus(); return; }
    setError('');
    onSave({ name: name.trim(), description: description.trim() });
    setSaved('Saved.');
  };

  const tasks = `${taskCount} ${taskCount === 1 ? 'task' : 'tasks'}`;
  const shared = memberCount > 1;

  return (
    <div className="grid max-w-3xl gap-6">
      <h2 ref={heading} tabIndex={-1} className="text-xl font-semibold text-slate-900 focus:outline-none">Board settings</h2>

      <section aria-labelledby="board-general" className="grid gap-4 rounded-lg border border-slate-200 bg-surface p-4 sm:p-5">
        <div className="grid gap-0.5">
          <h3 id="board-general" className="text-base font-semibold text-slate-900">General</h3>
          {!canEdit && <p className="text-sm text-slate-600">Only {project.ownerName || 'the owner'} can change these.</p>}
        </div>
        {canEdit ? (
          <form onSubmit={submit} noValidate className="grid gap-3">
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              <span>Board name</span>
              <input
                ref={nameRef}
                value={name}
                onChange={(e) => { setName(e.target.value); setSaved(''); }}
                maxLength={120}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'board-name-error' : undefined}
                className={`${input} sm:max-w-md`}
              />
              {error && <span id="board-name-error" className="text-xs font-medium text-due-overdue">{error}</span>}
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              <span>Description (optional)</span>
              <textarea value={description} onChange={(e) => { setDescription(e.target.value); setSaved(''); }} maxLength={500} rows={3} className={input} />
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" disabled={!changed} className={primary}>Save changes</button>
              <p role="status" className="text-sm text-slate-700">{saved}</p>
            </div>
          </form>
        ) : (
          <dl className="grid gap-3 text-sm">
            <div className="grid gap-0.5"><dt className="font-medium text-slate-700">Board name</dt><dd className="text-slate-900 [overflow-wrap:anywhere]">{project.name}</dd></div>
            <div className="grid gap-0.5"><dt className="font-medium text-slate-700">Description</dt><dd className="text-slate-900 [overflow-wrap:anywhere]">{project.description || <span className="text-slate-600">None</span>}</dd></div>
          </dl>
        )}
      </section>

      {isCloud && onShare && (
        <section aria-labelledby="board-people" className="grid gap-2 rounded-lg border border-slate-200 bg-surface p-4 sm:p-5">
          <h3 id="board-people" className="text-base font-semibold text-slate-900">People</h3>
          <p className="text-sm text-slate-700">
            {memberCount} {memberCount === 1 ? 'member' : 'members'}. Invitations and members are managed in Share.
          </p>
          <div><button type="button" onClick={onShare} className={button}>Open Share</button></div>
        </section>
      )}

      <section aria-labelledby="board-danger" className="grid gap-3 rounded-lg border border-due-overdue/60 bg-surface p-4 sm:p-5">
        <h3 id="board-danger" className="text-base font-semibold text-due-overdue">Danger zone</h3>
        {canEdit ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="grid gap-0.5">
              <p className="text-sm font-semibold text-slate-900">Delete this board</p>
              <p className="text-sm text-slate-700">Removes the board and its {tasks}{shared ? ' for everyone on it' : ''}. This can't be undone.</p>
            </div>
            <ConfirmButton
              label="Delete board"
              confirmLabel={shared ? 'Delete for everyone' : 'Delete'}
              question={shared ? `Delete “${project.name}” and its ${tasks} for all ${memberCount} members?` : `Delete “${project.name}” and its ${tasks}?`}
              onConfirm={onDelete}
            />
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="grid gap-0.5">
              <p className="text-sm font-semibold text-slate-900">Leave this board</p>
              <p className="text-sm text-slate-700">You'll stop seeing it. You'd need a new invitation to come back.</p>
            </div>
            <ConfirmButton label="Leave board" confirmLabel="Leave" question={`Leave “${project.name}”?`} onConfirm={onLeave} />
          </div>
        )}
      </section>
    </div>
  );
}
