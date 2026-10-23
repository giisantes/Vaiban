import { useState } from 'react';
import { STAGES } from '../constants.js';
import { dueState } from '../lib/dueState.js';
import Avatar from './Avatar.jsx';

/**
 * Home page: every project as a card, so someone juggling several projects
 * sees them all before going into one (D1). Click a card to open its board.
 * Below the cards, a small form adds a new project.
 *
 * @param {{
 *   projects: import('../lib/projects.js').Project[],
 *   tasks: import('../lib/createTask.js').Task[],
 *   children?: React.ReactNode,   // D62: invitations, shown under the heading
 *   members?: object[],   // D62: board_members rows (shared boards); [] in browser-only mode
 *   today: string,
 *   onOpen: (projectId: string) => void,
 *   onCreate: (fields: { name: string, description: string }) => void,
 * }} props
 */
export default function ProjectsHome({ projects, tasks, members = [], today, onOpen, onCreate, children }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) { setError(true); return; }
    onCreate({ name: name.trim(), description: description.trim() });
    setName('');
    setDescription('');
    setError(false);
  };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Your projects</h1>
        <p className="text-sm text-slate-600">Pick a project to open its board.</p>
      </div>

      {children}

      {projects.length === 0 ? (
        <p className="rounded-md border border-dashed border-slate-300 p-4 text-sm text-slate-600">No projects yet. Add one below.</p>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,18rem),1fr))] gap-4">
          {projects.map((project) => {
            const mine = tasks.filter((t) => t.projectId === project.id);
            const overdue = mine.filter((t) => dueState(t, today).state === 'overdue').length;
            const linked = project.anchors.filter((a) => a.url).length;
            const onBoard = members.filter((m) => m.board_id === project.id);
            const waiting = project.isOwner ? onBoard.filter((m) => m.status === 'pending').length : 0;
            // Shared boards show their members; browser-only boards show whoever has tasks.
            const owners = onBoard.length
              ? onBoard.filter((m) => m.status === 'active').map((m) => m.display_name).filter(Boolean)
              : [...new Set(mine.map((t) => t.assignee).filter(Boolean))];
            return (
              <li key={project.id}>
                <button
                  type="button"
                  onClick={() => onOpen(project.id)}
                  className="group grid h-full w-full min-w-0 content-start gap-3 rounded-lg border border-slate-200 bg-surface p-4 text-left hover:border-slate-400 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                >
                  <span className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
                    <span className="text-base font-semibold text-slate-900 [overflow-wrap:anywhere]">{project.name}</span>
                    <span aria-hidden="true" className="shrink-0 text-sm font-medium text-link group-hover:underline">Open board →</span>
                  </span>
                  {project.description && <span className="text-sm text-slate-600">{project.description}</span>}
                  {(project.isOwner === false || waiting > 0) && (
                    <span className="flex flex-wrap gap-1.5 text-xs">
                      {project.isOwner === false && (
                        <span className="rounded bg-highlight px-1.5 py-0.5 font-medium text-slate-800">Shared by {project.ownerName || 'someone'}</span>
                      )}
                      {waiting > 0 && (
                        <span className="rounded bg-brand-accent px-1.5 py-0.5 font-semibold text-[#0F172A]">{waiting} waiting to join</span>
                      )}
                    </span>
                  )}

                  <span className="flex flex-wrap gap-1.5 text-xs">
                    {STAGES.map((stage) => (
                      <span key={stage.id} className="rounded bg-slate-100 px-1.5 py-0.5 tabular-nums text-slate-700">
                        {stage.label}: {mine.filter((t) => t.status === stage.id).length}
                      </span>
                    ))}
                    {overdue > 0 && (
                      <span className="rounded bg-due-overdue px-1.5 py-0.5 font-semibold text-due-overdue-on">{overdue} overdue</span>
                    )}
                  </span>

                  <span className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <span aria-hidden="true" className="flex gap-0.5">
                        {project.anchors.map((a) => (
                          <span key={a.id} className={`h-2 w-2 rounded-full ${a.url ? 'bg-due-safe' : 'border border-slate-400'}`} />
                        ))}
                      </span>
                      {linked} of {project.anchors.length} deliverables linked
                    </span>
                    {owners.length > 0 && (
                      <span className="flex gap-1">
                        <span className="sr-only">People: {owners.join(', ')}</span>
                        {owners.map((o) => (
                          <Avatar key={o} name={o} size="sm" />
                        ))}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <form onSubmit={submit} noValidate className="grid gap-3 rounded-lg border border-slate-200 bg-surface p-4 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
        <h2 className="text-sm font-semibold text-slate-900 sm:col-span-3">New project</h2>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          <span>Name (required)</span>
          <input
            id="new-project-name"
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(false); }}
            placeholder="e.g. Final project"
            aria-invalid={error}
            aria-describedby={error ? 'new-project-error' : undefined}
            className={`w-full rounded-md border px-2 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-primary ${error ? 'border-due-overdue' : 'border-slate-300'}`}
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          <span>Description (optional)</span>
          <input
            id="new-project-description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
        </label>
        <button type="submit" className="rounded-md bg-brand-primary px-4 py-1.5 text-sm font-medium text-white hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2">
          Add project
        </button>
        {error && (
          <p id="new-project-error" className="text-xs font-medium text-due-overdue sm:col-span-3">Give the project a name.</p>
        )}
      </form>
    </div>
  );
}
