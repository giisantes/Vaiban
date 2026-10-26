import { useEffect, useRef, useState } from 'react';
import { TAG_LIMITS } from '../lib/taskFilters.js';

const chip = 'inline-flex max-w-full items-center gap-1 rounded border border-slate-300 bg-surface py-0.5 pl-1.5 pr-0.5 text-xs text-slate-800';
const button =
  'inline-flex min-h-[32px] items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-surface px-3 py-1 text-sm font-medium text-slate-800 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary';

/**
 * Choose a task's tags (FR15 – D81): the chosen ones as chips (each with a
 * remove button), and a "Tags" button that opens the board's tags as
 * tickboxes, with "Create a new tag" at the bottom.
 *
 * Tickboxes rather than a custom listbox: keyboards, screen readers and
 * speech input already know how to use them. The list opens *inside* the
 * form and pushes the fields below down, so it never covers anything (D50).
 * Escape closes the list (not the whole task window) and returns focus.
 *
 * @param {{ value: string[], onChange: (tags: string[]) => void, boardTags: string[] }} props
 */
export default function TagPicker({ value, onChange, boardTags }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [message, setMessage] = useState('');
  const toggleRef = useRef(null);
  const panelRef = useRef(null);
  const newRef = useRef(null);

  // Every tag on the board, plus any this task has that nobody else uses yet.
  const all = [...boardTags];
  for (const t of value) if (!all.some((x) => x.toLowerCase() === t.toLowerCase())) all.push(t);
  all.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  const has = (tag) => value.some((x) => x.toLowerCase() === tag.toLowerCase());

  useEffect(() => {
    if (open) panelRef.current?.querySelector('input')?.focus();
  }, [open]);

  const close = () => { setOpen(false); setMessage(''); setDraft(''); setTimeout(() => toggleRef.current?.focus(), 0); };

  const toggle = (tag) => {
    if (has(tag)) { onChange(value.filter((x) => x.toLowerCase() !== tag.toLowerCase())); setMessage(`Removed ${tag}.`); return; }
    if (value.length >= TAG_LIMITS.count) { setMessage(`A task can have up to ${TAG_LIMITS.count} tags. Remove one first.`); return; }
    onChange([...value, tag]);
    setMessage(`Added ${tag}.`);
  };

  const create = () => {
    const tag = draft.trim().replace(/\s+/g, ' ').slice(0, TAG_LIMITS.length);
    if (!tag) { setMessage('Type a name for the new tag.'); newRef.current?.focus(); return; }
    const existing = all.find((x) => x.toLowerCase() === tag.toLowerCase());
    if (existing && has(existing)) { setMessage(`${existing} is already on this task.`); setDraft(''); return; }
    if (value.length >= TAG_LIMITS.count) { setMessage(`A task can have up to ${TAG_LIMITS.count} tags. Remove one first.`); return; }
    // Typing the name of a tag that already exists just ticks it, so there are no near-duplicates.
    onChange([...value, existing ?? tag]);
    setMessage(existing ? `${existing} already existed – added it.` : `Created and added ${tag}.`);
    setDraft('');
    newRef.current?.focus();
  };

  return (
    <div className="grid min-w-0 gap-1.5">
      <span id="task-tags-label" className="text-sm font-medium text-slate-700">Tags (optional)</span>

      <div className="flex flex-wrap items-center gap-1.5">
        {value.length === 0 && <span className="text-sm text-slate-600">No tags yet.</span>}
        {value.map((tag) => (
          <span key={tag} className={chip}>
            #{tag}
            <button
              type="button"
              onClick={() => onChange(value.filter((x) => x !== tag))}
              aria-label={`Remove tag ${tag}`}
              className="inline-flex h-6 w-6 items-center justify-center rounded text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
            >
              <span aria-hidden="true">×</span>
            </button>
          </span>
        ))}
        <button
          ref={toggleRef}
          type="button"
          id="task-tags"
          onClick={() => (open ? close() : setOpen(true))}
          aria-expanded={open}
          aria-controls="task-tags-panel"
          aria-describedby="task-tags-label"
          className={button}
        >
          {value.length ? 'Change tags' : 'Add tags'}
          <span aria-hidden="true" className="text-xs">{open ? '▴' : '▾'}</span>
        </button>
      </div>

      {open && (
        <div
          id="task-tags-panel"
          ref={panelRef}
          // Escape closes just this list, not the task window around it.
          onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } }}
          className="grid min-w-0 gap-3 rounded-md border border-slate-300 bg-surface p-3 shadow-sm [&>*]:min-w-0"
        >
          {all.length > 0 ? (
            <fieldset className="grid min-w-0 gap-1">
              <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-700">Tags on this board</legend>
              <ul className="grid max-h-48 gap-0.5 overflow-y-auto sm:grid-cols-2">
                {all.map((tag) => (
                  <li key={tag}>
                    <label className="flex min-h-[32px] cursor-pointer items-center gap-2 rounded px-1.5 text-sm text-slate-800 hover:bg-slate-100">
                      <input type="checkbox" checked={has(tag)} onChange={() => toggle(tag)} className="h-4 w-4 accent-[rgb(var(--brand-primary))]" />
                      <span className="min-w-0 [overflow-wrap:anywhere]">#{tag}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
          ) : (
            <p className="text-sm text-slate-600">No tags on this board yet – create the first one.</p>
          )}

          <div className="grid gap-1">
            <label htmlFor="task-new-tag" className="text-xs font-semibold uppercase tracking-wide text-slate-700">Create a new tag</label>
            <div className="flex flex-wrap gap-2">
              <input
                ref={newRef}
                id="task-new-tag"
                value={draft}
                maxLength={TAG_LIMITS.length}
                onChange={(e) => { setDraft(e.target.value); setMessage(''); }}
                // Enter creates the tag instead of saving the whole task.
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); create(); } }}
                placeholder="e.g. Testing"
                autoComplete="off"
                className="min-w-0 flex-1 basis-40 rounded-md border border-slate-300 bg-surface px-2.5 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
              <button type="button" onClick={create} className={button}>Create</button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p role="status" className="text-xs text-slate-700">{message}</p>
            <button type="button" onClick={close} className={button}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}
