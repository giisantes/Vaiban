import { useCallback, useEffect, useRef, useState } from 'react';
import { joinLink, sharingError } from '../lib/boardsApi.js';
import { copyText } from '../lib/clipboard.js';
import { relativeTime } from '../lib/relativeTime.js';
import Avatar from './Avatar.jsx';

const button =
  'inline-flex min-h-[32px] items-center justify-center rounded-md border border-slate-300 bg-surface px-3 py-1 text-sm font-medium text-slate-800 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary disabled:opacity-50';
const primary =
  'inline-flex min-h-[32px] items-center justify-center rounded-md bg-brand-primary px-3 py-1 text-sm font-medium text-white hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 disabled:opacity-50';
const danger =
  'inline-flex min-h-[32px] items-center justify-center rounded-md bg-due-overdue px-3 py-1 text-sm font-medium text-due-overdue-on hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 disabled:opacity-50';
const input =
  'w-full min-w-0 rounded-md border border-slate-300 bg-surface px-2.5 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-primary';
const section = 'grid gap-3 border-t border-slate-200 pt-4';
const h3 = 'text-base font-semibold text-slate-900';

const dateText = (iso) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

/** "Remove" that asks once more before doing it (no browser pop-ups – D17). */
function ConfirmButton({ label, confirmLabel, question, onConfirm, className = button, describedBy }) {
  const [asking, setAsking] = useState(false);
  const yes = useRef(null);
  useEffect(() => { if (asking) yes.current?.focus(); }, [asking]);
  if (!asking) {
    return <button type="button" className={className} aria-describedby={describedBy} onClick={() => setAsking(true)}>{label}</button>;
  }
  return (
    <span role="group" aria-label={question} className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-slate-700">{question}</span>
      <button ref={yes} type="button" className={danger} onClick={() => { setAsking(false); onConfirm(); }}>{confirmLabel}</button>
      <button type="button" className={button} onClick={() => setAsking(false)}>Cancel</button>
    </span>
  );
}

/**
 * Share window for a board (D62–D64). What you see depends on your role:
 *
 *   Owner  – people waiting to join (Let in / Decline), invite by email,
 *            the invite link, the member list with Remove, rename / delete.
 *   Member – the member list and "Leave board".
 *
 * Built on the native <dialog>, like the task and Settings windows (D17):
 * focus stays inside, Escape closes it, focus returns to the Share button.
 * Results are announced through a live region, because the buttons that
 * caused them may disappear (e.g. "Let in" once someone is in).
 *
 * @param {{
 *   open: boolean, onClose: () => void,
 *   project: object, members: object[], sharing: object,
 *   onRename: (fields: { name: string, description: string }) => void,
 *   onDelete: () => void, onLeave: () => void,
 * }} props
 */
