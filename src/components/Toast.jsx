import { useEffect, useRef, useState } from 'react';

/**
 * Short confirmation message at the bottom of the screen.
 * It sits in an aria-live region, so screen readers announce it too.
 * Fades in over 200 ms (DESIGN.md §7) and hides itself after a few seconds.
 *
 * M12: a toast can carry an action button (e.g. "Undo"). Toasts with an
 * action stay up longer, and the timer pauses while the pointer or keyboard
 * focus is on the toast, so there is time to use it (WCAG 2.2.1).
 *
 * @param {{
 *   toast: { message: string, action?: { label: string, onClick: () => void, shortcut?: string } } | null,
 *   onDone: () => void,
 * }} props
 */
export default function Toast({ toast, onDone }) {
  const [paused, setPaused] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!toast || paused) return;
    const timer = setTimeout(onDone, toast.action ? 6000 : 4000);
    return () => clearTimeout(timer);
  }, [toast, paused, onDone]);

  useEffect(() => setPaused(false), [toast]);

  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      {toast && (
        <div
          ref={ref}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={(e) => { if (!ref.current?.contains(e.relatedTarget)) setPaused(false); }}
          className="pointer-events-auto flex animate-toast-in items-center gap-4 rounded-md bg-slate-900 px-4 py-2.5 text-sm text-white shadow-lg motion-reduce:animate-none"
        >
          <p>{toast.message}</p>
          {toast.action && (
            <button
              type="button"
              onClick={() => { toast.action.onClick(); }}
              aria-keyshortcuts={toast.action.shortcut === 'Ctrl+Z' ? 'Control+Z' : undefined}
              className="rounded px-2 py-0.5 font-semibold text-brand-accent underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
            >
              {toast.action.label}
            </button>
          )}
          {/* The toast sits at the end of the page, far away by keyboard – so say the shortcut. */}
          {toast.action?.shortcut && <span className="text-xs text-slate-300">or {toast.action.shortcut}</span>}
        </div>
      )}
    </div>
  );
}
