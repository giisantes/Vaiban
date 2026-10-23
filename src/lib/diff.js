/**
 * Compares two lists of objects with ids and says what changed.
 * Used to turn "here is the new task list" into the few database rows that
 * actually need saving, and by undo to remember only what an action touched.
 *
 * @template {{ id: string }} T
 * @param {T[]} before
 * @param {T[]} after
 * @returns {{ added: T[], changed: T[], removed: T[] }}
 */
export function diffById(before, after) {
  const old = new Map(before.map((item) => [item.id, item]));
  const added = [];
  const changed = [];
  for (const item of after) {
    const previous = old.get(item.id);
    if (!previous) added.push(item);
    else if (previous !== item && !same(previous, item)) changed.push(item);
    old.delete(item.id);
  }
  return { added, changed, removed: [...old.values()] };
}

/** Deep equality for plain JSON data. */
export function same(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}
