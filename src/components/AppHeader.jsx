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
 * }} props
 */
export default function AppHeader({ project, onHome, onNewTask }) {
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

      {project && onNewTask && (
        <button
          type="button"
          onClick={onNewTask}
          className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
        >
          + Task
        </button>
      )}
    </header>
  );
}
