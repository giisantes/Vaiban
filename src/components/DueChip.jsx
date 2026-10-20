import { DUE_STYLES } from '../lib/dueState.js';

/** Clock for upcoming / done, warning triangle for overdue. Decorative. */
function DueIcon({ state }) {
  if (state === 'overdue') {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3 2 21h20L12 3Z" />
        <path d="M12 10v5M12 18h.01" />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

/**
 * Small due-date label on a card (M8): icon + words, coloured by state.
 *
 * @param {{ due: { state: string, label: string } }} props
 */
export default function DueChip({ due }) {
  if (due.state === 'none') return null;
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-xs font-semibold ${DUE_STYLES[due.state].chip}`}>
      <DueIcon state={due.state} />
      {due.label}
    </span>
  );
}
