import { useState } from 'react';
import { sharingError } from '../lib/boardsApi.js';

const primary =
  'inline-flex min-h-[32px] items-center justify-center rounded-md bg-brand-primary px-3 py-1 text-sm font-medium text-white hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 disabled:opacity-50';
const button =
  'inline-flex min-h-[32px] items-center justify-center rounded-md border border-slate-300 bg-surface px-3 py-1 text-sm font-medium text-slate-800 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary disabled:opacity-50';

/**
 * Top of the projects page (D62): boards you've been invited to by email,
 * and boards you've asked to join that are waiting for their owner.
 * Hidden when there's nothing to show.
 *
 * @param {{ invitations: object[], requests: object[], sharing: object, onOpenBoard: (id: string) => void, onMessage: (m: string) => void }} props
 */
export default function InvitationsPanel({ invitations, requests, sharing, onOpenBoard, onMessage }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (invitations.length === 0 && requests.length === 0) return null;

  const act = async (action) => {
    setBusy(true);
    setError('');
    try { await action(); } catch (err) { setError(sharingError(err)); } finally { setBusy(false); }
  };

  return (
    <section aria-labelledby="invitations-title" className="grid gap-3 rounded-lg border-2 border-brand-accent bg-surface p-4">
      <h2 id="invitations-title" className="text-base font-semibold text-slate-900">Invitations</h2>
      {error && <p role="alert" className="text-sm font-medium text-due-overdue">{error}</p>}
      <ul className="grid gap-3">
        {invitations.map((inv) => (
          <li key={inv.invite_id} className="flex flex-wrap items-center justify-between gap-2">
            <p className="min-w-0 text-sm text-slate-800 [overflow-wrap:anywhere]">
              <strong>{inv.owner_name || 'Someone'}</strong> invited you to <strong>“{inv.board_name}”</strong>.
            </p>
            <span className="flex gap-2">
              <button type="button" disabled={busy} className={primary} aria-label={`Join ${inv.board_name}`}
                onClick={() => act(async () => {
                  const status = await sharing.requestToJoin(inv.token);
                  if (status === 'active') { onMessage(`You've joined "${inv.board_name}".`); onOpenBoard(inv.board_id); }
                  else onMessage(`Asked to join "${inv.board_name}". ${inv.owner_name || 'The owner'} needs to let you in.`);
                })}>
                Join
              </button>
              <button type="button" disabled={busy} className={button} aria-label={`Decline the invitation to ${inv.board_name}`}
                onClick={() => act(async () => { await sharing.declineInvitation(inv.invite_id); onMessage(`Declined "${inv.board_name}".`); })}>
                Decline
              </button>
            </span>
          </li>
        ))}
        {requests.map((r) => (
          <li key={r.board_id} className="flex flex-wrap items-center justify-between gap-2">
            <p className="min-w-0 text-sm text-slate-800 [overflow-wrap:anywhere]">
              Waiting for <strong>{r.owner_name || 'the owner'}</strong> to let you into <strong>“{r.board_name}”</strong>.
            </p>
            <button type="button" disabled={busy} className={button} aria-label={`Cancel your request to join ${r.board_name}`}
              onClick={() => act(async () => { await sharing.cancelRequest(r.board_id); onMessage(`Cancelled your request to join "${r.board_name}".`); })}>
              Cancel request
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
