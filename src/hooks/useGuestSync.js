import { useEffect, useRef, useState } from 'react';
import { withTaskDefaults } from '../lib/createTask.js';
import { clearGuestBoards, finishGuestSync, readGuestData, writeGuestLibrary } from '../lib/guest.js';
import { createLibraryItem } from '../lib/library.js';
import { createProject } from '../lib/projects.js';

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/**
 * D74: after signing in, move what this browser made without an account into
 * the account – boards (with their tasks and deliverable links), then prompts
 * and AI skills.
 *
 * 1. Boards and tasks: boards get new ids (the database needs UUIDs) and
 *    their tasks follow. They go through the normal save queue, so a dropped
 *    connection is retried like any other change. They are then removed from
 *    the browser.
 * 2. Prompts and skills: they can only be saved once their board exists in
 *    the database (row-level security checks membership), so this waits for
 *    the board saves to finish. Anything that fails stays in the browser with
 *    its new board id, and is tried again at the next sign-in.
 *
 * @param {{ enabled: boolean, data: object, library: object, onDone: (message: string) => void }} args
 */
export function useGuestSync({ enabled, data, library, onDone }) {
  const [pending, setPending] = useState(null); // { prompts, skills, boardIds, counts }
  const started = useRef(false);
  const sawSaving = useRef(false);
  const ready = enabled && data.loaded && library.loaded && !library.failed;

  // Step 1 – boards and tasks
  useEffect(() => {
    if (!ready || started.current) return;
    started.current = true;
    const guest = readGuestData();
    if (!guest) return;

    const ids = new Map(guest.projects.map((p) => [p.id, createProject().id]));
    const boards = guest.projects.map((p) => ({ ...p, id: ids.get(p.id) }));
    const tasks = guest.tasks
      .map(withTaskDefaults)
      .filter((t) => ids.has(t.projectId))
      .map((t) => ({ ...t, projectId: ids.get(t.projectId) }));
    // Prompts/skills point at the new board ids; a board that no longer exists → private.
    const move = (item) => ({ ...item, boardId: item.boardId && ids.has(item.boardId) ? ids.get(item.boardId) : null });
    const prompts = guest.prompts.map(move);
    const skills = guest.skills.map(move);

    if (boards.length) {
      sawSaving.current = false;
      data.setProjects((prev) => [...prev, ...boards]);
      if (tasks.length) data.setTasks((prev) => [...prev, ...tasks]);
    }
    clearGuestBoards();
    writeGuestLibrary(prompts, skills); // saved with the new board ids, in case this tab closes now
    setPending({
      prompts,
      skills,
      waitForBoards: boards.length > 0,
      counts: { boards: boards.length, tasks: tasks.length },
    });
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // Step 2 – prompts and skills, once the boards are in the database
  useEffect(() => {
    if (!pending) return;
    if (pending.waitForBoards) {
      if (data.saveStatus === 'saving' || data.saveStatus === 'error') { sawSaving.current = true; return; }
      if (!sawSaving.current) return;
    }
    const job = pending;
    setPending(null);
    (async () => {
      const left = { prompt: [], skill: [] };
      let moved = 0;
      for (const item of [...job.prompts, ...job.skills]) {
        try {
          // A new id, so the same item can never clash with one already in the database.
          const { id, ownerId, authorName, ...fields } = item; // eslint-disable-line no-unused-vars
          await library.save(createLibraryItem(item.kind, fields));
          moved += 1;
        } catch {
          left[item.kind].push(item);
        }
      }
      if (left.prompt.length || left.skill.length) writeGuestLibrary(left.prompt, left.skill);
      else finishGuestSync();

      const parts = [];
      if (job.counts.boards) parts.push(plural(job.counts.boards, 'board'));
      if (job.counts.tasks) parts.push(plural(job.counts.tasks, 'task'));
      if (moved) parts.push(`${moved} library ${moved === 1 ? 'item' : 'items'}`);
      const failed = left.prompt.length + left.skill.length;
      if (parts.length) {
        onDone(
          `Moved ${parts.join(', ').replace(/, ([^,]*)$/, ' and $1')} from this browser into your account.` +
            (failed ? ` ${plural(failed, 'library item')} couldn't be moved yet – they'll be tried again next time you sign in.` : '')
        );
      } else if (failed) {
        onDone(`Couldn't move ${plural(failed, 'library item')} into your account yet. They'll be tried again next time you sign in.`);
      }
    })();
  }, [pending, data.saveStatus]); // eslint-disable-line react-hooks/exhaustive-deps
}
