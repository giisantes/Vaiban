import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CONTEXT_TEMPLATE, STAGES, TEAM } from '../constants.js';
import { useCloudBoards } from '../hooks/useCloudBoards.js';
import { useHash } from '../hooks/useHash.js';
import { useHashRoute } from '../hooks/useHashRoute.js';
import { useGuestSync } from '../hooks/useGuestSync.js';
import { useProfiles } from '../hooks/useProfiles.js';
import { useCloudLibrary, useLocalLibrary } from '../hooks/useLibrary.js';
import { useStoredState } from '../hooks/useStoredState.js';
import { useToday } from '../hooks/useToday.js';
import { useUndo } from '../hooks/useUndo.js';
import { createTask, withTaskDefaults } from '../lib/createTask.js';
import { displayName } from '../lib/auth.js';
import { joinTokenFromHash, takeJoinToken } from '../lib/joinToken.js';
import { LibraryContext, libraryHash, parseLibraryRoute } from '../lib/libraryRoute.js';
import { PeopleContext } from '../lib/people.js';
import { AvatarContext } from '../lib/profiles.js';
import { createProject, seedProjects } from '../lib/projects.js';
import { markGuestChanged } from '../lib/guest.js';
import { seedTasks } from '../data/seedTasks.js';
import AnchorBoard from './AnchorBoard.jsx';
import AppHeader from './AppHeader.jsx';
import FullPageMessage from './FullPageMessage.jsx';
import Board from './Board.jsx';
import ProjectsHome from './ProjectsHome.jsx';
import TaskModal from './TaskModal.jsx';
import Toast from './Toast.jsx';
import InvitationsPanel from './InvitationsPanel.jsx';
import JoinBoard from './JoinBoard.jsx';
import LibraryPage from './LibraryPage.jsx';
import AccountSettingsPage from './AccountSettingsPage.jsx';
import BoardSettingsPage from './BoardSettingsPage.jsx';
import ShareDialog from './ShareDialog.jsx';

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
 *   hooks/useCloudBoards.js   shared boards: row-by-row saving + live updates (D62–D63)
 *   lib/boardsApi.js          every database call for boards and sharing (Facade)
 *   lib/diff.js               what changed between two lists (saving, undo)
 *   lib/people.js             PeopleContext: who tasks can be assigned to (D64)
 *   components/ShareDialog, JoinBoard, InvitationsPanel   sharing screens (D62)
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
 *   onSignIn?: (mode: 'signin' | 'signup') => void,  // signed out, with accounts available (D74)
 *   settings: { textSize: string, theme: string },   // display settings (D60)
 *   onSettingsChange: (changes: object) => void,
 * }} props
 *
 * Where the boards come from depends on the mode (D62): browser-only mode
 * keeps the original two lists in localStorage; with an account they are the
 * shared boards in the database (hooks/useCloudBoards.js). Both hand the view
 * the same shape of data, so the board components don't know the difference.
 */
export default function Workspace(props) {
  return props.store.kind === 'cloud' ? <CloudWorkspace {...props} /> : <LocalWorkspace {...props} />;
}

function LocalWorkspace(props) {
  const { store } = props;
  // M4 data-model: the demo data is only used when nothing is saved yet.
  const [projects, setProjects, projectsStatus, retryProjects] = useStoredState(store, 'projects', seedProjects);
  const [tasks, setTasks, tasksStatus, retryTasks] = useStoredState(store, 'tasks', seedTasks);
  const statuses = [projectsStatus, tasksStatus];
  // D74: remember that this visitor made real changes, so they move into an account on sign-in.
  const changed = (setter) => (update) => { markGuestChanged(); setter(update); };
  const data = {
    loaded: projects !== undefined && tasks !== undefined,
    loadError: statuses.includes('load-error'),
    retry: () => { retryProjects(); retryTasks(); },
    projects: projects ?? [],
    tasks: tasks ?? [],
    setProjects: useMemo(() => changed(setProjects), [setProjects]), // eslint-disable-line react-hooks/exhaustive-deps
    setTasks: useMemo(() => changed(setTasks), [setTasks]), // eslint-disable-line react-hooks/exhaustive-deps
    saveStatus: statuses.includes('error') ? 'error' : statuses.includes('saving') ? 'saving' : 'saved',
    members: [],
    invitations: [],
    requests: [],
    sharing: null,
  };
  const local = useLocalLibrary(store);
  const library = {
    ...local,
    save: (item) => { markGuestChanged(); return local.save(item); },
    remove: (item) => { markGuestChanged(); return local.remove(item); },
  };
  return <WorkspaceView {...props} data={data} library={library} />;
}

