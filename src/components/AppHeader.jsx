import { displayName } from '../lib/auth.js';
import UserMenu from './UserMenu.jsx';

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
 *   onSignIn?: (mode: 'signin' | 'signup') => void, // signed out, accounts available (D74)
 *   saveStatus?: 'saving' | 'saved' | 'error',
 *   isCloud?: boolean,
 *   onSettings: () => void,      // D77: opens the Settings page (account, or Appearance without one)
 *   avatar?: string,             // D77: your profile picture
 *   onShare?: () => void,        // D62: opens the Share window (cloud boards only)
 *   waitingCount?: number,       // people waiting for the owner to let them in
 *   onLibrary?: () => void, libraryActive?: boolean,          // D69: the prompt / AI skills libraries
 *   onBoardPrompts?: () => void, boardPromptCount?: number,  // this board's prompts
 * }} props
 *
 * Accounts: shows who is signed in, a Sign out button, and whether the
 * latest change has reached the server ("All changes saved").
 */
export default function AppHeader({ project, onHome, onNewTask, user, onSignOut, onSignIn, saveStatus = 'saved', isCloud, onSettings, avatar, onShare, waitingCount = 0, onLibrary, libraryActive = false, onBoardPrompts, boardPromptCount = 0 }) {
  const name = displayName(user);
  return (
    <header className="mb-4 flex flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
        <a
          href="#/"
          onClick={(e) => { e.preventDefault(); onHome(); }}
          aria-label="Vaiban home: all projects"
          className="flex shrink-0 items-center gap-2 rounded-md text-lg font-bold tracking-tight text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
        >
          {/* three sticky-note columns */}
          <span aria-hidden="true" className="flex h-7 items-end gap-0.5 rounded bg-brand-primary p-1">
            <i className="block h-4 w-1.5 rounded-sm bg-brand-accent" />
            <i className="block h-2.5 w-1.5 rounded-sm bg-surface" />
            <i className="block h-3.5 w-1.5 rounded-sm bg-surface/70" />
          </span>
          Vaiban
        </a>

        {project && (
          <nav aria-label="Breadcrumb" className="min-w-0 border-l border-slate-300 pl-4">
            <ol className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm text-slate-600">
              <li>
                <a
                  href="#/"
                  onClick={(e) => { e.preventDefault(); onHome(); }}
                  className="inline-flex min-h-[24px] items-center rounded px-0.5 text-link underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                >
                  Projects
                </a>
              </li>
              <li aria-hidden="true">/</li>
              <li className="min-w-0">
                <h1 aria-current="page" className="text-xl font-semibold text-slate-900 [overflow-wrap:anywhere]">{project.name}</h1>
              </li>
            </ol>
          </nav>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <p role="status" className={`text-xs ${saveStatus === 'error' ? 'font-semibold text-due-overdue' : 'text-slate-600'}`}>
          {isCloud ? SAVE_TEXT[saveStatus] : 'Saved in this browser only'}
        </p>

        {onLibrary && (
          <a
            href="#/library/prompts"
            onClick={(e) => { e.preventDefault(); onLibrary(); }}
            aria-current={libraryActive ? 'page' : undefined}
            className={`inline-flex min-h-[28px] items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${
              libraryActive ? 'border-brand-primary bg-highlight text-slate-900' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5V5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2Z" /><path d="M8 7h7M8 11h5" />
            </svg>
            Library
          </a>
        )}

        {!user && (
          <a
            href="#/settings/appearance"
            onClick={(e) => { e.preventDefault(); onSettings(); }}
            className="inline-flex min-h-[28px] items-center gap-1.5 rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
            </svg>
            Settings
          </a>
        )}

        {!user && onSignIn && (
          <div className="flex items-center gap-2 border-l border-slate-300 pl-3">
            <button
              type="button"
              onClick={() => onSignIn('signin')}
              className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
            >
              Sign in
            </button>
          </div>
        )}

        {user && (
          <UserMenu user={user} name={name} avatar={avatar} onSettings={onSettings} onSignOut={onSignOut} canSignOut={saveStatus === 'saved'} />
        )}

      {onBoardPrompts && (
        <button
          type="button"
          onClick={onBoardPrompts}
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-surface px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
        >
          Prompts
          <span className="rounded-full bg-slate-100 px-2 text-xs font-semibold text-slate-700">
            {boardPromptCount}<span className="sr-only"> on this board</span>
          </span>
        </button>
      )}

      {onShare && (
        <button
          type="button"
          onClick={onShare}
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-surface px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M19 8v6M16 11h6" />
          </svg>
          {project.isOwner ? 'Share' : 'Members'}
          {waitingCount > 0 && (
            <span className="rounded-full bg-brand-accent px-2 text-xs font-semibold text-[#0F172A]">
              {waitingCount}<span className="sr-only"> waiting to join</span>
            </span>
          )}
        </button>
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
