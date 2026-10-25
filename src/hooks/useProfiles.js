import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/boardsApi.js';

/**
 * Profiles this person may see – their own and their teammates' (D77) –
 * kept up to date live, and re-checked when membership changes.
 *
 * @param {{ id: string } | null} user  null in browser-only mode (no profiles)
 * @param {string} memberKey            changes whenever the member list does
 * @returns {{ loaded: boolean, byId: Map<string, object>, mine: object, save: (fields: object) => Promise<void>, reload: () => void }}
 */
export function useProfiles(user, memberKey) {
  const [rows, setRows] = useState(null);
  const userId = user?.id;

  const reload = useCallback(async () => {
    if (!userId) return;
    try { setRows(await api.loadProfiles()); } catch { setRows((r) => r ?? []); }
  }, [userId]);

  useEffect(() => { reload(); }, [reload, memberKey]);
  useEffect(() => (userId ? api.subscribeProfiles(userId, reload) : undefined), [userId, reload]);

  const byId = useMemo(() => new Map((rows ?? []).map((r) => [r.id, r])), [rows]);
  const mine = byId.get(userId) ?? { bio: '', link: '', avatar: '' };

  const save = useCallback(async (fields) => {
    await api.saveProfile(userId, { ...mine, ...fields });
    await reload();
  }, [userId, mine, reload]);

  return { loaded: rows !== null || !userId, byId, mine, save, reload };
}
