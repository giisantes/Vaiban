import { useState } from 'react';
import { TASKS_STORAGE_KEY } from './constants.js';
import { useLocalStorage } from './hooks/useLocalStorage.js';
import { createTask } from './lib/createTask.js';
import { seedTasks } from './data/seedTasks.js';
import Board from './components/Board.jsx';
import TaskModal from './components/TaskModal.jsx';

/**
 * Vibecoding Project Tracker.
 *
 * Code layout:
 *   constants.js              STAGES, TASK_TYPES, TEAM, storage key
 *   hooks/useLocalStorage.js  persistence hook (from the starter)
 *   lib/createTask.js         Task data model + createTask() factory
 *   data/seedTasks.js         mock tasks for first load
 *   components/               Board → Column → TaskCard, TaskModal
 *
 * Remaining milestones — search for `TODO M<n>`:
 *   - M6  tag-style     : feature vs. bug color coding (uses DESIGN.md §2 colors).
 *   - M7  task-owner    : assignee badge + "Hand off to..." dropdown.
 *   - M8  due-tint      : color cards by due date (uses DESIGN.md §2 due-state colors).
 *   - M9  context       : a curated Context briefing field on the modal.
 *   - M10 copy-prompt   : a "Copy as Prompt Context" button that serializes the task + context.
 *   - M11 anchors       : the Anchor Board above the Kanban.
 *   - M12 secret-sauce  : the one open-ended thing that makes your tracker yours.
 */
export default function App() {
  // M4 data-model: tasks persist in localStorage; the mock tasks are only
  // used when nothing is stored yet (i.e. on first load).
  const [tasks, setTasks] = useLocalStorage(TASKS_STORAGE_KEY, seedTasks());

  // M5 crud-modal: the task being added or edited (null = modal closed).
  const [editing, setEditing] = useState(null);
  const isNew = editing ? !tasks.some((t) => t.id === editing.id) : false;

  const openNewTask = () => setEditing(createTask());
  const openTask = (id) => setEditing(tasks.find((t) => t.id === id) ?? null);
  const closeModal = () => setEditing(null);

  // Add or update. Saving through setTasks also saves to localStorage (via the hook).
  const saveTask = (task) => {
    setTasks((prev) =>
      prev.some((t) => t.id === task.id)
        ? prev.map((t) => (t.id === task.id ? task : t))
        : [...prev, task]
    );
    closeModal();
  };

  const deleteTask = (id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    closeModal();
  };

  // TODO M11 anchors:
  //   const [anchors, setAnchors] = useLocalStorage('vibetracker.anchors', [...]);

  return (
    <div className="min-h-screen p-6">
      <header className="mb-6 flex items-end justify-between">
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
          className="rounded-md bg-[#23466E] px-4 py-2 text-sm font-medium text-white hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#23466E] focus-visible:ring-offset-2"
        >
          + Task
        </button>
      </header>

      {/* TODO M11 anchors: render the Anchor Board (Presentation / Demo / Report / Documentation) above the board. */}

      <Board tasks={tasks} onOpenTask={openTask} />

      <TaskModal task={editing} isNew={isNew} onSave={saveTask} onDelete={deleteTask} onClose={closeModal} />
    </div>
  );
}
