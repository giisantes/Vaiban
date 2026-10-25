import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/boardsApi.js';
import { changeEmail, changePassword, checkCurrentPassword, checkPassword, displayName, friendlyError, signOut, updateNames } from '../lib/auth.js';
import { PROFILE_LIMITS, normaliseLink, pictureFromFile, shortLink } from '../lib/profiles.js';
import Avatar from './Avatar.jsx';
import { DisplaySettings } from './SettingsDialog.jsx';

const button =
  'inline-flex min-h-[32px] items-center justify-center rounded-md border border-slate-300 bg-surface px-3 py-1 text-sm font-medium text-slate-800 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary disabled:opacity-50';
const primary =
  'inline-flex min-h-[32px] items-center justify-center rounded-md bg-brand-primary px-4 py-1.5 text-sm font-medium text-white hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 disabled:opacity-50';
const danger =
  'inline-flex min-h-[32px] items-center justify-center rounded-md bg-due-overdue px-4 py-1.5 text-sm font-medium text-due-overdue-on hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 disabled:opacity-50';
const input =
  'w-full min-w-0 rounded-md border border-slate-300 bg-surface px-2.5 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-primary aria-[invalid=true]:border-due-overdue';
const card = 'grid gap-4 rounded-lg border border-slate-200 bg-surface p-4 sm:p-5';
const h3 = 'text-base font-semibold text-slate-900';

export const ACCOUNT_SECTIONS = [
  { id: 'profile', label: 'Profile', account: true },
  { id: 'appearance', label: 'Appearance', account: false },
  { id: 'security', label: 'Email and password', account: true },
  { id: 'delete', label: 'Delete account', account: true },
];

/** A labelled field with an optional hint and error, wired up for screen readers. */
function Field({ id, label, hint, error, children }) {
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
  return (
    <div className="grid gap-1">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">{label}</label>
      {hint && <span id={`${id}-hint`} className="text-xs text-slate-600">{hint}</span>}
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': Boolean(error) })}
      {error && <span id={`${id}-error`} className="text-xs font-medium text-due-overdue">{error}</span>}
    </div>
  );
}

/** Result of a form: "Saved." or an error, announced to screen readers. */
function Result({ result }) {
  if (!result) return null;
  return result.error
    ? <p role="alert" className="rounded-md border border-due-overdue px-3 py-2 text-sm font-medium text-due-overdue">{result.error}</p>
    : <p role="status" className="rounded-md bg-highlight px-3 py-2 text-sm text-slate-900">{result.ok}</p>;
}

// ── Profile ──────────────────────────────────────────────────────────────

