import { useEffect, useState } from 'react';
import { normaliseUrl } from '../lib/anchors.js';

/**
 * One deliverable slot: label, status dot and a single link field (M11).
 * The link saves when the field loses focus or Enter is pressed, the same
 * "no Save button" rule as the board (D10).
 *
 * @param {{ anchor: import('../lib/anchors.js').Anchor, onSave: (id: string, url: string|null) => void }} props
 */
function AnchorCard({ anchor, onSave }) {
  const [draft, setDraft] = useState(anchor.url ?? '');
  const [error, setError] = useState(false);
  useEffect(() => setDraft(anchor.url ?? ''), [anchor.url]);

  const inputId = `anchor-${anchor.id}`;
  const errorId = `${inputId}-error`;
  const filled = Boolean(anchor.url);

  const commit = () => {
    const url = normaliseUrl(draft);
    if (url === undefined) { setError(true); return; }
    setError(false);
    setDraft(url ?? '');
    if (url !== anchor.url) onSave(anchor.id, url);
  };

  return (
    <li className={`grid min-w-0 gap-1.5 rounded-md border bg-surface p-2.5 ${filled ? 'border-due-safe/40' : 'border-dashed border-slate-300'}`}>
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <label htmlFor={inputId} className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <span
            aria-hidden="true"
            className={`h-2.5 w-2.5 shrink-0 rounded-full ${filled ? 'bg-due-safe' : 'border-2 border-slate-400'}`}
          />
          {anchor.label}
        </label>
        <span className={`text-xs ${filled ? 'font-medium text-due-safe' : 'text-slate-600'}`}>
          {filled ? 'Linked' : 'No link yet'}
        </span>
      </div>
      <div className="flex min-w-0 items-center gap-2">
        <input
          id={inputId}
          type="text"
          inputMode="url"
          value={draft}
          placeholder="Paste a link"
          onChange={(e) => { setDraft(e.target.value); setError(false); }}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); } }}
          aria-invalid={error}
          aria-describedby={error ? errorId : undefined}
          className={`w-0 min-w-0 flex-1 rounded border bg-surface px-2 py-1 text-xs text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-primary ${
            error ? 'border-due-overdue' : 'border-slate-300'
          }`}
        />
        {filled && (
          <a
            href={anchor.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-[24px] items-center whitespace-nowrap rounded px-1.5 py-1 text-xs font-medium text-link underline underline-offset-2 hover:no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
          >
            Open<span className="sr-only"> {anchor.label} (opens in a new tab)</span> ↗
          </a>
        )}
      </div>
      {error && (
        <p id={errorId} className="text-xs font-medium text-due-overdue">
          That doesn't look like a link.
        </p>
      )}
    </li>
  );
}

const OPEN_KEY = 'vibetracker.deliverablesOpen';
const readOpen = () => { try { return window.localStorage.getItem(OPEN_KEY) === '1'; } catch { return false; } };

/**
 * The Anchor Board (M11): the four final-project deliverables above the board.
 *
 * D78: folded away by default behind a "Deliverables" button, so the board
 * isn't crowded with four extra boxes and fields – less to take in, which
 * helps people with cognitive disabilities (and everyone else). The button
 * still shows how many are linked, so nothing is hidden about the progress.
 * Open or closed is remembered in this browser. Built as a disclosure button
 * (aria-expanded), which keyboards and screen readers already understand.
 *
 * @param {{ anchors: import('../lib/anchors.js').Anchor[], onSave: (id: string, url: string|null) => void }} props
 */
export default function AnchorBoard({ anchors, onSave }) {
  const linked = anchors.filter((a) => a.url).length;
  const [open, setOpen] = useState(readOpen);
  const toggle = () => {
    setOpen((was) => {
      try { window.localStorage.setItem(OPEN_KEY, was ? '0' : '1'); } catch { /* per-browser convenience only */ }
      return !was;
    });
  };

  return (
    <section
      aria-labelledby="anchors-heading"
      className={`-mx-4 mb-5 border-b border-slate-200 bg-slate-50/95 px-4 py-2 sm:-mx-6 sm:px-6 ${open ? 'z-30 backdrop-blur xl:sticky xl:top-0' : ''}`}
    >
      <h2 id="anchors-heading" className="text-sm font-semibold text-slate-800">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-controls="anchors-list"
          className="-mx-1.5 inline-flex min-h-[32px] items-center gap-2 rounded-md px-1.5 py-1 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className={`h-4 w-4 transition-transform motion-reduce:transition-none ${open ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 6 6 6-6 6" />
          </svg>
          <span className="uppercase tracking-wide">Deliverables</span>
          <span className="text-xs font-normal normal-case tracking-normal text-slate-600">
            <span aria-hidden="true" className="mr-1.5 inline-flex gap-0.5 align-middle">
              {anchors.map((a) => (
                <span key={a.id} className={`inline-block h-2 w-2 rounded-full ${a.url ? 'bg-due-safe' : 'border border-slate-400'}`} />
              ))}
            </span>
            {linked} of {anchors.length} linked
          </span>
        </button>
      </h2>
      <ul id="anchors-list" hidden={!open} className={`four-cols mt-2 ${open ? 'grid' : 'hidden'} grid-cols-1 gap-3 pb-1 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4`}>
        {anchors.map((anchor) => (
          <AnchorCard key={anchor.id} anchor={anchor} onSave={onSave} />
        ))}
      </ul>
    </section>
  );
}
