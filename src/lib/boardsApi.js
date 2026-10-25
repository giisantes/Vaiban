import { defaultAnchors } from './anchors.js';
import { withTaskDefaults } from './createTask.js';
import { supabase } from './supabase.js';

/**
 * Every call the app makes to the shared-boards tables (supabase/migrations/
 * 003_shared_boards.sql), in one place – a Facade over Supabase, so
 * components never build database queries themselves.
 *
 * Security doesn't depend on this file: the database's row-level security
 * decides what each person can see or change. This only asks.
 */

/** Throws the Supabase error, if there was one, and returns the data. */
async function run(request) {
  const { data, error } = await request;
  if (error) throw error;
  return data;
}

// ── Converting between database rows and the app's objects ──

/** boards row → the app's Project (+ who owns it). */
export function boardToProject(row, myId) {
  const saved = Array.isArray(row.anchors) ? row.anchors : [];
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    createdDate: (row.created_at ?? '').slice(0, 10),
    // always the four slots, filled in from whatever was saved
    anchors: defaultAnchors().map((a) => ({ ...a, url: saved.find((s) => s.id === a.id)?.url ?? null })),
    milestones: Array.isArray(row.milestones) ? row.milestones : [], // D79
    ownerId: row.owner_id,
    ownerName: row.owner_name ?? '',
    isOwner: row.owner_id === myId,
  };
}

/** tasks row → the app's Task. The row's board is the source of truth for projectId. */
export function rowToTask(row) {
  return withTaskDefaults({ ...row.data, id: row.id, projectId: row.board_id });
}

/** The app's Task → tasks row. */
export function taskToRow(task) {
  return { board_id: task.projectId, id: task.id, data: task };
}

// ── Library items (prompts, AI skills) ──

const LIBRARY_TABLE = { prompt: 'prompts', skill: 'ai_skills' };

const list = (value) => (Array.isArray(value) ? value.map(String) : []);