function ProfileSection({ user, profile }) {
  const meta = user.user_metadata ?? {};
  const [name, setName] = useState(meta.name || '');
  const [username, setUsername] = useState(meta.username || '');
  const [bio, setBio] = useState(profile.mine.bio);
  const [link, setLink] = useState(profile.mine.link);
  const [avatar, setAvatar] = useState(profile.mine.avatar);
  const [errors, setErrors] = useState({});
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const file = useRef(null);

  // The saved profile arrived (or changed elsewhere): show it.
  useEffect(() => { setBio(profile.mine.bio); setLink(profile.mine.link); setAvatar(profile.mine.avatar); }, [profile.mine.bio, profile.mine.link, profile.mine.avatar]);

  const shownName = username.trim() || name.trim() || user.email;

  const pick = async (e) => {
    const chosen = e.target.files?.[0];
    e.target.value = '';
    if (!chosen) return;
    try {
      setAvatar(await pictureFromFile(chosen));
      setErrors((x) => ({ ...x, avatar: '' }));
      setResult(null);
    } catch (err) {
      setErrors((x) => ({ ...x, avatar: err.message }));
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    const problems = {};
    let tidyLink = '';
    if (!name.trim()) problems.name = 'Enter your name.';
    try { tidyLink = normaliseLink(link); } catch (err) { problems.link = err.message; }
    setErrors(problems);
    if (Object.keys(problems).length) {
      document.getElementById(problems.name ? 'profile-name' : 'profile-link')?.focus();
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const oldShown = displayName(user);
      if (name.trim() !== (meta.name || '') || username.trim() !== (meta.username || '')) {
        await updateNames({ name: name.trim(), username: username.trim() });
        // New name on the boards and member lists, and on tasks assigned to the old one.
        await api.refreshMyName();
        if (oldShown !== shownName) await api.renameMyTasks(oldShown);
      }
      await profile.save({ bio: bio.trim(), link: tidyLink, avatar });
      setLink(tidyLink);
      setResult({ ok: 'Profile saved.' });
    } catch (err) {
      setResult({ error: `Couldn't save your profile: ${friendlyError(err)}` });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className={card} aria-labelledby="settings-section-title">
      <p className="text-sm text-slate-700">Your teammates on shared boards see your picture, display name, bio and link. Nobody else does.</p>

      <fieldset className="grid gap-3">
        <legend className="mb-1 text-sm font-medium text-slate-700">Profile picture</legend>
        <div className="flex flex-wrap items-center gap-4">
          <Avatar name={shownName} src={avatar} size="lg" />
          <div className="grid gap-2">
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => file.current?.click()} className={button} aria-describedby="profile-avatar-hint">
                {avatar ? 'Change picture' : 'Upload a picture'}
              </button>
              {avatar && <button type="button" onClick={() => { setAvatar(''); setResult(null); }} className={button}>Remove picture</button>}
            </div>
            <span id="profile-avatar-hint" className="text-xs text-slate-600">JPEG, PNG, WebP or GIF. It's cropped to a square. Without one, your initials are shown.</span>
            {errors.avatar && <span role="alert" className="text-xs font-medium text-due-overdue">{errors.avatar}</span>}
          </div>
        </div>
        <input ref={file} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={pick} className="sr-only" tabIndex={-1} aria-hidden="true" />
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="profile-name" label="Name" error={errors.name}>
          {(a) => <input {...a} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={100} className={input} />}
        </Field>
        <Field id="profile-username" label="Display name (optional)" hint="What your teammates see on cards. Leave empty to use your name.">
          {(a) => <input {...a} value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="nickname" maxLength={60} className={input} />}
        </Field>
      </div>

      <Field id="profile-bio" label="Bio (optional)" hint={`${PROFILE_LIMITS.bio - bio.length} characters left`}>
        {(a) => <textarea {...a} value={bio} onChange={(e) => setBio(e.target.value.slice(0, PROFILE_LIMITS.bio))} rows={2} className={input} />}
      </Field>

      <Field id="profile-link" label="Website or GitHub page (optional)" hint="For example github.com/your-name" error={errors.link}>
        {(a) => <input {...a} type="url" inputMode="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://github.com/your-name" className={`${input} sm:max-w-md`} />}
      </Field>

      <Result result={result} />
      <div><button type="submit" disabled={busy} className={primary}>{busy ? 'Saving…' : 'Save profile'}</button></div>
    </form>
  );
}

// ── Email and password ───────────────────────────────────────────────────

function SecuritySection({ user }) {
  const [email, setEmail] = useState('');
  const [emailResult, setEmailResult] = useState(null);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [passwordResult, setPasswordResult] = useState(null);
  const [busy, setBusy] = useState('');

  const submitEmail = async (e) => {
    e.preventDefault();
    const address = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address)) { setEmailResult({ error: 'Enter an email address, like name@example.com.' }); return; }
    if (address === user.email) { setEmailResult({ error: "That's already your email address." }); return; }
    setBusy('email');
    try {
      await changeEmail(address);
      setEmailResult({ ok: `We've sent a confirmation link to ${address}. Your email changes once you open it. Check your current inbox too – you may need to confirm there as well.` });
      setEmail('');
    } catch (err) {
      setEmailResult({ error: friendlyError(err) });
    } finally { setBusy(''); }
  };

  const submitPassword = async (e) => {
    e.preventDefault();
    const problem = !current ? 'Enter your current password.' : checkPassword(next);
    if (problem) { setPasswordResult({ error: problem }); return; }
    setBusy('password');
    try {
      await changePassword(user.email, current, next);
      setPasswordResult({ ok: 'Password changed.' });
      setCurrent(''); setNext('');
    } catch (err) {
      setPasswordResult({ error: err.message?.startsWith("That isn't") ? err.message : friendlyError(err) });
    } finally { setBusy(''); }
  };

  return (
    <div className="grid gap-4">
      <form onSubmit={submitEmail} noValidate className={card} aria-labelledby="security-email">
        <h3 id="security-email" className={h3}>Email address</h3>
        <p className="text-sm text-slate-700">Signed in as <strong className="[overflow-wrap:anywhere]">{user.email}</strong>{user.new_email ? ` – waiting for you to confirm ${user.new_email}` : ''}.</p>
        <Field id="security-new-email" label="New email address">
          {(a) => <input {...a} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={`${input} sm:max-w-md`} />}
        </Field>
        <Result result={emailResult} />
        <div><button type="submit" disabled={busy === 'email'} className={primary}>{busy === 'email' ? 'Sending…' : 'Change email'}</button></div>
      </form>

      <form onSubmit={submitPassword} noValidate className={card} aria-labelledby="security-password">
        <h3 id="security-password" className={h3}>Password</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="security-current" label="Current password">
            {(a) => <input {...a} type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className={input} />}
          </Field>
          <Field id="security-next" label="New password" hint="At least 8 characters. A short phrase is easy to remember.">
            {(a) => <input {...a} type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} className={input} />}
          </Field>
        </div>
        <Result result={passwordResult} />
        <div><button type="submit" disabled={busy === 'password'} className={primary}>{busy === 'password' ? 'Changing…' : 'Change password'}</button></div>
      </form>
    </div>
  );
}

