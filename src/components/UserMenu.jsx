import { useCallback, useEffect, useRef, useState } from 'react';
import { useDismiss } from '../hooks/useDismiss.js';
import Avatar from './Avatar.jsx';

const item =
  'flex min-h-[32px] w-full items-center rounded px-3 py-1.5 text-left text-sm text-slate-800 hover:bg-slate-100 focus:bg-slate-100 focus:outline-none disabled:opacity-50';

/**
 * Your picture and name in the header (D77). Opens a small menu – like
 * GitHub's – with Settings and Sign out. Closes on Escape or a click outside,
 * and focus goes back to the button (D55).
 *
 * @param {{ user: object, name: string, avatar?: string, onSettings: () => void, onSignOut: () => void, canSignOut: boolean }} props
 */
export default function UserMenu({ user, name, avatar, onSettings, onSignOut, canSignOut }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef(null);
  const toggle = useRef(null);
  const first = useRef(null);
  const close = useCallback(() => { setOpen(false); toggle.current?.focus(); }, []);
  useDismiss(wrap, open, close);
  useEffect(() => { if (open) first.current?.focus(); }, [open]);

  return (
    <div ref={wrap} className="relative border-l border-slate-300 pl-3">
      <button
        ref={toggle}
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls="user-menu"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-md px-1 py-0.5 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
      >
        <Avatar name={name} src={avatar || undefined} size="sm" />
        <span className="max-w-[12rem] truncate text-sm font-medium text-slate-800">{name}</span>
        <span className="sr-only">: account menu</span>
        <span aria-hidden="true" className="text-xs text-slate-600">▾</span>
      </button>
      {open && (
        <div id="user-menu" className="absolute right-0 z-30 mt-1 grid w-60 gap-0.5 rounded-md border border-slate-200 bg-surface p-1 shadow-lg">
          <p className="px-3 py-1.5 text-xs text-slate-600">
            Signed in as <span className="block truncate font-medium text-slate-800">{user.email}</span>
          </p>
          <hr className="my-0.5 border-slate-200" />
          <a ref={first} href="#/settings/profile" onClick={(e) => { e.preventDefault(); setOpen(false); onSettings(); }} className={item}>Settings</a>
          <button
            type="button"
            onClick={() => { setOpen(false); onSignOut(); }}
            disabled={!canSignOut}
            title={canSignOut ? undefined : 'Wait until your changes are saved'}
            className={item}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
