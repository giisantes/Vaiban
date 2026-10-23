import { useCallback, useEffect, useMemo, useState } from 'react';
import { CONTEXT_TEMPLATE, STAGES } from '../constants.js';
import { useHashRoute } from '../hooks/useHashRoute.js';
import { useStoredState } from '../hooks/useStoredState.js';
import { useToday } from '../hooks/useToday.js';
import { useUndo } from '../hooks/useUndo.js';
import { createTask, withTaskDefaults } from '../lib/createTask.js';
import { createProject, seedProjects } from '../lib/projects.js';
import { readLocalData } from '../lib/storage.js';
import { seedTasks } from '../data/seedTasks.js';
import AnchorBoard from './AnchorBoard.jsx';
import AppHeader from './AppHeader.jsx';
import FullPageMessage from './FullPageMessage.jsx';
import Board from './Board.jsx';
import ProjectsHome from './ProjectsHome.jsx';
import TaskModal from './TaskModal.jsx';
import Toast from './Toast.jsx';
import ImportBanner from './ImportBanner.jsx';

/**
 * The signed-in workspace: home page + project boards (was App.jsx).
 * App.jsx now only decides between the sign-in screen and this.
 *
 * Code layout:
 *   constants.js              STAGES, TASK_TYPES, TEAM, storage key
 *   hooks/                    useStoredState (saving; replaces the starter's
 *                             useLocalStorage), useDismiss, useToday,
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
 *   lib/storage.js            where data is saved: this browser, or the user's
 *                             cloud account (Adapter pattern)
 *   lib/auth.js, hooks/useAuth.js  accounts (Supabase)
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
/**
 * @param {{
 *   store: import('../lib/storage.js').Store,  // this browser, or the user's account
 *   user: object | null,                       // the Supabase user (null = browser-only mode)
 *   onSignOut?: () => void,
 *   settings: { textSize: string, theme: string },   // display settings (D60)
 *   onSettingsChange: (changes: object) => void,
 * }} props
 */