export default function ShareDialog({ open, onClose, project, members, sharing, onRename, onDelete, onLeave }) {
  const ref = useRef(null);
  const isOwner = project.isOwner;
  const [invites, setInvites] = useState([]);
  const [emails, setEmails] = useState({});
  const [announce, setAnnounce] = useState('');
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [lastEmailInvite, setLastEmailInvite] = useState(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Owner-only details: open invitations and everyone's email address.
  const refresh = useCallback(async () => {
    if (!isOwner) return;
    try {
      const [list, addresses] = await Promise.all([sharing.listInvites(project.id), sharing.memberEmails(project.id)]);
      setInvites(list);
      setEmails(addresses);
    } catch (err) {
      setError(sharingError(err));
    }
  }, [isOwner, sharing, project.id]);

  useEffect(() => {
    if (!open) return;
    setError('');
    setAnnounce('');
    setLastEmailInvite(null);
    setName(project.name);
    setDescription(project.description);
    refresh();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Someone new asked to join while the window is open: fetch their email too.
  const memberKey = members.map((m) => m.user_id + m.status).join();
  useEffect(() => { if (open) refresh(); }, [memberKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (action, success) => {
    setBusy(true);
    setError('');
    try {
      await action();
      if (success) setAnnounce(success);
      await refresh();
    } catch (err) {
      setError(sharingError(err));
    } finally {
      setBusy(false);
    }
  };

  const copy = async (text, what) => {
    const ok = await copyText(text);
    setAnnounce(ok ? `${what} copied.` : `Couldn't copy. Select the ${what.toLowerCase()} and copy it yourself.`);
  };

  const pending = members.filter((m) => m.status === 'pending');
  const active = members
    .filter((m) => m.status === 'active')
    .sort((a, b) => (a.role === 'owner' ? -1 : b.role === 'owner' ? 1 : a.display_name.localeCompare(b.display_name)));
  const link = invites.find((i) => !i.email);
  const emailInvites = invites.filter((i) => i.email);

  /**
   * D67: Vaiban emails the invitation itself. If the email can't be sent
   * (or sending isn't set up on this site), the invitation is still saved and
   * the owner is offered the link to send themselves.
   */
  const sendEmailInvite = async (address) => {
    setBusy(true);
    setError('');
    setLastEmailInvite(null);
    try {
      await sharing.sendInvite(project.id, address);
      setAnnounce(`Invitation emailed to ${address}. The link in it works once, and only for that address.`);
      setEmail('');
    } catch (err) {
      if (err.invite || err.notSetUp) {
        const invite = err.invite ?? (await sharing.createInvite(project.id, address).catch(() => null));
        if (invite) {
          setLastEmailInvite({ ...invite, problem: err.notSetUp ? "Automatic invitation emails aren't switched on for this site yet" : err.message });
          setEmail('');
        } else setError(sharingError(err));
      } else {
        setError(sharingError(err));
      }
    } finally {
      setBusy(false);
      refresh();
    }
  };

  const inviteByEmail = (e) => {
    e.preventDefault();
    const address = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address)) { setError('Enter an email address, like name@example.com.'); return; }
    sendEmailInvite(address);
  };

  const mailto = (invite) => {
    const subject = `Join "${project.name}" on Vaiban`;
    const body =
      `Hi,\n\nI'd like you to join my board "${project.name}" on Vaiban.\n\n` +
      `Open this link and sign in (or create an account) with this email address:\n${joinLink(invite.token)}\n\n` +
      `The link works for 7 days.`;
    return `mailto:${encodeURIComponent(invite.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby="share-title"
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      className="max-h-[calc(100vh-32px)] w-[min(720px,calc(100vw-32px))] overflow-y-auto rounded-lg border border-slate-200 bg-surface p-0 text-slate-900 shadow-xl backdrop:bg-black/60"
    >
      {open && (
        <div className="grid gap-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id="share-title" className="text-lg font-semibold [overflow-wrap:anywhere]">
                {isOwner ? 'Share' : 'Members of'} “{project.name}”
              </h2>
              <p className="text-sm text-slate-600">
                {isOwner
                  ? 'People you add see this board only – none of your other boards.'
                  : `${project.ownerName || 'The owner'} owns this board and decides who can join.`}
              </p>
            </div>
            <button type="button" onClick={onClose} className={button}>Done</button>
          </div>

          <p role="status" aria-live="polite" className={announce ? 'rounded-md bg-highlight px-3 py-2 text-sm text-slate-900' : 'sr-only'}>
            {announce}
          </p>
          {error && <p role="alert" className="rounded-md border border-due-overdue px-3 py-2 text-sm font-medium text-due-overdue">{error}</p>}

          {isOwner && pending.length > 0 && (
            <section aria-labelledby="share-pending" className="grid gap-3 rounded-lg border-2 border-brand-accent p-3">
              <div>
                <h3 id="share-pending" className={h3}>Waiting for you to let them in ({pending.length})</h3>
                <p className="text-sm text-slate-600">They can't see anything on this board until you let them in. Only let in people you recognise.</p>
              </div>
              <ul className="grid gap-2">
                {pending.map((m) => (
                  <li key={m.user_id} className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <Avatar name={m.display_name} size="sm" />
                    <span className="grid min-w-0 flex-1">
                      <span className="text-sm font-medium [overflow-wrap:anywhere]">{m.display_name || 'Unnamed'}</span>
                      <span className="text-xs text-slate-600 [overflow-wrap:anywhere]">
                        {emails[m.user_id] ?? '…'} · asked {relativeTime(m.requested_at)}
                      </span>
                    </span>
                    <span className="flex gap-2">
                      <button type="button" disabled={busy} className={primary} aria-label={`Let ${m.display_name} in`}
                        onClick={() => act(() => sharing.approve(project.id, m.user_id), `${m.display_name} can now see this board.`)}>
                        Let in
                      </button>
                      <button type="button" disabled={busy} className={button} aria-label={`Decline ${m.display_name}`}
                        onClick={() => act(() => sharing.remove(project.id, m.user_id), `Declined ${m.display_name}.`)}>
                        Decline
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {isOwner && (
            <section aria-labelledby="share-email" className={section}>
              <div>
                <h3 id="share-email" className={h3}>Invite by email</h3>
                <p id="share-email-hint" className="text-sm text-slate-600">
                  We'll email them a link that works once, and only when they sign in with that address. They join straight away – no approval needed, because you chose them.
                </p>
              </div>
              <form onSubmit={inviteByEmail} noValidate className="flex flex-wrap gap-2">
                <label htmlFor="share-email-input" className="sr-only">Email address to invite</label>
                <input id="share-email-input" type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com" aria-describedby="share-email-hint" className={`${input} flex-1 basis-56`} />
                <button type="submit" disabled={busy} className={primary}>{busy ? 'Sending…' : 'Send invitation'}</button>
              </form>

              {lastEmailInvite && (
                <div className="grid gap-2 rounded-md bg-slate-100 p-3 text-sm text-slate-800">
                  <p>
                    {lastEmailInvite.problem}. The invitation for <strong>{lastEmailInvite.email}</strong> is saved – they'll see it on their
                    projects page when they sign in with that address – but let them know yourself:
                  </p>
                  <p className="flex flex-wrap gap-2">
                    <a href={mailto(lastEmailInvite)} className={primary}>Write the email in your email app</a>
                    <button type="button" className={button} onClick={() => copy(joinLink(lastEmailInvite.token), 'Invite link')}>Copy their invite link</button>
                  </p>
                </div>
              )}

              {emailInvites.length > 0 && (
                <div className="grid gap-1">
                  <h4 className="text-sm font-semibold text-slate-800">Invited, not joined yet</h4>
                  <ul className="grid gap-1">
                    {emailInvites.map((inv) => (
                      <li key={inv.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <span className="min-w-0 [overflow-wrap:anywhere]">
                          {inv.email} <span className="text-xs text-slate-600">· until {dateText(inv.expires_at)}</span>
                        </span>
                        <span className="flex gap-2">
                          <button type="button" disabled={busy} className={button} aria-label={`Send the invitation to ${inv.email} again`}
                            onClick={() => sendEmailInvite(inv.email)}>
                            Resend
                          </button>
                          <button type="button" disabled={busy} className={button} aria-label={`Cancel the invitation for ${inv.email}`}
                            onClick={() => act(() => sharing.revokeInvite(inv.id), `Cancelled the invitation for ${inv.email}.`)}>
                            Cancel
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          {isOwner && (
            <section aria-labelledby="share-link" className={section}>
              <div>
                <h3 id="share-link" className={h3}>Invite link</h3>
                <p className="text-sm text-slate-600">
                  Anyone with the link can <em>ask</em> to join. You let each person in yourself, so the board stays private even if the link gets passed around.
                </p>
              </div>
              {link ? (
                <div className="grid gap-2">
                  <div className="flex flex-wrap gap-2">
                    <label htmlFor="share-link-input" className="sr-only">Invite link</label>
                    <input id="share-link-input" readOnly value={joinLink(link.token)} onFocus={(e) => e.target.select()} className={`${input} flex-1 basis-64 font-mono text-xs`} />
                    <button type="button" className={primary} onClick={() => copy(joinLink(link.token), 'Invite link')}>Copy link</button>
                  </div>
                  <p className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                    Works until {dateText(link.expires_at)}.
                    <button type="button" disabled={busy} className={button}
                      onClick={() => act(() => sharing.revokeInvite(link.id), 'Invite link turned off. It no longer works for anyone.')}>
                      Turn off link
                    </button>
                  </p>
                </div>
              ) : (
                <p>
                  <button type="button" disabled={busy} className={button}
                    onClick={() => act(() => sharing.createInvite(project.id), 'Invite link created.')}>
                    Create invite link
                  </button>
                </p>
              )}
            </section>
          )}

          <section aria-labelledby="share-members" className={section}>
            <h3 id="share-members" className={h3}>Members ({active.length})</h3>
            <ul className="grid gap-2">
              {active.map((m) => {
                const me = m.user_id === sharing.myId;
                return (
                  <li key={m.user_id} className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <Avatar name={m.display_name} size="sm" />
                    <span className="grid min-w-0 flex-1">
                      <span className="text-sm font-medium [overflow-wrap:anywhere]">
                        {m.display_name || 'Unnamed'}{me && ' (you)'}
                        {m.role === 'owner' && <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-700">Owner</span>}
                      </span>
                      {isOwner && emails[m.user_id] && <span className="text-xs text-slate-600 [overflow-wrap:anywhere]">{emails[m.user_id]}</span>}
                    </span>
                    {isOwner && !me && (
                      <ConfirmButton label="Remove" confirmLabel="Remove" question={`Remove ${m.display_name}?`}
                        onConfirm={() => act(() => sharing.remove(project.id, m.user_id), `Removed ${m.display_name}. They can no longer see this board.`)} />
                    )}
                  </li>
                );
              })}
            </ul>
            {active.length === 1 && isOwner && <p className="text-sm text-slate-600">Just you so far.</p>}
          </section>

          {isOwner ? (
            <section aria-labelledby="share-board" className={section}>
              <h3 id="share-board" className={h3}>Board details</h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!name.trim()) { setError('Give the board a name.'); return; }
                  onRename({ name: name.trim(), description: description.trim() });
                  setAnnounce('Board details saved.');
                }}
                className="grid gap-2 sm:grid-cols-[1fr_2fr_auto] sm:items-end"
              >
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  <span>Name</span>
                  <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} className={input} />
                </label>
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  <span>Description</span>
                  <input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} className={input} />
                </label>
                <button type="submit" className={button}>Save</button>
              </form>
              <div className="flex flex-wrap items-center gap-2">
                <ConfirmButton label="Delete board" confirmLabel="Delete for everyone" className={button}
                  question={`Delete “${project.name}” and all its tasks for all ${active.length} ${active.length === 1 ? 'member' : 'members'}? This can't be undone.`}
                  onConfirm={onDelete} />
              </div>
            </section>
          ) : (
            <section aria-labelledby="share-leave" className={section}>
              <h3 id="share-leave" className={h3}>Leave this board</h3>
              <p className="text-sm text-slate-600">You'll stop seeing it. You'd need a new invitation to come back.</p>
              <div>
                <ConfirmButton label="Leave board" confirmLabel="Leave" question={`Leave “${project.name}”?`} onConfirm={onLeave} />
              </div>
            </section>
          )}
        </div>
      )}
    </dialog>
  );
}
