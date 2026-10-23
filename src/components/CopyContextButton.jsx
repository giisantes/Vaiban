import { useEffect, useState } from 'react';
import { copyText } from '../lib/clipboard.js';
import { formatContext } from '../lib/contextPrompt.js';

/**
 * "Copy Context" button (M10), used on every card and inside the modal.
 * Copies the task as a Markdown briefing. The label itself changes to
 * "Copied" for two seconds, so there is feedback right where the user is
 * looking – including inside the modal, where the page toast is hidden.
 *
 * @param {{
 *   task: import('../lib/createTask.js').Task,
 *   onCopied?: (ok: boolean) => void,   // e.g. show the page toast
 *   className?: string,
 * }} props
 */
export default function CopyContextButton({ task, onCopied, className = '' }) {
  const [result, setResult] = useState(null); // null | 'ok' | 'failed'

  useEffect(() => {
    if (!result) return;
    const timer = setTimeout(() => setResult(null), 2000);
    return () => clearTimeout(timer);
  }, [result]);

  const handleClick = async () => {
    const ok = await copyText(formatContext(task));
    setResult(ok ? 'ok' : 'failed');
    onCopied?.(ok);
  };

  const label = result === 'ok' ? 'Copied' : result === 'failed' ? "Couldn't copy" : 'Copy Context';

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={result ? label : `Copy context for “${task.title || 'this task'}”`}
      className={`relative z-10 inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-2 py-1 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${
        result === 'ok'
          ? 'border-due-safe bg-due-safe-soft text-due-safe'
          : 'border-slate-300 bg-surface text-slate-700 hover:bg-slate-100'
      } ${className}`}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {result === 'ok' ? (
          <path d="m5 12 5 5 9-10" />
        ) : (
          <>
            <rect x="9" y="9" width="11" height="11" rx="2" />
            <path d="M5 15V6a2 2 0 0 1 2-2h9" />
          </>
        )}
      </svg>
      {label}
    </button>
  );
}
