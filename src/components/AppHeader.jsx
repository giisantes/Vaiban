import { displayName } from '../lib/auth.js';
import Avatar from './Avatar.jsx';

const SAVE_TEXT = {
  saving: 'Saving…',
  saved: 'All changes saved',
  error: 'Not saved – retrying…',
};

/**
 * Top bar on every screen. The logo (top-left) always goes home to the
 * projects list – the convention from the Web Usability lecture (D1).
 * On a board it also shows where you are ("Projects / <name>") and the
 * "+ Task" button.
 *
 * @param {{
 *   project: import('../lib/projects.js').Project | null,  // null on the home page
 *   onHome: () => void,
 *   onNewTask?: () => void,
 *   user?: object | null,         // signed-in Supabase user (null = browser-only mode)
 *   onSignOut?: () => void,
 *   saveStatus?: 'saving' | 'saved' | 'error',
 *   isCloud?: boolean,
 * }} props
 *
 * Accounts: shows who is signed in, a Sign out button, and whether the
 * latest change has reached the server ("All changes saved").
 */
export default function AppHeader({ project, onHome, onNewTask, user, onSignOut, saveStatus = 'saved', isCloud }) {
  const name = displayName(user);
  return (
    <header className="mb-4 flex flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-4">
        <a
          href="#/"
          onClick={(e) => { e.preventDefault(); onHome(); }}
          aria-label="Vibeboard home: all projects"
          className="flex shrink-0 items-center gap-2 rounded-md text-lg font-bold tracking-tight text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
        >
          {/* three sticky-note columns */}
          <span aria-hidden="true" className="flex h-7 items-end gap-0.5 rounded bg-brand-primary p-1">
            <i className="block h-4 w-1.5 rounded-sm bg-brand-accent" />
            <i className="block h-2.5 w-1.5 rounded-sm bg-white" />
            <i className="block h-3.5 w-1.5 rounded-sm bg-white/70" />
          </span>
          Vibeboard
        </a>

        {project && (
          <nav aria-label="Breadcrumb" className="min-w-0 border-l border-slate-300 pl-4">
            <ol className="flex min-w-0 items-center gap-1.5 text-sm text-slate-600">
              <li>
                <a
                  href="#/"
                  onClick={(e) => { e.preventDefault(); onHome(); }}
                  className="rounded text-brand-primary underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                >
                  Projects
                </a>
              </li>
              <li aria-hidden="true">/</li>
              <li className="min-w-0">
                <h1 aria-current="page" className="truncate text-xl font-semibold text-slate-900">{project.name}</h1>
              </li>
            </ol>
          </nav>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <p role="status" className={`text-xs ${saveStatus === 'error' ? 'font-semibold text-due-overdue' : 'text-slate-600'}`}>
          {isCloud ? SAVE_TEXT[saveStatus] : 'Saved in this browser only'}
        </p>

        {user && (
          <div className="flex items-center gap-2 border-l border-slate-300 pl-3">
            <Avatar name={name} size="sm" />
            <span className="max-w-[12rem] truncate text-sm font-medium text-slate-800" title={user.email}>{name}</span>
            <button
              type="button"
              onClick={onSignOut}
              disabled={saveStatus !== 'saved'}
              title={saveStatus !== 'saved' ? 'Wait until your changes are saved' : undefined}
              className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary disabled:opacity-50"
            >
              Sign out
            </button>
          </div>
        )}

      {project && onNewTask && (
        <button
          type="button"
          onClick={onNewTask}
          className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
        >
          + Task
        </button>
      )}
      </div>
    </header>
  );
}
