import { useCallback, useRef, useState } from 'react';

/**
 * Undo history using the Memento pattern (CM6311; P1 in the design log).
 *
 * Before a change, `record()` saves a snapshot ("memento") of the current
 * value. `undo()` restores the most recent snapshot. This works because
 * the task list is never changed in place – every change makes a new
 * array (M5 onward) – so an old array is a complete, safe copy.
 *
 * @template T
 * @param {T} current                  the value being protected (the task list)
 * @param {(value: T) => void} restore sets the value back
 * @param {number} [limit=20]          how many steps are kept
 */
export function useUndo(current, restore, limit = 20) {
  const stack = useRef([]);           // [{ snapshot, label }]
  const [size, setSize] = useState(0); // re-render when the stack changes

  /** Save the current value before changing it. `label` describes the change. */
  const record = useCallback(
    (label) => {
      stack.current = [...stack.current.slice(-(limit - 1)), { snapshot: current, label }];
      setSize(stack.current.length);
    },
    [current, limit]
  );

  /** Restore the last snapshot. Returns its label, or null if there was nothing to undo. */
  const undo = useCallback(() => {
    const last = stack.current.at(-1);
    if (!last) return null;
    stack.current = stack.current.slice(0, -1);
    setSize(stack.current.length);
    restore(last.snapshot);
    return last.label;
  }, [restore]);

  return { record, undo, canUndo: size > 0 };
}
