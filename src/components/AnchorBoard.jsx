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
    <li className={`grid gap-1.5 rounded-md border bg-white p-2.5 ${filled ? 'border-due-safe/40' : 'border-dashed border-slate-300'}`}>
      <div className="flex items-center justify-between gap-2">
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
      <div className="flex items-center gap-2">
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
          className={`min-w-0 flex-1 rounded border px-2 py-1 text-xs text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-primary ${
            error ? 'border-due-overdue' : 'border-slate-300'
          }`}
        />
        {filled && (
          <a
            href={anchor.url}
            target="_blank"
            rel="noreferrer"
            className="whitespace-nowrap rounded px-1 text-xs font-medium text-brand-primary underline underline-offset-2 hover:no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
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

/**
 * The Anchor Board (M11): the four final-project deliverables, pinned above
 * the Kanban board so the team always sees what is still missing.
 *
 * @param {{ anchors: import('../lib/anchors.js').Anchor[], onSave: (id: string, url: string|null) => void }} props
 */
export default function AnchorBoard({ anchors, onSave }) {
  const linked = anchors.filter((a) => a.url).length;
  return (
    <section aria-labelledby="anchors-heading" className="sticky top-0 z-30 -mx-6 mb-5 border-b border-slate-200 bg-slate-50/95 px-6 py-3 backdrop-blur">
      <div className="mb-2 flex items-baseline gap-3">
        <h2 id="anchors-heading" className="text-sm font-semibold uppercase tracking-wide text-slate-800">Deliverables</h2>
        <p className="text-xs text-slate-600">{linked} of {anchors.length} linked</p>
      </div>
      <ul className="grid grid-cols-4 gap-4">
        {anchors.map((anchor) => (
          <AnchorCard key={anchor.id} anchor={anchor} onSave={onSave} />
        ))}
      </ul>
    </section>
  );
}
