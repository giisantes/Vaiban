import { useCallback, useEffect, useMemo, useState } from 'react';
import { CONTEXT_TEMPLATE, PROJECTS_STORAGE_KEY, STAGES, TASKS_STORAGE_KEY } from './constants.js';
import { useHashRoute } from './hooks/useHashRoute.js';
import { useLocalStorage } from './hooks/useLocalStorage.js';
import { useToday } from './hooks/useToday.js';
import { useUndo } from './hooks/useUndo.js';
import { createTask, withTaskDefaults } from './lib/createTask.js';
import { createProject, seedProjects } from './lib/projects.js';
import { seedTasks } from './data/seedTasks.js';
import AnchorBoard from './components/AnchorBoard.jsx';
import AppHeader from './components/AppHeader.jsx';
import Board from './components/Board.jsx';
import ProjectsHome from './components/ProjectsHome.jsx';
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
 *   lib/projects.js           Project model + createProject() factory (home page)
 *   hooks/useHashRoute.js     #/ = home, #/project/<id> = that project's board
 *   data/seedTasks.js         mock tasks for first load
 *   components/               Board → Column → TaskCard, TaskModal, Toast, …
 *
 * Home page (after M12): a list of projects, each with its own board and
 * its own deliverable links. Tasks belong to a project via `projectId`.
 *
 * M12 secret-sauce: drag cards between columns, and undo any board change
 * (the toast's Undo button, or Ctrl/Cmd+Z). The status dropdown in the
 * task modal stays as the keyboard / single-click way to move a card.
 */
export default function App() {
  // Home page: which project is open (null = the projects list), kept in the URL hash.
  const [projectId, navigate] = useHashRoute();
  const [projects, setProjects] = useLocalStorage(PROJECTS_STORAGE_KEY, seedProjects());
  const project = projects.find((p) => p.id === projectId) ?? null;

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
  const openNewTask = () => setEditing(createTask({ projectId: project.id, context: CONTEXT_TEMPLATE }));
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

  // M11 project-deliverables: each project has its own four deliverable links.
  const saveAnchor = (anchorId, url) =>
    setProjects((prev) =>
      prev.map((p) => (p.id === project.id ? { ...p, anchors: p.anchors.map((a) => (a.id === anchorId ? { ...a, url } : a)) } : p))
    );

  // Home page: add a project, then go straight to its (empty) board.
  const addProject = (fields) => {
    const created = createProject(fields);
    setProjects((prev) => [...prev, created]);
    navigate(created.id);
    setToast({ message: `Created "${created.name}". Add its first task with + Task.` });
  };

  // A link to a project that no longer exists falls back to the home page.
  useEffect(() => {
    if (projectId && !project) navigate(null);
  }, [projectId, project, navigate]);

  return (
    <div className="min-h-screen p-6">
      <AppHeader project={project} onHome={() => navigate(null)} onNewTask={openNewTask} />

      {project ? (
        <>
          <AnchorBoard key={project.id} anchors={project.anchors} onSave={saveAnchor} />
          <Board
            tasks={tasks.filter((t) => t.projectId === project.id)}
            onOpenTask={openTask}
            onHandOff={handOff}
            onMoveTask={moveTask}
            highlightId={highlightId}
            today={today}
            onCopied={contextCopied}
          />
        </>
      ) : (
        <ProjectsHome projects={projects} tasks={tasks} today={today} onOpen={navigate} onCreate={addProject} />
      )}

      <TaskModal task={editing} isNew={isNew} onSave={saveTask} onDelete={deleteTask} onClose={closeModal} today={today} />
      <Toast toast={toast} onDone={clearToast} />
    </div>
  );
}
