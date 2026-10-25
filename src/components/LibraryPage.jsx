import { useEffect, useMemo, useState } from 'react';
import { sharingError } from '../lib/boardsApi.js';
import { KINDS, allTags, createLibraryItem, filterItems } from '../lib/library.js';
import { relativeTime } from '../lib/relativeTime.js';
import LibraryItemForm from './LibraryItemForm.jsx';
import LibraryItemView from './LibraryItemView.jsx';

const inputClass =
  'w-full min-w-0 rounded-md border border-slate-300 bg-surface px-2.5 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-primary';

/**
 * The prompt library and the AI skills library (FR36–FR42, D69–D71).
 *
 * Layout from my D5 decision: a searchable list on one side and the chosen
 * item in full on the other (prompts are long, so cards would cut them off).
 * On narrow screens the list and the item take turns, with a "Back to the
 * list" button.
 *
 * Which items appear (FR41): your private ones plus every board you're on –
 * "All my libraries" – or narrowed to one board, or to Private.
 *
 * @param {{
 *   route: ReturnType<typeof import('../lib/libraryRoute.js').parseLibraryRoute>,
 *   prompts: object[], skills: object[],
 *   projects: object[], tasks: object[],
 *   save: (item: object) => Promise<object>, remove: (item: object) => Promise<void>,
 *   go: (route: object, replace?: boolean) => void,
 *   onOpenTask: (boardId: string, taskId: string) => void,
 *   isCloud: boolean, loaded: boolean, failed?: boolean,
 * }} props
 */
