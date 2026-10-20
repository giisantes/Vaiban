import { TASKS_STORAGE_KEY } from './constants.js';
import { useLocalStorage } from './hooks/useLocalStorage.js';
import { seedTasks } from './data/seedTasks.js';
import Board from './components/Board.jsx';

/**
 * Vibecoding Project Tracker.
 *
 * Code layout:
 *   constants.js              STAGES, TEAM, storage key
 *   hooks/useLocalStorage.js  persistence hook (from the starter)
 *   lib/createTask.js         Task data model + createTask() factory
 *   data/seedTasks.js         mock tasks for first load
 *   components/               Board → Column → TaskCard
 *
 * Remaining milestones — search for `TODO M<n>`:
 *   - M5  crud-modal    : add the "+" button modal and the edit-on-click modal.
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
  const [tasks] = useLocalStorage(TASKS_STORAGE_KEY, seedTasks());

  // TODO M5 crud-modal:
  //   const [editing, setEditing] = useState(null);
  //   (use the setter from useLocalStorage above to add / edit / delete)
  //
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
      </header>

      {/* TODO M11 anchors: render the Anchor Board (Presentation / Demo / Report / Documentation) above the board. */}

      {/* TODO M5 crud-modal: add a "+" button that opens a modal; clicking a card opens it in edit mode. */}
      <Board tasks={tasks} />
    </div>
  );
}