function CloudWorkspace(props) {
  // Messages about things other people did (someone asked to join, you were
  // let in…) go to the view's toast once it has registered itself here.
  const notify = useRef(() => {});
  const data = useCloudBoards(props.user, (message) => notify.current(message));
  const library = useCloudLibrary(props.user, displayName(props.user));
  return <WorkspaceView {...props} data={data} notify={notify} library={library} />;
}

function WorkspaceView({ store, user, onSignOut, onSignIn, settings, onSettingsChange, data, notify, library }) {
  const isCloud = store.kind === 'cloud';
  const { loaded, projects, setProjects, setTasks, sharing } = data;

  // Home page: which project is open (null = the projects list), kept in the URL hash.
  const [projectId, navigate] = useHashRoute();
  const project = projects.find((p) => p.id === projectId) ?? null;
  const hash = useHash();
  const joinToken = isCloud ? joinTokenFromHash(hash) : null;
  // D69: the prompt and AI skills libraries live at #/library/…
  const libraryRoute = joinToken ? null : parseLibraryRoute(hash);
  // D77: account settings at #/settings/<section>; D76: a board's Settings tab.
  const settingsMatch = joinToken ? null : hash.match(/^#\/settings(?:\/([a-z]+))?$/);
  const settingsSection = settingsMatch ? settingsMatch[1] || (user ? 'profile' : 'appearance') : null;
  const boardTab = /^#\/project\/[^/]+\/settings$/.test(hash) ? 'settings' : 'board';

  // M9: tasks saved before the context fields existed get their defaults.
  const tasks = useMemo(() => data.tasks.map(withTaskDefaults), [data.tasks]);
  // The latest list, for changes made in quick succession before a re-render.
  const tasksRef = useRef(data.tasks);
  tasksRef.current = data.tasks;

  // D64: who tasks can be assigned to – this board's members, or the placeholder team.
  const boardMembers = useMemo(() => data.members.filter((m) => m.board_id === projectId), [data.members, projectId]);
  const people = useMemo(
    () => (isCloud ? boardMembers.filter((m) => m.status === 'active').map((m) => m.display_name).filter(Boolean) : TEAM),
    [isCloud, boardMembers]
  );

  // D77: profiles (pictures, bios, links) of you and your teammates.
  const memberKey = useMemo(() => data.members.filter((m) => m.status === 'active').map((m) => m.user_id).sort().join(), [data.members]);
  const profile = useProfiles(isCloud ? user : null, memberKey);
  const myName = user ? displayName(user) : '';
  const avatars = useMemo(() => {
    const map = new Map();
    for (const m of data.members) {
      const pic = profile.byId.get(m.user_id)?.avatar;
      if (pic && m.display_name && !map.has(m.display_name)) map.set(m.display_name, pic);
    }
    if (myName && profile.mine.avatar) map.set(myName, profile.mine.avatar);
    return map;
  }, [data.members, profile.byId, profile.mine.avatar, myName]);
  const goSettings = useCallback((section) => {
    setEditing(null);
    window.location.hash = `/settings/${section || (user ? 'profile' : 'appearance')}`;
  }, [user]);
  const waitingCount = project?.isOwner ? boardMembers.filter((m) => m.status === 'pending').length : 0;
  const [shareOpen, setShareOpen] = useState(false);

  // M5 crud-modal: the task open in the modal (null = closed). Clicking a
  // card opens it read-only; the modal's "Edit task" button switches to the form.
  const [editing, setEditing] = useState(null);
  const isNew = editing ? !tasks.some((t) => t.id === editing.id) : false;

  // M12: undo history for the task list (Memento – see hooks/useUndo.js).
  const history = useUndo(setTasks);

  // M7 task-owner: confirmation message + which card to highlight briefly.
  // A toast is { message, action? } – M12 adds the Undo action.
  const [toast, setToast] = useState(null);
  const [highlightId, setHighlightId] = useState(null);
  const clearToast = useCallback(() => setToast(null), []);
  // A message left by the previous screen (e.g. "Your account has been deleted." – D77).
  useEffect(() => {
    try {
      const notice = window.sessionStorage.getItem('vaiban.notice');
      if (notice) { window.sessionStorage.removeItem('vaiban.notice'); setToast({ message: notice }); }
    } catch { /* ignore */ }
  }, []);
  if (notify) notify.current = (message) => setToast({ message });

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
    const prev = tasksRef.current;
    const next = updater(prev);
    history.record(label, prev, next);
    tasksRef.current = next;
    setTasks(next);
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
      { ...prev.find((t) => t.id === id), status, order: Date.now() }, // D63: bottom of the new column, for everyone
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
  }, [focusTaskId, data.tasks]);

  // Each screen has its own page title, so screen-reader users and browser
  // tabs say where you are (WCAG 2.2 SC 2.4.2 Page Titled).
  useEffect(() => {
    if (joinToken || libraryRoute || settingsSection) return; // these screens set their own
    if (project && boardTab === 'settings') { document.title = `Settings – ${project.name} – Vaiban`; return; }
    document.title = project ? `${project.name} – Vaiban` : 'Your projects – Vaiban';
  }, [project, joinToken, libraryRoute, settingsSection, boardTab]);

  // ── D69–D71: prompt library and AI skills library ──
  // Only items in your private library or on a board you're still on (the
  // database enforces this too; this just hides them at once when you leave).
  const boardIds = useMemo(() => new Set(projects.map((p) => p.id)), [projects]);
  const visible = (items) => items.filter((x) => x.boardId === null || boardIds.has(x.boardId));
  const prompts = useMemo(() => visible(library.prompts), [library.prompts, boardIds]); // eslint-disable-line react-hooks/exhaustive-deps
  const skills = useMemo(() => visible(library.skills), [library.skills, boardIds]); // eslint-disable-line react-hooks/exhaustive-deps
  /** Go to a library view. `replace` changes the address without adding a Back step. */
  const goLibrary = useCallback((route, replace = false) => {
    setEditing(null);
    const target = `#${libraryHash(route)}`;
    if (replace) window.location.replace(target);
    else window.location.hash = target;
  }, []);
  /** From a prompt to the task it was used for: open the board, then the task. */
  const openTaskFromLibrary = (boardId, taskId) => {
    const task = tasks.find((t) => t.id === taskId);
    navigate(boardId);
    if (task) setEditing(task);
  };
  const libraryValue = useMemo(() => ({ prompts, skills, openLibrary: goLibrary }), [prompts, skills, goLibrary]);
  const boardPromptCount = project ? prompts.filter((p) => p.boardId === project.id).length : 0;

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

  // D76: board details on the board's Settings tab – D62: membership (Share window).
  const canEditBoard = Boolean(project) && (!isCloud || project.isOwner);
  const renameBoard = (fields) => setProjects((prev) => prev.map((p) => (p.id === project.id ? { ...p, ...fields } : p)));
  const deleteBoard = () => {
    const name = project.name;
    setShareOpen(false);
    setProjects((prev) => prev.filter((p) => p.id !== project.id));
    setTasks((prev) => prev.filter((t) => t.projectId !== project.id));
    navigate(null);
    setToast({ message: `Deleted "${name}".` });
  };
  const leaveBoard = async () => {
    const name = project.name;
    try {
      await sharing.leave(project.id);
      setShareOpen(false);
      navigate(null);
      setToast({ message: `You left "${name}".` });
    } catch {
      setToast({ message: `Couldn't leave "${name}". Check your internet connection and try again.` });
    }
  };

  // D62: an invite link opened before signing in – carry on where they left off.
  useEffect(() => {
    if (!isCloud) return;
    const remembered = takeJoinToken(); // read once, then forgotten
    if (remembered && !joinToken) window.location.hash = `/join/${remembered}`;
  }, [isCloud]); // eslint-disable-line react-hooks/exhaustive-deps

  // A link to a project that no longer exists falls back to the home page.
  useEffect(() => {
    if (loaded && projectId && !project) navigate(null);
  }, [loaded, projectId, project, navigate]);
  useEffect(() => { if (!project) setShareOpen(false); }, [project]);

  // Overall save status for the header, and a warning before leaving with unsaved changes.
  const saveStatus = data.saveStatus;
  useEffect(() => {
    if (saveStatus === 'saved') return;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [saveStatus]);

  // D74: boards, tasks, prompts and skills made before signing in move into the account.
  useGuestSync({ enabled: isCloud, data, library, onDone: (message) => setToast({ message }) });

  if (data.loadError) {
    return (
      <FullPageMessage>
        <p>Couldn't load your projects. Check your internet connection.</p>
        <button type="button" onClick={data.retry} className="mt-3 rounded-md bg-brand-primary px-4 py-1.5 text-sm font-medium text-white">
          Try again
        </button>
      </FullPageMessage>
    );
  }
  if (!loaded) return <FullPageMessage>Loading your projects…</FullPageMessage>;

  return (
    <LibraryContext.Provider value={libraryValue}>
    <PeopleContext.Provider value={people}>
    <AvatarContext.Provider value={avatars}>
    <div className="flex min-h-screen flex-col p-4 sm:p-6">
      {/* flex column + flex-1 on <main>: on short pages the footer sits at the
          bottom of the window instead of straight under the board. */}
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
        onSignIn={onSignIn}
        saveStatus={saveStatus}
        isCloud={isCloud}
        onSettings={() => goSettings()}
        avatar={profile.mine.avatar}
        onShare={isCloud && project ? () => setShareOpen(true) : undefined}
        waitingCount={waitingCount}
        onLibrary={() => goLibrary({ kind: 'prompt' })}
        libraryActive={Boolean(libraryRoute)}
        onBoardPrompts={project ? () => goLibrary({ kind: 'prompt', board: project.id }) : undefined}
        boardPromptCount={boardPromptCount}
      />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">

      {joinToken ? (
        <JoinBoard
          key={joinToken}
          token={joinToken}
          sharing={sharing}
          onOpenBoard={(id) => navigate(id)}
          onHome={() => navigate(null)}
          onJoined={(message) => setToast({ message })}
          onSignOut={onSignOut}
        />
      ) : settingsSection ? (
        <AccountSettingsPage
          user={isCloud ? user : null}
          section={settingsSection}
          go={(section) => window.location.replace(`#/settings/${section}`)}
          settings={settings}
          onSettingsChange={onSettingsChange}
          profile={profile}
          ownedBoards={isCloud ? projects.filter((p) => p.isOwner) : []}
          onSignIn={onSignIn}
          onBack={() => navigate(null)}
        />
      ) : libraryRoute ? (
        <LibraryPage
          route={libraryRoute}
          prompts={prompts}
          skills={skills}
          projects={projects}
          tasks={tasks}
          save={library.save}
          remove={library.remove}
          go={goLibrary}
          onOpenTask={openTaskFromLibrary}
          isCloud={isCloud}
          loaded={library.loaded}
          failed={library.failed}
        />
      ) : project ? (
        <>
          {/* D76: Board and Settings tabs, like a GitHub repository's */}
          <nav aria-label="Board pages" className="-mt-1 mb-4 border-b border-slate-200">
            <ul className="flex gap-1">
              {[
                { tab: 'board', label: 'Board', icon: <><rect x="3" y="4" width="5" height="16" rx="1" /><rect x="10" y="4" width="5" height="11" rx="1" /><rect x="17" y="4" width="4" height="7" rx="1" /></> },
                { tab: 'settings', label: 'Settings', icon: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" /></> },
              ].map(({ tab, label, icon }) => (
                <li key={tab}>
                  <a
                    href={`#/project/${encodeURIComponent(project.id)}${tab === 'settings' ? '/settings' : ''}`}
                    onClick={(e) => { e.preventDefault(); navigate(project.id, tab); }}
                    aria-current={boardTab === tab ? 'page' : undefined}
                    className={`-mb-px inline-flex min-h-[36px] items-center gap-1.5 border-b-2 px-3 py-1.5 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${
                      boardTab === tab ? 'border-brand-primary text-slate-900' : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900'
                    }`}
                  >
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          {boardTab === 'settings' ? (
            <BoardSettingsPage
              key={project.id}
              project={project}
              canEdit={canEditBoard}
              isCloud={isCloud}
              taskCount={tasks.filter((t) => t.projectId === project.id).length}
              memberCount={isCloud ? boardMembers.filter((m) => m.status === 'active').length : 1}
              onSave={renameBoard}
              onDelete={deleteBoard}
              onLeave={leaveBoard}
              onShare={() => setShareOpen(true)}
            />
          ) : (
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
          )}
        </>
      ) : (
        <ProjectsHome projects={projects} tasks={tasks} members={data.members} today={today} onOpen={navigate} onCreate={addProject}>
          {onSignIn && (
            <section aria-labelledby="guest-title" className="grid gap-2 rounded-lg border border-brand-primary/30 bg-highlight p-4 sm:flex sm:items-center sm:justify-between">
              <div className="grid gap-0.5">
                <h2 id="guest-title" className="text-sm font-semibold text-slate-900">You're using Vaiban without an account</h2>
                <p className="text-sm text-slate-800">Everything is saved in this browser only. Create an account to use it on other devices and share boards – what you've made here moves into it.</p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <button type="button" onClick={() => onSignIn('signin')} className="rounded-md border border-slate-300 bg-surface px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary">Sign in</button>
                <button type="button" onClick={() => onSignIn('signup')} className="rounded-md bg-brand-primary px-3 py-1.5 text-sm font-medium text-white hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2">Create account</button>
              </div>
            </section>
          )}
          <nav aria-label="Your libraries" className="grid gap-3 sm:grid-cols-2">
            {[
              { kind: 'prompt', title: 'Prompt library', count: prompts.length, text: 'Prompts that worked, and what they produced' },
              { kind: 'skill', title: 'AI skills', count: skills.length, text: 'Reusable ways of working with AI tools' },
            ].map((lib) => (
              <a
                key={lib.kind}
                href={`#${libraryHash({ kind: lib.kind })}`}
                onClick={(e) => { e.preventDefault(); goLibrary({ kind: lib.kind }); }}
                className="grid gap-0.5 rounded-lg border border-slate-200 bg-surface p-3 hover:border-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
              >
                <span className="text-sm font-semibold text-slate-900">{lib.title} ({lib.count}) <span aria-hidden="true">→</span></span>
                <span className="text-xs text-slate-600">{lib.text} – yours and your boards'</span>
              </a>
            ))}
          </nav>
          {isCloud && (
            <InvitationsPanel
              invitations={data.invitations}
              requests={data.requests}
              sharing={sharing}
              onOpenBoard={(id) => navigate(id)}
              onMessage={(message) => setToast({ message })}
            />
          )}
        </ProjectsHome>
      )}
      </main>

      <footer className="mt-10 border-t border-slate-200 pt-4 text-xs text-slate-600">
        <a href="#/accessibility" className="inline-flex min-h-[24px] items-center rounded underline underline-offset-2 hover:no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary">
          Accessibility statement
        </a>
      </footer>

      <TaskModal task={editing} isNew={isNew} onSave={saveTask} onDelete={deleteTask} onClose={closeModal} today={today} />
      {isCloud && project && (
        <ShareDialog
          key={project.id}
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          project={project}
          members={boardMembers}
          sharing={sharing}
          onLeave={leaveBoard}
          profiles={profile.byId}
        />
      )}
      <Toast toast={toast} onDone={clearToast} />
    </div>
    </AvatarContext.Provider>
    </PeopleContext.Provider>
    </LibraryContext.Provider>
  );
}