// ── Delete account ───────────────────────────────────────────────────────

function DeleteSection({ user, ownedBoards }) {
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const ready = password && confirmText.trim().toLowerCase() === 'delete my account';

  const submit = async (e) => {
    e.preventDefault();
    if (!ready) return;
    setBusy(true);
    setResult(null);
    try {
      await checkCurrentPassword(user.email, password);
      await api.deleteMyAccount();
      try { window.sessionStorage.setItem('vaiban.notice', 'Your account has been deleted.'); } catch { /* ignore */ }
      window.location.replace('#/'); // back to the projects page, without an account
      await signOut();
    } catch (err) {
      setResult({ error: err.message?.startsWith("That isn't") ? err.message : `Couldn't delete your account: ${friendlyError(err)}` });
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="grid gap-4 rounded-lg border border-due-overdue/60 bg-surface p-4 sm:p-5" aria-labelledby="delete-title">
      <h3 id="delete-title" className="text-base font-semibold text-due-overdue">Delete your account</h3>
      <div className="grid gap-1 text-sm text-slate-800">
        <p>This permanently deletes:</p>
        <ul className="list-disc space-y-0.5 pl-5">
          <li>your account, profile and settings</li>
          <li>
            {ownedBoards.length
              ? <>the {ownedBoards.length === 1 ? 'board' : `${ownedBoards.length} boards`} you own – <strong>for everyone on {ownedBoards.length === 1 ? 'it' : 'them'}</strong>: {ownedBoards.map((b) => b.name).join(', ')}</>
              : 'the boards you own (you don\'t own any at the moment)'}
          </li>
          <li>the prompts and AI skills you wrote, including ones in other people's boards</li>
          <li>your place on boards other people own (their boards stay)</li>
        </ul>
        <p className="font-medium">It can't be undone.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="delete-password" label="Your password">
          {(a) => <input {...a} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={input} />}
        </Field>
        <Field id="delete-confirm" label="Type “delete my account” to confirm">
          {(a) => <input {...a} value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoComplete="off" spellCheck={false} className={input} />}
        </Field>
      </div>
      <Result result={result} />
      <div><button type="submit" disabled={!ready || busy} className={danger}>{busy ? 'Deleting…' : 'Delete my account'}</button></div>
    </form>
  );
}

/**
 * Account settings (D77), like GitHub's: a list of sections on the left and
 * the chosen one on the right. Reached from your name in the header.
 * Without an account only Appearance is available, with a way to sign up.
 *
 * @param {{
 *   user: object | null, section: string, go: (section: string) => void,
 *   settings: object, onSettingsChange: (changes: object) => void,
 *   profile: ReturnType<typeof import('../hooks/useProfiles.js').useProfiles>,
 *   ownedBoards: object[], onSignIn?: (mode: string) => void, onBack: () => void,
 * }} props
 */
export default function AccountSettingsPage({ user, section, go, settings, onSettingsChange, profile, ownedBoards, onSignIn, onBack }) {
  const sections = ACCOUNT_SECTIONS.filter((s) => user || !s.account);
  const current = sections.find((s) => s.id === section) ?? sections[0];
  const heading = useRef(null);

  useEffect(() => { document.title = `${current.label} – Settings – Vaiban`; }, [current.label]);
  useEffect(() => { heading.current?.focus(); }, [current.id]);

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {user && <Avatar name={displayName(user)} src={profile.mine.avatar || undefined} />}
          <div className="grid">
            <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
            {user && <p className="text-sm text-slate-600 [overflow-wrap:anywhere]">{displayName(user)}{profile.mine.link ? ` · ${shortLink(profile.mine.link)}` : ''}</p>}
          </div>
        </div>
        <button type="button" onClick={onBack} className={button}>← Back to projects</button>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 md:grid-cols-[13rem_minmax(0,1fr)] md:items-start">
        <nav aria-label="Settings sections">
          <ul className="flex flex-wrap gap-1 md:grid">
            {sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#/settings/${s.id}`}
                  onClick={(e) => { e.preventDefault(); go(s.id); }}
                  aria-current={s.id === current.id ? 'page' : undefined}
                  className={`flex min-h-[32px] items-center rounded-md px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${
                    s.id === current.id ? 'bg-highlight font-semibold text-slate-900 md:border-l-4 md:border-brand-primary' : 'text-slate-700 hover:bg-slate-100'
                  } ${s.id === 'delete' && s.id !== current.id ? 'text-due-overdue' : ''}`}
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <section aria-labelledby="settings-section-title" className="grid gap-4">
          <h2 id="settings-section-title" ref={heading} tabIndex={-1} className="text-xl font-semibold text-slate-900 focus:outline-none">{current.label}</h2>

          {current.id === 'profile' && <ProfileSection key={user.id} user={user} profile={profile} />}
          {current.id === 'appearance' && (
            <div className={card}>
              <DisplaySettings settings={settings} onChange={onSettingsChange} />
              <p className="text-xs text-slate-600">
                Changes are saved automatically{user ? ' to your account, so they follow you to other devices' : ' in this browser'}. Your browser's own zoom still works on top of these.
              </p>
            </div>
          )}
          {current.id === 'security' && <SecuritySection user={user} />}
          {current.id === 'delete' && <DeleteSection user={user} ownedBoards={ownedBoards} />}

          {!user && onSignIn && (
            <div className="grid gap-2 rounded-lg border border-brand-primary/30 bg-highlight p-4">
              <p className="text-sm text-slate-900">Profile, email and password settings come with an account. Your boards move into it when you create one.</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => onSignIn('signin')} className={button}>Sign in</button>
                <button type="button" onClick={() => onSignIn('signup')} className={primary}>Create account</button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
