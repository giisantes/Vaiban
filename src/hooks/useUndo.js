import { useCallback, useRef, useState } from 'react';
import { diffById } from '../lib/diff.js';

/**
 * Undo history using the Memento pattern (CM6311; P1 in the design log).
 *
 * Before (D65): each memento was a snapshot of the whole task list, and undo
 * put the whole list back. On a shared board that would also wipe out
 * whatever teammates had changed in the meantime.
 *
 * Now each memento holds only the tasks that one action touched, as they
 * were before it (or "didn't exist" for a task the action added). Undo puts
 * back just those tasks and leaves everyone else's work alone.
 *
 * @param {(update: (tasks: object[]) => object[]) => void} setTasks
 * @param {number} [limit=20]  how many steps are kept
 */
export function useUndo(setTasks, limit = 20) {
  const stack = useRef([]);            // [{ label, before: Map<id, task | null> }]
  const [size, setSize] = useState(0); // re-render when the stack changes

  /** Remember what an action changed. `label` describes it, e.g. 'moving "Fix login" to Review'. */
  const record = useCallback(
    (label, prevTasks, nextTasks) => {
      const { added, changed, removed } = diffById(prevTasks, nextTasks);
      const before = new Map();
      for (const t of added) before.set(t.id, null);
      for (const t of changed) before.set(t.id, prevTasks.find((p) => p.id === t.id));
      for (const t of removed) before.set(t.id, t);
      if (before.size === 0) return;
      stack.current = [...stack.current.slice(-(limit - 1)), { label, before }];
      setSize(stack.current.length);
    },
    [limit]
  );

  /** Put back the tasks the last action changed. Returns its label, or null if there was nothing to undo. */
  const undo = useCallback(() => {
    const last = stack.current.at(-1);
    if (!last) return null;
    stack.current = stack.current.slice(0, -1);
    setSize(stack.current.length);
    setTasks((tasks) => {
      // Tasks still on the board go back to their old version (or away, if the
      // action added them); tasks the action deleted come back.
      const kept = tasks.map((t) => (last.before.has(t.id) ? last.before.get(t.id) : t)).filter(Boolean);
      const deleted = [...last.before.values()].filter((old) => old && !tasks.some((t) => t.id === old.id));
      return [...kept, ...deleted];
    });
    return last.label;
  }, [setTasks]);

  return { record, undo, canUndo: size > 0 };
}
