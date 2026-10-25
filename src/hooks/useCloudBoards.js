import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, boardToProject, isTemporary, rowToTask, sharingError } from '../lib/boardsApi.js';
import { diffById, same } from '../lib/diff.js';

/**
 * The signed-in user's boards, kept in step with the database and with
 * everyone else on those boards (D62–D64).
 *
 * It looks the same to the board as the browser-only version – a projects
 * list and a tasks list, each with a setter – so the board components didn't
 * have to change. Behind the setters:
 *
 *   1. The screen updates straight away (no waiting for the server).
 *   2. The new list is compared with the old one (lib/diff.js), and only the
 *      rows that changed are queued for saving – one row per task, so two
 *      people editing different cards never overwrite each other.
 *   3. The queue is sent in order. If the connection drops, it tries again
 *      every 5 seconds; if the database refuses (e.g. you were just removed
 *      from the board), it says so and reloads.
 *   4. Changes other people make arrive live (Supabase Realtime) and are
 *      merged in. Everything is also re-checked when you come back to the tab.
 *
 * @param {{ id: string }} user
 * @param {(message: string) => void} onNotice  shows a message (toast)
 */
export function useCloudBoards(user, onNotice) {
  const myId = user.id;
  const [data, setData] = useState(null); // null until the first load
  const [loadError, setLoadError] = useState(null);
  const [status, setStatus] = useState('saved');
  const current = useRef({ projects: [], tasks: [], members: [], invitations: [], requests: [] });
  const queue = useRef([]);
  const running = useRef(false);
  const retryTimer = useRef(null);
  const leaving = useRef(new Set()); // boards I'm leaving or deleting myself (no "you lost access" message)
  const notice = useRef(onNotice);
  notice.current = onNotice;

  const commit = useCallback((patch) => {
    current.current = { ...current.current, ...patch };
    setData(current.current);
  }, []);

  // ── Loading ──

  /** Changes still waiting to be saved, laid over freshly loaded data so they don't flicker away. */
  const withUnsaved = (projects, tasks) => {
    for (const op of queue.current) {
      if (op.type === 'tasks') {
        const gone = new Set(op.remove.map((t) => t.id));
        const saved = new Map(op.save.map((t) => [t.id, t]));
        tasks = [...tasks.filter((t) => !gone.has(t.id) && !saved.has(t.id)), ...saved.values()];
      } else if (op.type === 'createBoard' && !projects.some((p) => p.id === op.project.id)) {
        projects = [...projects, op.project];
      } else if (op.type === 'updateBoard') {
        projects = projects.map((p) => (p.id === op.id ? { ...p, ...op.local } : p));
      } else if (op.type === 'deleteBoard') {
        projects = projects.filter((p) => p.id !== op.id);
      }
    }
    return [projects, tasks];
  };

  const reload = useCallback(async ({ quiet = false } = {}) => {
    try {
      const [boards, rows, members, invitations, requests] = await Promise.all([
        api.loadBoards(), api.loadTasks(), api.loadMembers(), api.myInvitations(), api.myJoinRequests(),
      ]);
      const [projects, tasks] = withUnsaved(boards.map((b) => boardToProject(b, myId)), rows.map(rowToTask));
      const before = current.current;

      if (quiet) {
        // Tell people about things that happened elsewhere.
        const boardName = (id) => (projects.find((p) => p.id === id) ?? before.projects.find((p) => p.id === id))?.name ?? 'a board';
        for (const m of members) {
          const wasThere = before.members.some((o) => o.board_id === m.board_id && o.user_id === m.user_id && o.status === m.status);
          if (wasThere) continue;
          const mine = projects.find((p) => p.id === m.board_id)?.isOwner;
          if (mine && m.status === 'pending') notice.current(`${m.display_name || 'Someone'} asked to join "${boardName(m.board_id)}". Open Share to let them in.`);
          if (m.user_id === myId && m.status === 'active' && m.role !== 'owner' && before.requests.some((r) => r.board_id === m.board_id)) {
            notice.current(`You've been let into "${boardName(m.board_id)}".`);
          }
        }
        for (const p of before.projects) {
          if (!projects.some((q) => q.id === p.id) && !leaving.current.has(p.id)) notice.current(`You no longer have access to "${p.name}".`);
        }
      }

      commit({ projects, tasks, members, invitations, requests });
      setLoadError(null);
    } catch (error) {
      if (!quiet) setLoadError(error);
    }
  }, [commit, myId]);

  // Several live events often arrive together; reload once for all of them.
  const reloadSoon = useMemo(() => {
    let timer;
    return () => { clearTimeout(timer); timer = setTimeout(() => reload({ quiet: true }), 300); };
  }, [reload]);

  // ── Saving ──

  const perform = async (op) => {
    if (op.type === 'tasks') {
      if (op.save.length) await api.saveTasks(op.save);
      for (const task of op.remove) await api.deleteTask(task);
    } else if (op.type === 'createBoard') await api.createBoard(op.project);
    else if (op.type === 'updateBoard') await api.updateBoard(op.id, op.changes);
    else if (op.type === 'deleteBoard') await api.deleteBoard(op.id);
  };

  const pump = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    clearTimeout(retryTimer.current);
    setStatus('saving');
    while (queue.current.length) {
      const op = queue.current[0];
      try {
        await perform(op);
        queue.current.shift();
      } catch (error) {
        if (isTemporary(error)) {
          setStatus('error');
          running.current = false;
          retryTimer.current = setTimeout(pump, 5000);
          return;
        }
        // Refused by the database: drop that change and show what's really saved.
        queue.current.shift();
        notice.current(`That change wasn't saved: ${sharingError(error)}`);
        reload({ quiet: true });
      }
    }
    running.current = false;
    setStatus('saved');
  }, [reload]); // eslint-disable-line react-hooks/exhaustive-deps

  const enqueue = useCallback((op) => {
    queue.current.push(op);
    pump();
  }, [pump]);

  /** Same as React's setState, for the task list. */
  const setTasks = useCallback((update) => {
    const prev = current.current.tasks;
    const next = typeof update === 'function' ? update(prev) : update;
    const { added, changed, removed } = diffById(prev, next);
    commit({ tasks: next });
    if (added.length || changed.length || removed.length) enqueue({ type: 'tasks', save: [...added, ...changed], remove: removed });
  }, [commit, enqueue]);

  /** Same as React's setState, for the projects (boards) list. */
  const setProjects = useCallback((update) => {
    const prev = current.current.projects;
    const next = typeof update === 'function' ? update(prev) : update;
    const { added, removed } = diffById(prev, next);
    const old = new Map(prev.map((p) => [p.id, p]));
    const created = added.map((p) => ({ ...p, ownerId: myId, ownerName: p.ownerName ?? '', isOwner: true }));
    const nextList = next.map((p) => created.find((c) => c.id === p.id) ?? p);
    commit({ projects: nextList, tasks: current.current.tasks.filter((t) => !removed.some((p) => p.id === t.projectId)) });

    for (const project of created) enqueue({ type: 'createBoard', project });
    for (const project of nextList) {
      const was = old.get(project.id);
      if (!was || was === project) continue;
      const changes = {};
      const local = {};
      if (project.name !== was.name) { changes.name = project.name; local.name = project.name; }
      if (project.description !== was.description) { changes.description = project.description; local.description = project.description; }
      if (!same(project.anchors, was.anchors)) { changes.anchors = project.anchors; local.anchors = project.anchors; }
      if (!same(project.milestones ?? [], was.milestones ?? [])) { changes.milestones = project.milestones; local.milestones = project.milestones; } // D79
      if (Object.keys(changes).length) enqueue({ type: 'updateBoard', id: project.id, changes, local });
    }
    for (const project of removed) {
      leaving.current.add(project.id);
      enqueue({ type: 'deleteBoard', id: project.id });
    }
  }, [commit, enqueue, myId]);

  // ── First load, live updates, and re-checking when you come back ──

  useEffect(() => {
    reload();
    api.refreshMyName().catch(() => {});
  }, [reload]);

  useEffect(() => {
    const unsubscribe = api.subscribe(myId, (table, payload) => {
      const { projects, tasks } = current.current;
      if (table === 'tasks') {
        if (payload.eventType === 'DELETE') {
          const { board_id: boardId, id } = payload.old ?? {};
          if (tasks.some((t) => t.id === id && t.projectId === boardId)) commit({ tasks: tasks.filter((t) => !(t.id === id && t.projectId === boardId)) });
          return;
        }
        const row = payload.new;
        if (!row || row.updated_by === myId) return; // my own change, already on screen
        if (!projects.some((p) => p.id === row.board_id)) return reloadSoon();
        const task = rowToTask(row);
        const exists = tasks.some((t) => t.id === task.id);
        commit({ tasks: exists ? tasks.map((t) => (t.id === task.id ? task : t)) : [...tasks, task] });
        return;
      }
      if (table === 'boards' && payload.eventType === 'UPDATE' && payload.new) {
        const updated = boardToProject(payload.new, myId);
        if (projects.some((p) => p.id === updated.id)) {
          commit({ projects: projects.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)) });
          return;
        }
      }
      reloadSoon(); // someone joined, left, was approved, or a board was added/removed
    });
    return unsubscribe;
  }, [myId, commit, reloadSoon]);

  useEffect(() => {
    let last = Date.now();
    const recheck = () => {
      if (document.visibilityState !== 'visible' || queue.current.length || Date.now() - last < 10000) return;
      last = Date.now();
      reload({ quiet: true });
    };
    document.addEventListener('visibilitychange', recheck);
    window.addEventListener('focus', recheck);
    return () => {
      document.removeEventListener('visibilitychange', recheck);
      window.removeEventListener('focus', recheck);
      clearTimeout(retryTimer.current);
    };
  }, [reload]);

  // ── Sharing actions (each refreshes the lists afterwards) ──

  const sharing = useMemo(() => {
    const thenReload = (fn) => async (...args) => {
      const result = await fn(...args);
      await reload({ quiet: true });
      return result;
    };
    return {
      myId,
      createInvite: api.createInvite,
      sendInvite: api.sendInvite,
      revokeInvite: api.revokeInvite,
      listInvites: api.listInvites,
      memberEmails: api.memberEmails,
      inviteInfo: api.inviteInfo,
      approve: thenReload(api.approveMember),
      remove: thenReload(api.removeMember),
      declineInvitation: thenReload(api.declineInvitation),
      requestToJoin: thenReload(api.requestToJoin),
      cancelRequest: thenReload((boardId) => api.removeMember(boardId, myId)),
      /** Leave a board someone else owns. */
      leave: async (boardId) => {
        leaving.current.add(boardId);
        await api.removeMember(boardId, myId);
        commit({
          projects: current.current.projects.filter((p) => p.id !== boardId),
          tasks: current.current.tasks.filter((t) => t.projectId !== boardId),
        });
        reload({ quiet: true });
      },
    };
  }, [myId, reload, commit]);

  return {
    loaded: data !== null,
    loadError,
    retry: () => { setLoadError(null); reload(); },
    projects: data?.projects ?? [],
    tasks: data?.tasks ?? [],
    setProjects,
    setTasks,
    saveStatus: status,
    members: data?.members ?? [],
    invitations: data?.invitations ?? [],
    requests: data?.requests ?? [],
    sharing,
  };
}
