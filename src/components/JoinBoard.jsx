import { useEffect, useRef, useState } from 'react';
import { sharingError } from '../lib/boardsApi.js';

const primary =
  'inline-flex min-h-[36px] items-center justify-center rounded-md bg-brand-primary px-4 py-1.5 text-sm font-medium text-white hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 disabled:opacity-50';
const button =
  'inline-flex min-h-[36px] items-center justify-center rounded-md border border-slate-300 bg-surface px-4 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary';

/**
 * Opened from an invite link (#/join/<token>), after signing in (D62).
 *
 * Nothing happens until the person presses "Ask to join" – opening a link
 * shouldn't commit you to anything. All they can see beforehand is the
 * board's name and owner; the database shows nothing else to non-members.
 *
 * @param {{
 *   token: string, sharing: object,
 *   onOpenBoard: (boardId: string) => void, onHome: () => void,
 *   onJoined: (message: string) => void,
 *   onSignOut?: () => void,
 * }} props
 */
export default function JoinBoard({ token, sharing, onOpenBoard, onHome, onJoined, onSignOut }) {
  const [info, setInfo] = useState(undefined); // undefined = loading, null = not found
  const [state, setState] = useState('ask');   // 'ask' | 'pending'
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const heading = useRef(null);

  useEffect(() => {
    let alive = true;
    sharing.inviteInfo(token)
      .then((result) => { if (alive) { setInfo(result); if (result?.my_status === 'pending') setState('pending'); } })
      .catch((err) => { if (alive) { setInfo(null); setError(sharingError(err)); } });
    return () => { alive = false; };
  }, [token, sharing]);

  // Move focus to the new heading whenever the message changes, so screen
  // readers announce it (WCAG 2.2 SC 4.1.3 Status Messages).
  useEffect(() => { heading.current?.focus(); }, [info, state]);

  useEffect(() => { document.title = 'Join a board – Vaiban'; }, []);

  const ask = async () => {
    setBusy(true);
    setError('');
    try {
      const status = await sharing.requestToJoin(token);
      if (status === 'active') {
        onJoined(`You've joined "${info.board_name}".`);
        onOpenBoard(info.board_id);
      } else {
        setState('pending');
      }
    } catch (err) {
      setError(sharingError(err));
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    setBusy(true);
    try {
      await sharing.cancelRequest(info.board_id);
      onJoined(`Cancelled your request to join "${info.board_name}".`);
      onHome();
    } catch (err) {
      setError(sharingError(err));
      setBusy(false);
    }
  };

  const owner = info?.owner_name || 'the owner';
  let title;
  let body;
  let actions;
  if (info === undefined) {
    title = 'Checking your invite…';
  } else if (info === null) {
    title = "This invite link doesn't work";
    body = 'Check that you copied all of it, or ask the board owner to send you a new one.';
    actions = <button type="button" className={primary} onClick={onHome}>Go to your projects</button>;
  } else if (info.my_status === 'active') {
    title = `You're already on “${info.board_name}”`;
    actions = <button type="button" className={primary} onClick={() => onOpenBoard(info.board_id)}>Open the board</button>;
  } else if (state === 'pending') {
    title = `Asked to join “${info.board_name}”`;
    body = `${owner} needs to let you in before you can see the board. It will appear on your projects page as soon as they do – you don't need to keep this page open.`;
    actions = (
      <>
        <button type="button" className={primary} onClick={onHome}>Go to your projects</button>
        <button type="button" className={button} disabled={busy} onClick={cancel}>Cancel request</button>
      </>
    );
  } else if (info.for_me === false) {
    // D67: an emailed invitation only works for the address it was sent to.
    title = 'This invitation is for someone else';
    body = `It was sent to a different email address from the one you're signed in with. Sign in with the address it was sent to, or ask ${owner} to invite this one.`;
    actions = (
      <>
        {onSignOut && <button type="button" className={primary} onClick={onSignOut}>Sign out and use another account</button>}
        <button type="button" className={button} onClick={onHome}>Go to your projects</button>
      </>
    );
  } else if (!info.usable) {
    title = 'This invite has expired';
    body = `Invite links work for 7 days and can be turned off. Ask ${owner} for a new one.`;
    actions = <button type="button" className={primary} onClick={onHome}>Go to your projects</button>;
  } else {
    title = `Join “${info.board_name}”?`;
    body = info.for_me
      ? `${owner} invited you to a board on Vaiban. You'll see this board only – none of ${owner}'s other boards.`
      : `${owner} has invited you to a board on Vaiban. You'll see this board only – none of ${owner}'s other boards. ${owner} will need to let you in first.`;
    actions = (
      <>
        <button type="button" className={primary} disabled={busy} onClick={ask}>{busy ? 'Joining…' : info.for_me ? 'Join the board' : 'Ask to join'}</button>
        <button type="button" className={button} onClick={onHome}>Not now</button>
      </>
    );
  }

  return (
    <section aria-labelledby="join-title" className="mx-auto grid max-w-xl gap-3 rounded-lg border border-slate-200 bg-surface p-6">
      <h1 id="join-title" ref={heading} tabIndex={-1} className="text-xl font-semibold text-slate-900 focus:outline-none [overflow-wrap:anywhere]">{title}</h1>
      {body && <p className="text-sm text-slate-700">{body}</p>}
      {error && <p role="alert" className="text-sm font-medium text-due-overdue">{error}</p>}
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </section>
  );
}
