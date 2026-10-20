/**
 * "just now", "5 min ago", "2 h ago", "yesterday", "3 days ago", or a date
 * for anything older than a week. Used for the Context "last updated" hint (M9).
 *
 * @param {string} iso   ISO timestamp
 * @param {number} [now] ms since epoch (for testing)
 */
export function relativeTime(iso, now = Date.now()) {
  const then = new Date(iso).getTime();
  if (isNaN(then)) return '';
  const mins = Math.round((now - then) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
