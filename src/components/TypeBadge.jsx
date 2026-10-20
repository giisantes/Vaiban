import { TASK_TYPES } from '../constants.js';
import { typeStyle } from '../lib/typeStyles.js';

/**
 * Small inline icon for a task type: a four-point sparkle for features,
 * a bug for bugs. Decorative only — the text label next to it carries the
 * meaning, so colour and shape are never the only signal (WCAG 1.4.1).
 *
 * @param {{ type: 'feature'|'bug', className?: string }} props
 */
export function TypeIcon({ type, className = 'h-3.5 w-3.5' }) {
  if (type === 'bug') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={className}
        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <ellipse cx="12" cy="14" rx="5" ry="6" />
        <path d="M9.5 7.5a2.5 2.5 0 0 1 5 0" />
        <path d="M12 9v11" />
        <path d="M7 11 3 9M7 14H3M7 17l-4 2M17 11l4-2M17 14h4M17 17l4 2" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={className} fill="currentColor">
      <path d="M12 2 14 10 22 12 14 14 12 22 10 14 2 12 10 10Z" />
    </svg>
  );
}

/**
 * Type label with icon, e.g. "✦ Feature" / "🐞 Bug", in the type's colours.
 *
 * @param {{ type: 'feature'|'bug' }} props
 */
export default function TypeBadge({ type }) {
  const label = TASK_TYPES.find((t) => t.id === type)?.label ?? type;
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-xs font-semibold ${typeStyle(type).badge}`}>
      <TypeIcon type={type} />
      {label}
    </span>
  );
}