export default function Workspace({ store, user, onSignOut, settings, onSettingsChange }) {
  const isCloud = store.kind === 'cloud';
  // Browser-only mode starts with the demo data; a new account starts empty.
  const [storedProjects, setProjects, projectsStatus, retryProjects] = useStoredState(store, 'projects', isCloud ? () => [] : seedProjects);
  // M4 data-model: the mock tasks are only used when nothing is saved yet.
  const [storedTasks, setTasks, tasksStatus, retryTasks] = useStoredState(store, 'tasks', isCloud ? () => [] : seedTasks);
  const loaded = storedProjects !== undefined && storedTasks !== undefined;
  const projects = storedProjects ?? [];

  // Home page: which project is open (null = the projects list), kept in the URL hash.
  const [projectId, navigate] = useHashRoute();
  const project = projects.find((p) => p.id === projectId) ?? null;

  // M9: tasks saved before the context fields existed get their defaults.
  const tasks = useMemo(() => (storedTasks ?? []).map(withTaskDefaults), [storedTasks]);

  // M5 crud-modal: the task open in the modal (null = closed). Clicking a
  // card opens it read-only; the modal's "Edit task" button switches to the form.
  const [editing, setEditing] = useState(null);
  const isNew = editing ? !tasks.some((t) => t.id === editing.id) : false;

  // M12: undo history for the task list (Memento – see hooks/useUndo.js).
  const history = useUndo(storedTasks ?? [], setTasks);

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
  const undoableToast = (message) => setToast({ message, action: { label: 'Undo', onClick: undo, shortcut: 'Ctrl+Z' } });

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

  // M12: a card was dropped on another column (or moved with the card's
  // "Move" menu). It goes to the bottom of that column.
  const [focusTaskId, setFocusTaskId] = useState(null);
  const moveTask = (id, status, how = {}) => {
    const task = tasks.find((t) => t.id === id);
    if (!task || task.status === status) return;
    change(`moving "${task.title}" to ${stageLabel(status)}`, (prev) => [
      ...prev.filter((t) => t.id !== id),
      { ...prev.find((t) => t.id === id), status },
    ]);
    undoableToast(`Moved "${task.title}" to ${stageLabel(status)}.`);
    setHighlightId(id);
    // Keyboard users: the card has jumped to another column, so take focus
    // with it instead of dropping them back at the top of the page.
    if (how.fromKeyboardMenu) setFocusTaskId(id);
  };

  useEffect(() => {
    if (!focusTaskId) return;
    document.querySelector(`[data-task-id="${focusTaskId}"] h3 button`)?.focus();
    setFocusTaskId(null);
  }, [focusTaskId, storedTasks]);

  // Each screen has its own page title, so screen-reader users and browser
  // tabs say where you are (WCAG 2.2 SC 2.4.2 Page Titled).
  useEffect(() => {
    document.title = project ? `${project.name} – Vibeboard` : 'Your projects – Vibeboard';
  }, [project]);

  /** "Skip to main content" – jumps past the header and the Deliverables strip. */
  const skipToMain = (e) => {
    e.preventDefault(); // a plain #main link would confuse the #/ router
    const target = document.getElementById(project ? 'board' : 'main');
    target?.focus();
    target?.scrollIntoView();
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
    if (loaded && projectId && !project) navigate(null);
  }, [loaded, projectId, project, navigate]);

  // Overall save status for the header, and a warning before leaving with unsaved changes.
  const statuses = [projectsStatus, tasksStatus];
  const saveStatus = statuses.includes('error') ? 'error' : statuses.includes('saving') ? 'saving' : 'saved';
  useEffect(() => {
    if (saveStatus === 'saved') return;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [saveStatus]);

  // Accounts: offer to bring in tasks saved in this browser before signing up.
  const dismissKey = user ? `vibetracker.importDismissed.${user.id}` : null;
  const [importDismissed, setImportDismissed] = useState(() => {
    try { return dismissKey ? Boolean(window.localStorage.getItem(dismissKey)) : true; } catch { return true; }
  });
  const localData = useMemo(() => (isCloud ? readLocalData() : null), [isCloud]);
  const offerImport = isCloud && loaded && !importDismissed && localData && tasks.length === 0 && projects.length === 0;
  const dismissImport = () => {
    setImportDismissed(true);
    try { window.localStorage.setItem(dismissKey, '1'); } catch { /* ignore */ }
  };
  const importLocal = () => {
    setProjects(localData.projects ?? seedProjects());
    setTasks(localData.tasks);
    dismissImport();
    setToast({ message: `Imported ${localData.tasks.length} tasks into your account.` });
  };

  if (projectsStatus === 'load-error' || tasksStatus === 'load-error') {
    return (
      <FullPageMessage>
        <p>Couldn't load your projects. Check your internet connection.</p>
        <button type="button" onClick={() => { retryProjects(); retryTasks(); }} className="mt-3 rounded-md bg-brand-primary px-4 py-1.5 text-sm font-medium text-white">
          Try again
        </button>
      </FullPageMessage>
    );
  }
  if (!loaded) return <FullPageMessage>Loading your projects…</FullPageMessage>;

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <a
        href="#main"
        onClick={skipToMain}
        className="sr-only z-50 rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to main content
      </a>
      <AppHeader
        project={project}
        onHome={() => navigate(null)}
        onNewTask={openNewTask}
        user={user}
        onSignOut={onSignOut}
        saveStatus={saveStatus}
        isCloud={isCloud}
        settings={settings}
        onSettingsChange={onSettingsChange}
      />
      <main id="main" tabIndex={-1} className="focus:outline-none">
      {offerImport && !project && <ImportBanner count={localData.tasks.length} onImport={importLocal} onDismiss={dismissImport} />}

      {project ? (
        <>
          <AnchorBoard key={project.id} anchors={project.anchors} onSave={saveAnchor} />
          <h2 id="board" tabIndex={-1} className="sr-only">Board</h2>
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
      </main>

      <footer className="mt-10 border-t border-slate-200 pt-4 text-xs text-slate-600">
        <a href="#/accessibility" className="inline-flex min-h-[24px] items-center rounded underline underline-offset-2 hover:no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary">
          Accessibility statement
        </a>
      </footer>

      <TaskModal task={editing} isNew={isNew} onSave={saveTask} onDelete={deleteTask} onClose={closeModal} today={today} />
      <Toast toast={toast} onDone={clearToast} />
    </div>
  );
}
