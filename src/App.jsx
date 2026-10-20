import { useCallback, useEffect, useMemo, useState } from 'react';
import { ANCHORS_STORAGE_KEY, CONTEXT_TEMPLATE, STAGES, TASKS_STORAGE_KEY } from './constants.js';
import { useLocalStorage } from './hooks/useLocalStorage.js';
import { useToday } from './hooks/useToday.js';
import { useUndo } from './hooks/useUndo.js';
import { defaultAnchors } from './lib/anchors.js';
import { createTask, withTaskDefaults } from './lib/createTask.js';
import { seedTasks } from './data/seedTasks.js';
import AnchorBoard from './components/AnchorBoard.jsx';
import Board from './components/Board.jsx';
import TaskModal from './components/TaskModal.jsx';
import Toast from './components/Toast.jsx';

/**
 * Vibecoding Project Tracker.
 *
 * Code layout:
 *   constants.js              STAGES, TASK_TYPES, TEAM, storage key
 *   hooks/                    useLocalStorage (from the starter), useDismiss, useToday,
 *                             useUndo (M12, Memento-style undo)
 *   lib/createTask.js         Task data model + createTask() factory
 *   lib/typeStyles.js         feature / bug colours (M6)
 *   lib/people.js             initials + avatar colours (M7)
 *   lib/dueState.js           due-date states + labels (M8)
 *   lib/contextPrompt.js      task → Markdown briefing for AI tools (M10)
 *   lib/clipboard.js          copy to clipboard with a fallback (M10)
 *   lib/anchors.js            Anchor model + link tidying (M11)
 *   data/seedTasks.js         mock tasks for first load
 *   components/               Board → Column → TaskCard, TaskModal, Toast, …
 *
 * M12 secret-sauce: drag cards between columns, and undo any board change
 * (the toast's Undo button, or Ctrl/Cmd+Z). The status dropdown in the
 * task modal stays as the keyboard / single-click way to move a card.
 */
export default function App() {
  // M4 data-model: tasks persist in localStorage; the mock tasks are only
  // used when nothing is stored yet (i.e. on first load).
  const [storedTasks, setTasks] = useLocalStorage(TASKS_STORAGE_KEY, seedTasks());
  // M9: tasks saved before the context fields existed get their defaults.
  const tasks = useMemo(() => storedTasks.map(withTaskDefaults), [storedTasks]);

  // M5 crud-modal: the task open in the modal (null = closed). Clicking a
  // card opens it read-only; the modal's "Edit task" button switches to the form.
  const [editing, setEditing] = useState(null);
  const isNew = editing ? !tasks.some((t) => t.id === editing.id) : false;

  // M12: undo history for the task list (Memento – see hooks/useUndo.js).
  const history = useUndo(storedTasks, setTasks);

  // M7 task-owner: confirmation message + which card to highlight briefly.
  // A toast is { message, action? } – M12 adds the Undo action.
  const [toast, setToast] = useState(null);
  const [highlightId, setHighlightId] = useState(null);
  const clearToast = useCallback(() => setToast(null), []);

  // M8 due-tint: today's date, updated automatically so colours move on by themselves.
  const today = useToday();

  useEffect(() => {
    if (!highlightId) return;
    const timer = setTimeout(() => setHighlightId(null), 1500);
    return () => clearTimeout(timer);
  }, [highlightId]);

  // M9: new tasks start with the Context template (Background / Constraints / …).
  const openNewTask = () => setEditing(createTask({ context: CONTEXT_TEMPLATE }));
  const openTask = (id) => setEditing(tasks.find((t) => t.id === id) ?? null);
  const closeModal = () => setEditing(null);

  const titleOf = (id) => `"${tasks.find((t) => t.id === id)?.title ?? 'task'}"`;
  const stageLabel = (id) => STAGES.find((st) => st.id === id)?.label ?? id;

  // M12: every change to the task list goes through here, so it can be undone.
  // `label` says what the change was, e.g. 'moving "Fix login" to Review'.
  const change = (label, updater) => {
    history.record(label);
    setTasks(updater);
  };

  const undo = useCallback(() => {
    const label = history.undo();
    if (label) setToast({ message: `Undid ${label}.` });
  }, [history]);

  /** A toast that offers Undo for the change that was just made. */
  const undoableToast = (message) => setToast({ message, action: { label: 'Undo', onClick: undo } });

  // Ctrl/Cmd+Z undoes the last board change – but not while typing in a
  // field or while the modal is open, where the browser's own undo applies.
  useEffect(() => {
    const onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.key.toLowerCase() !== 'z') return;
      const el = e.target;
      if (el.closest?.('input, textarea, select, [contenteditable], dialog')) return;
      e.preventDefault();
      undo();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [undo]);

  // Add or update. Saving through setTasks also saves to localStorage (via the hook).
  const saveTask = (task) => {
    const exists = tasks.some((t) => t.id === task.id);
    change(`${exists ? 'editing' : 'adding'} "${task.title}"`, (prev) =>
      exists ? prev.map((t) => (t.id === task.id ? task : t)) : [...prev, task]
    );
    closeModal();
  };

  const deleteTask = (id) => {
    const name = titleOf(id);
    change(`deleting ${name}`, (prev) => prev.filter((t) => t.id !== id));
    closeModal();
    undoableToast(`Deleted ${name}.`);
  };

  // M7: reassign a task from the owner menu on the card (click the avatar / name), then acknowledge it.
  const handOff = (id, name) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    change(`handing "${task.title}" to ${name}`, (prev) => prev.map((t) => (t.id === id ? { ...t, assignee: name } : t)));
    undoableToast(`Handed "${task.title}" to ${name}.`);
    setHighlightId(id);
  };

  // M12: a card was dropped on another column. It goes to the bottom of that column.
  const moveTask = (id, status) => {
    const task = tasks.find((t) => t.id === id);
    if (!task || task.status === status) return;
    change(`moving "${task.title}" to ${stageLabel(status)}`, (prev) => [
      ...prev.filter((t) => t.id !== id),
      { ...prev.find((t) => t.id === id), status },
    ]);
    undoableToast(`Moved "${task.title}" to ${stageLabel(status)}.`);
    setHighlightId(id);
  };

  // M10 copy-context: confirm on the page as well as on the button.
  const contextCopied = (ok) =>
    setToast({ message: ok ? 'Context copied. Paste it into your AI tool.' : "Couldn't copy. Open the task and copy the Context text yourself." });

  // M11 project-deliverables: the four pinned deliverable links.
  const [anchors, setAnchors] = useLocalStorage(ANCHORS_STORAGE_KEY, defaultAnchors());
  const saveAnchor = (id, url) =>
    setAnchors((prev) => prev.map((a) => (a.id === id ? { ...a, url } : a)));

  return (
    <div className="min-h-screen p-6">
      <header className="mb-4 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Vibecoding Project Tracker
          </h1>
          <p className="text-sm text-slate-600">
            {/* Replace this line with your team name from PRD §11. */}
            Team starter
          </p>
        </div>
        <button
          type="button"
          onClick={openNewTask}
          className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
        >
          + Task
        </button>
      </header>

      <AnchorBoard anchors={anchors} onSave={saveAnchor} />

      <Board
        tasks={tasks}
        onOpenTask={openTask}
        onHandOff={handOff}
        onMoveTask={moveTask}
        highlightId={highlightId}
        today={today}
        onCopied={contextCopied}
      />

      <TaskModal task={editing} isNew={isNew} onSave={saveTask} onDelete={deleteTask} onClose={closeModal} today={today} />
      <Toast toast={toast} onDone={clearToast} />
    </div>
  );
}