/** prompts / ai_skills row → the app's LibraryItem (lib/library.js). */
export function rowToLibraryItem(kind, row) {
  const item = {
    id: row.id,
    kind,
    boardId: row.board_id ?? null,
    name: row.name,
    tags: list(row.tags),
    aiTool: row.ai_tool ?? null,
    ownerId: row.owner_id,
    authorName: row.author_name ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  return kind === 'prompt'
    ? { ...item, body: row.body ?? '', result: row.result ?? '', taskIds: list(row.task_ids) }
    : { ...item, overview: row.overview ?? '', instructions: row.instructions ?? '' };
}

/** The app's LibraryItem → the columns a user may write (the database fills in author and dates). */
export function libraryItemToRow(item) {
  const row = { id: item.id, board_id: item.boardId, name: item.name, tags: item.tags, ai_tool: item.aiTool };
  return item.kind === 'prompt'
    ? { ...row, body: item.body, result: item.result, task_ids: item.taskIds }
    : { ...row, overview: item.overview, instructions: item.instructions };
}

// ── Reading ──

export const api = {
  loadBoards: () => run(supabase.from('boards').select('*').order('created_at')),
  loadTasks: () => run(supabase.from('tasks').select('board_id,id,data')),
  /** Visible member rows for all my boards (the database filters them). */
  loadMembers: () => run(supabase.from('board_members').select('board_id,user_id,role,status,display_name,requested_at,joined_at')),
  myInvitations: () => run(supabase.rpc('my_invitations')),
  myJoinRequests: () => run(supabase.rpc('my_join_requests')),
  inviteInfo: async (token) => (await run(supabase.rpc('invite_info', { p_token: token })))?.[0] ?? null,
  /** Owner only: open invitations for a board. */
  listInvites: (boardId) =>
    run(
      supabase
        .from('board_invites')
        .select('id,token,email,expires_at')
        .eq('board_id', boardId)
        .is('revoked_at', null)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at')
    ),
  /** Owner only: { user_id → email }. */
  memberEmails: async (boardId) =>
    Object.fromEntries((await run(supabase.rpc('board_member_emails', { p_board: boardId }))).map((r) => [r.user_id, r.email])),

  // ── Changing boards and tasks ──

  createBoard: async (project) => {
    const row = await run(supabase.rpc('create_board', { p_id: project.id, p_name: project.name, p_description: project.description ?? '', p_anchors: project.anchors ?? [] }));
    // D79: a board brought in from the browser (D74) may already have milestones
    if (project.milestones?.length) await run(supabase.from('boards').update({ milestones: project.milestones }).eq('id', project.id));
    return row;
  },
  updateBoard: (id, changes) => run(supabase.from('boards').update(changes).eq('id', id)),
  deleteBoard: (id) => run(supabase.from('boards').delete().eq('id', id)),
  saveTasks: (tasks) => run(supabase.from('tasks').upsert(tasks.map(taskToRow), { onConflict: 'board_id,id' })),
  deleteTask: (task) => run(supabase.from('tasks').delete().eq('board_id', task.projectId).eq('id', task.id)),

  // ── Sharing ──

  /**
   * Email someone a personal, one-time invitation (D67). Done by the send-invite
   * Edge Function, which holds the email key. Errors carry `.invite` when the
   * invitation was saved but the email failed, and `.notSetUp` when the
   * function isn't deployed – the Share window then offers the link instead.
   */
  sendInvite: async (boardId, email) => {
    const { data, error } = await supabase.functions.invoke('send-invite', { body: { boardId, email } });
    if (!error) return data;
    let body = null;
    try { body = await error.context?.json(); } catch { /* no JSON body */ }
    const status = error.context?.status;
    const err = new Error(body?.error || "Couldn't send the invitation.");
    err.code = body?.code || 'EMAIL';
    err.invite = body?.invite ?? null;
    err.notSetUp = error.name === 'FunctionsFetchError' || error.name === 'FunctionsRelayError' || status === 404 || (status === 500 && /isn.t set up/.test(body?.error ?? ''));
    throw err;
  },
  createInvite: async (boardId, email = null) => (await run(supabase.rpc('create_invite', { p_board: boardId, p_email: email })))?.[0],
  revokeInvite: (inviteId) => run(supabase.rpc('revoke_invite', { p_invite: inviteId })),
  requestToJoin: (token) => run(supabase.rpc('request_to_join', { p_token: token })),
  declineInvitation: (inviteId) => run(supabase.rpc('decline_invitation', { p_invite: inviteId })),
  approveMember: (boardId, userId) => run(supabase.rpc('approve_member', { p_board: boardId, p_user: userId })),
  /** Remove someone, decline a request, leave a board, or cancel your own request. */
  removeMember: (boardId, userId) => run(supabase.rpc('remove_member', { p_board: boardId, p_user: userId })),
  refreshMyName: () => run(supabase.rpc('refresh_my_name')),

  // ── Profiles and account (D77) ──

  /** Profiles this user may see (their own + teammates on active boards). */
  loadProfiles: async () => run(supabase.from('profiles').select('id, bio, link, avatar, updated_at')),
  saveProfile: (userId, { bio, link, avatar }) => run(supabase.from('profiles').upsert({ id: userId, bio, link, avatar }, { onConflict: 'id' })),
  renameMyTasks: (oldName) => run(supabase.rpc('rename_my_tasks', { p_old: oldName })),
  deleteMyAccount: () => run(supabase.rpc('delete_my_account')),
  subscribeProfiles(userId, onChange) {
    const channel = supabase.channel(`vaiban-profiles-${userId}`);
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => onChange());
    channel.subscribe();
    return () => supabase.removeChannel(channel);
  },

  // ── Prompt library and AI skills library (D69–D71) ──

  /** Every prompt or skill this user may see: their private ones + their boards' ones. */
  loadLibrary: async (kind) => (await run(supabase.from(LIBRARY_TABLE[kind]).select('*'))).map((row) => rowToLibraryItem(kind, row)),
  createLibraryItem: (item) => run(supabase.from(LIBRARY_TABLE[item.kind]).insert(libraryItemToRow(item))),
  updateLibraryItem: (item) => {
    const { id, ...changes } = libraryItemToRow(item);
    return run(supabase.from(LIBRARY_TABLE[item.kind]).update(changes).eq('id', id));
  },
  deleteLibraryItem: (item) => run(supabase.from(LIBRARY_TABLE[item.kind]).delete().eq('id', item.id)),
  /** Live updates for the two library tables. @returns {() => void} unsubscribe */
  subscribeLibrary(userId, onChange) {
    const channel = supabase.channel(`vaiban-library-${userId}`);
    for (const table of Object.values(LIBRARY_TABLE)) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => onChange());
    }
    channel.subscribe();
    return () => supabase.removeChannel(channel);
  },

  /**
   * Live updates: calls `onChange(table, payload)` whenever a board, member
   * or task the database lets this user see is added, changed or removed.
   * @returns {() => void} unsubscribe
   */
  subscribe(userId, onChange) {
    const channel = supabase.channel(`vaiban-${userId}`);
    for (const table of ['tasks', 'boards', 'board_members']) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => onChange(table, payload));
    }
    channel.subscribe();
    return () => supabase.removeChannel(channel);
  },
};

/** The link someone opens to ask to join. */
export const joinLink = (token) => `${window.location.origin}/#/join/${token}`;

/**
 * True when a failed request is worth trying again (offline, server busy),
 * rather than refused by the database (no permission, bad data).
 */
export function isTemporary(error) {
  const msg = String(error?.message ?? error ?? '').toLowerCase();
  return !error?.code || /fetch|network|timeout|503|502|504/.test(msg) || /^(08|53|57)/.test(error.code);
}

/** A database refusal in plain English (the functions in 003 already word their own). */
export function sharingError(error) {
  if (typeof console !== 'undefined') console.error('[boards]', error);
  if (isTemporary(error)) return "Can't reach the server. Check your internet connection.";
  if (error?.code === '42501' && !/[a-z]\.$/i.test(error.message ?? '')) return "You don't have permission to do that on this board.";
  return error?.message || 'Something went wrong.';
}
