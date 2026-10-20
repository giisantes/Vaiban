/**
 * Visual style for each task type (M6), defined once so the board, the
 * modal and anywhere else a task appears all use the same colours.
 *
 * Tailwind only generates classes it can see written out in full,
 * so the class names are listed here as complete strings.
 */
export const TYPE_STYLES = {
  feature: {
    stripe: 'border-l-feature',               // 4px left edge on cards
    badge: 'bg-feature-soft text-feature',    // label + icon
    topEdge: 'border-t-feature',              // top edge of the modal
    selected: 'border-feature bg-feature-soft text-feature',
  },
  bug: {
    stripe: 'border-l-bug',
    badge: 'bg-bug-soft text-bug',
    topEdge: 'border-t-bug',
    selected: 'border-bug bg-bug-soft text-bug',
  },
};

/** Style for a type, falling back to `feature` for anything unexpected. */
export function typeStyle(type) {
  return TYPE_STYLES[type] ?? TYPE_STYLES.feature;
}