export default function LibraryPage({ route, prompts, skills, projects, tasks, save, remove, go, onOpenTask, isCloud, loaded, failed }) {
  const { kind } = route;
  const all = kind === 'prompt' ? prompts : skills;
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState('');
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => { document.title = `${KINDS[kind].title} – Vaiban`; }, [kind]);
  useEffect(() => { setEditing(false); }, [route.id, route.isNew, kind]);
  useEffect(() => { setTag(''); }, [kind, route.board]);

  // A board you've left (or that was deleted) no longer counts as a filter.
  const board = route.board === 'all' || route.board === 'private' || projects.some((p) => p.id === route.board) ? route.board : 'all';
  const inScope = useMemo(() => filterItems(all, { board }), [all, board]);
  const tags = useMemo(() => allTags(inScope), [inScope]);
  const shown = useMemo(() => filterItems(all, { query, board, tag }), [all, query, board, tag]);
  const selected = route.id ? all.find((x) => x.id === route.id) ?? null : null;

  const libraryName = (boardId) => (boardId === null ? 'Private' : projects.find((p) => p.id === boardId)?.name ?? 'A board');
  const singular = KINDS[kind].label.toLowerCase();
  const plural = KINDS[kind].plural.toLowerCase();

  // A new item starts in the board being looked at, already linked to the task it came from.
  const draft = useMemo(
    () =>
      route.isNew
        ? createLibraryItem(kind, {
            boardId: board !== 'all' && board !== 'private' ? board : route.task ? tasks.find((t) => t.id === route.task)?.projectId ?? null : null,
            ...(kind === 'prompt' && route.task ? { taskIds: [route.task] } : {}),
          })
        : null,
    [route.isNew, route.task, kind, board] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const showingItem = Boolean(route.isNew || selected);
  const pane = route.isNew ? 'new' : selected ? (editing ? 'edit' : 'view') : 'none';

  const onSaved = async (item) => {
    const saved = await save(item);
    setMessage(`${KINDS[kind].label} saved.`);
    setEditing(false);
    go({ kind, board: route.board, id: saved.id }, true);
  };

  const tabs = Object.entries(KINDS).map(([k, info]) => {
    const count = (k === 'prompt' ? prompts : skills).length;
    const current = k === kind;
    return (
      <a
        key={k}
        href={`#/library/${info.path}`}
        aria-current={current ? 'page' : undefined}
        onClick={(e) => { e.preventDefault(); go({ kind: k, board: route.board }); }}
        className={`inline-flex min-h-[36px] items-center rounded-md px-3 py-1.5 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${
          current ? 'bg-brand-primary text-white' : 'border border-slate-300 bg-surface text-slate-800 hover:bg-slate-100'
        }`}
      >
        {info.plural} <span className={`ml-1.5 rounded-full px-1.5 text-xs ${current ? 'bg-white/20' : 'bg-slate-100'}`}>{count}</span>
      </a>
    );
  });

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{KINDS[kind].title}</h1>
          <p className="text-sm text-slate-600">
            {kind === 'prompt'
              ? 'Save prompts that worked, what they produced, and the tasks they were for.'
              : 'Reusable ways of working with AI tools: what each skill does and how to use it.'}
          </p>
        </div>
        <nav aria-label="Libraries" className="flex flex-wrap gap-2">{tabs}</nav>
      </div>

      <p role="status" aria-live="polite" className={message ? 'rounded-md bg-highlight px-3 py-2 text-sm text-slate-900' : 'sr-only'}>{message}</p>

      {failed ? (
        <p className="rounded-md border border-due-overdue p-4 text-sm text-due-overdue">Couldn't load the library. Check your internet connection and reload the page.</p>
      ) : !loaded ? (
        <p className="text-sm text-slate-600">Loading the library…</p>
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:items-start">
          {/* ── the list ── */}
          <section aria-labelledby="library-list-title" className={`grid gap-3 rounded-lg border border-slate-200 bg-surface p-4 ${showingItem ? 'hidden lg:grid' : ''}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="library-list-title" className="text-base font-semibold text-slate-900">{KINDS[kind].plural}</h2>
              <button
                type="button"
                onClick={() => go({ kind, board: route.board, isNew: true })}
                className="inline-flex min-h-[32px] items-center rounded-md bg-brand-primary px-3 py-1 text-sm font-medium text-white hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
              >
                + New {singular}
              </button>
            </div>

            <div role="search" className="grid gap-2">
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                <span>Search {plural}</span>
                <input id="library-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Words in the name, tags or text" className={inputClass} />
              </label>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  <span>Project</span>
                  <select id="library-board" value={board} onChange={(e) => go({ kind, board: e.target.value }, true)} className={inputClass}>
                    <option value="all">All my libraries</option>
                    <option value="private">Private</option>
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </label>
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  <span>Tag</span>
                  <select id="library-tag" value={tag} onChange={(e) => setTag(e.target.value)} className={inputClass}>
                    <option value="">Any tag</option>
                    {tags.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </label>
              </div>
            </div>

            <p role="status" className="text-xs text-slate-600">
              {shown.length === inScope.length ? `${shown.length} ${shown.length === 1 ? singular : plural}` : `${shown.length} of ${inScope.length} ${plural} match`}
            </p>

            {shown.length === 0 ? (
              <p className="rounded-md border border-dashed border-slate-300 p-3 text-sm text-slate-600">
                {inScope.length === 0 ? `No ${plural} here yet. Press “+ New ${singular}” to add one.` : 'Nothing matches. Try other words or another tag.'}
              </p>
            ) : (
              <ul className="grid max-h-[70vh] gap-1.5 overflow-y-auto">
                {shown.map((item) => {
                  const isCurrent = item.id === route.id;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        aria-current={isCurrent ? 'true' : undefined}
                        onClick={() => go({ kind, board: route.board, id: item.id })}
                        className={`grid w-full gap-1 rounded-md border p-2.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${
                          isCurrent ? 'border-brand-primary bg-highlight' : 'border-slate-200 hover:border-slate-400'
                        }`}
                      >
                        <span className="text-sm font-medium text-slate-900 [overflow-wrap:anywhere]">{item.name}</span>
                        <span className="text-xs text-slate-600">
                          {libraryName(item.boardId)}
                          {item.kind === 'prompt' && item.taskIds.length > 0 && ` · ${item.taskIds.length} ${item.taskIds.length === 1 ? 'task' : 'tasks'}`}
                          {item.updatedAt && ` · ${relativeTime(item.updatedAt)}`}
                        </span>
                        {item.tags.length > 0 && (
                          <span className="flex flex-wrap gap-1">
                            {item.tags.map((t) => <span key={t} className="rounded bg-slate-100 px-1.5 text-xs text-slate-800">{t}</span>)}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* ── the chosen item ── */}
          <section aria-label={pane === 'none' ? `Choose a ${singular}` : undefined} className={`grid gap-3 rounded-lg border border-slate-200 bg-surface p-4 sm:p-5 ${showingItem ? '' : 'hidden lg:grid'}`}>
            {showingItem && (
              <button
                type="button"
                onClick={() => go({ kind, board: route.board })}
                className="inline-flex min-h-[28px] items-center justify-self-start rounded text-sm text-link underline underline-offset-2 hover:no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary lg:hidden"
              >
                ← Back to the list
              </button>
            )}
            {pane === 'none' && (
              <p className="text-sm text-slate-600">
                {route.id ? `That ${singular} isn't available any more.` : `Choose a ${singular} from the list to see it in full, or add a new one.`}
              </p>
            )}
            {pane === 'view' && (
              <LibraryItemView
                item={selected}
                libraryName={libraryName(selected.boardId)}
                tasks={tasks}
                onEdit={() => setEditing(true)}
                onOpenTask={onOpenTask}
                onMessage={setMessage}
                onDelete={async () => {
                  try {
                    await remove(selected);
                    setMessage(`Deleted “${selected.name}”.`);
                    go({ kind, board: route.board }, true);
                    document.getElementById('library-search')?.focus();
                  } catch (err) {
                    setMessage(`Couldn't delete: ${sharingError(err)}`);
                    throw err;
                  }
                }}
              />
            )}
            {(pane === 'new' || pane === 'edit') && (
              <LibraryItemForm
                key={pane === 'new' ? draft.id : selected.id}
                item={pane === 'new' ? draft : selected}
                isNew={pane === 'new'}
                projects={projects}
                tasks={tasks}
                isCloud={isCloud}
                onMessage={setMessage}
                onCancel={() => (pane === 'new' ? go({ kind, board: route.board }, true) : setEditing(false))}
                onSave={async (item) => {
                  try {
                    await onSaved(item);
                  } catch (err) {
                    throw new Error(sharingError(err));
                  }
                }}
              />
            )}
          </section>
        </div>
      )}
    </div>
  );
}
