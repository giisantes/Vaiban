import { useEffect, useRef, useState } from 'react';
import { STAGES } from '../constants.js';
import { copyText } from '../lib/clipboard.js';
import { KINDS } from '../lib/library.js';
import { relativeTime } from '../lib/relativeTime.js';

const button =
  'inline-flex min-h-[32px] items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-surface px-3 py-1 text-sm font-medium text-slate-800 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary disabled:opacity-50';
const danger =
  'inline-flex min-h-[32px] items-center justify-center rounded-md bg-due-overdue px-3 py-1 text-sm font-medium text-due-overdue-on hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2';

/** A block of saved text with its own Copy button (FR40, NFR4). */
function TextBlock({ id, title, text, empty, copyLabel, onMessage }) {
  return (
    <section aria-labelledby={id} className="grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={id} className="text-sm font-semibold text-slate-900">{title}</h3>
        {text && (
          <button
            type="button"
            className={`${button} text-xs`}
            onClick={async () => onMessage((await copyText(text)) ? `${copyLabel} copied.` : `Couldn't copy. Select the text and copy it yourself.`)}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" />
            </svg>
            Copy <span className="sr-only">{copyLabel.toLowerCase()}</span>
          </button>
        )}
      </div>
      {text ? (
        <pre className="max-h-80 overflow-y-auto whitespace-pre-wrap font-mono text-sm leading-relaxed text-slate-800 [overflow-wrap:anywhere]">{text}</pre>
      ) : (
        <p className="text-sm text-slate-600">{empty}</p>
      )}
    </section>
  );
}

/**
 * Read-only view of one prompt or AI skill, like the task view (D51): edit
 * and delete are separate, deliberate steps.
 *
 * @param {{
 *   item: import('../lib/library.js').LibraryItem,
 *   libraryName: string, tasks: object[],
 *   onEdit: () => void, onDelete: () => Promise<void>,
 *   onOpenTask: (boardId: string, taskId: string) => void,
 *   onMessage: (text: string) => void,
 * }} props
 */
export default function LibraryItemView({ item, libraryName, tasks, onEdit, onDelete, onOpenTask, onMessage }) {
  const heading = useRef(null);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const yes = useRef(null);

  // Opening an item moves focus to its name, so screen readers announce it.
  useEffect(() => { heading.current?.focus(); setConfirming(false); }, [item.id]);
  useEffect(() => { if (confirming) yes.current?.focus(); }, [confirming]);

  const label = KINDS[item.kind].label;
  const linked = item.kind === 'prompt' ? item.taskIds.map((id) => ({ id, task: tasks.find((t) => t.id === id) })) : [];

  return (
    <article aria-labelledby="library-item-title" className="grid gap-4">
      <div className="grid gap-1">
        <h2 id="library-item-title" ref={heading} tabIndex={-1} className="text-xl font-semibold text-slate-900 focus:outline-none [overflow-wrap:anywhere]">
          {item.name}
        </h2>
        <p className="text-sm text-slate-600">
          {libraryName}
          {item.authorName && ` · by ${item.authorName}`}
          {item.updatedAt && ` · updated ${relativeTime(item.updatedAt)}`}
        </p>
      </div>

      {(item.tags.length > 0 || item.aiTool) && (
        <ul aria-label="Tags and AI tool" className="flex flex-wrap gap-1.5">
          {item.aiTool && <li className="rounded bg-highlight px-2 py-0.5 text-xs font-medium text-slate-900">AI tool: {item.aiTool}</li>}
          {item.tags.map((tag) => <li key={tag} className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-800">{tag}</li>)}
        </ul>
      )}

      {item.kind === 'prompt' ? (
        <>
          <TextBlock id="lib-view-body" title="Prompt" text={item.body} empty="No prompt text." copyLabel="Prompt" onMessage={onMessage} />
          <TextBlock id="lib-view-result" title="Result" text={item.result} empty="No result saved yet. Press Edit to add what it produced." copyLabel="Result" onMessage={onMessage} />
          <section aria-labelledby="lib-view-tasks" className="grid gap-2">
            <h3 id="lib-view-tasks" className="text-sm font-semibold text-slate-900">Used for</h3>
            {linked.length === 0 ? (
              <p className="text-sm text-slate-600">Not linked to any tasks.</p>
            ) : (
              <ul className="grid gap-1">
                {linked.map(({ id, task }) => (
                  <li key={id} className="text-sm">
                    {task ? (
                      <button
                        type="button"
                        onClick={() => onOpenTask(item.boardId, id)}
                        className="inline-flex min-h-[24px] items-center rounded text-left text-link underline underline-offset-2 hover:no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary [overflow-wrap:anywhere]"
                      >
                        {task.title}
                      </button>
                    ) : (
                      <span className="text-slate-600">A task that has been deleted</span>
                    )}
                    {task && <span className="text-xs text-slate-600"> · {STAGES.find((s) => s.id === task.status)?.label}</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : (
        <>
          <section aria-labelledby="lib-view-overview" className="grid gap-1">
            <h3 id="lib-view-overview" className="text-sm font-semibold text-slate-900">Overview</h3>
            <p className="whitespace-pre-wrap text-sm text-slate-800">{item.overview || <span className="text-slate-600">No overview.</span>}</p>
          </section>
          <TextBlock id="lib-view-instructions" title="Instructions" text={item.instructions} empty="No instructions yet." copyLabel="Instructions" onMessage={onMessage} />
        </>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 pt-4">
        {confirming ? (
          <span role="group" aria-label={`Delete “${item.name}”?`} className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-700">Delete this {label.toLowerCase()}{item.boardId ? ' for everyone on the board' : ''}? This can't be undone.</span>
            <button
              ref={yes}
              type="button"
              disabled={deleting}
              className={danger}
              onClick={async () => {
                setDeleting(true);
                try { await onDelete(); } catch { setDeleting(false); }
              }}
            >
              Delete
            </button>
            <button type="button" className={button} onClick={() => setConfirming(false)}>Keep</button>
          </span>
        ) : (
          <>
            <button type="button" className={button} onClick={() => setConfirming(true)}>Delete</button>
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex min-h-[32px] items-center gap-1.5 rounded-md bg-brand-primary px-4 py-1.5 text-sm font-medium text-white hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
            >
              Edit {label.toLowerCase()}
            </button>
          </>
        )}
      </div>
    </article>
  );
}
