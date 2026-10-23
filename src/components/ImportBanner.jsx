/**
 * Shown once to a new account when this browser still has tasks from
 * before accounts existed. Nothing is copied unless the user says so –
 * someone else's old tasks on a shared computer shouldn't end up in a
 * new account by accident.
 *
 * @param {{ count: number, onImport: () => void, onDismiss: () => void }} props
 */
export default function ImportBanner({ count, onImport, onDismiss }) {
  return (
    <div role="region" aria-label="Import tasks" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand-primary/30 bg-highlight p-4">
      <p className="text-sm text-slate-900">
        This browser has <strong>{count} {count === 1 ? 'task' : 'tasks'}</strong> saved from before you had an account. Bring {count === 1 ? 'it' : 'them'} into your account?
      </p>
      <div className="flex gap-2">
        <button type="button" onClick={onDismiss} className="rounded-md border border-slate-300 bg-surface px-3 py-1.5 text-sm font-medium hover:bg-slate-100">
          No thanks
        </button>
        <button type="button" onClick={onImport} className="rounded-md bg-brand-primary px-3 py-1.5 text-sm font-medium text-white hover:brightness-110">
          Import tasks
        </button>
      </div>
    </div>
  );
}
