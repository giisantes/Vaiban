import { useEffect, useState } from 'react';
import SettingsButton from './SettingsButton.jsx';
import {
  PASSWORD_MIN, checkPassword, friendlyError, sendPasswordReset, setNewPassword, signIn, signUp,
} from '../lib/auth.js';

const inputClass =
  'w-full rounded-md border border-slate-300 bg-surface px-2.5 py-2 text-sm text-slate-900 ' +
  'focus:outline-none focus:ring-2 focus:ring-brand-primary aria-[invalid=true]:border-due-overdue';

/** Labelled input. `hint` sits under the label and is linked with aria-describedby. */
function Field({ id, label, hint, ...props }) {
  return (
    <label htmlFor={id} className="grid gap-1 text-sm font-medium text-slate-700">
      <span>{label}</span>
      {hint && <span id={`${id}-hint`} className="text-xs font-normal text-slate-600">{hint}</span>}
      <input id={id} aria-describedby={hint ? `${id}-hint` : undefined} className={inputClass} {...props} />
    </label>
  );
}

/** Password field with a Show / Hide button (so people can check what they typed). */
function PasswordField({ id, label, hint, autoComplete, value, onChange }) {
  const [show, setShow] = useState(false);
  return (
    <div className="grid gap-1">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">{label}</label>
      {hint && <span id={`${id}-hint`} className="text-xs text-slate-600">{hint}</span>}
      <div className="flex gap-2">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          required
          aria-describedby={hint ? `${id}-hint` : undefined}
          className={inputClass}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-pressed={show}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="shrink-0 rounded-md border border-slate-300 px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
        >
          {show ? 'Hide' : 'Show'}
        </button>
      </div>
    </div>
  );
}

function Logo() {
  return (
    <div className="flex items-center justify-center gap-2 text-xl font-bold tracking-tight text-slate-900">
      <span aria-hidden="true" className="flex h-8 items-end gap-0.5 rounded bg-brand-primary p-1">
        <i className="block h-5 w-1.5 rounded-sm bg-brand-accent" />
        <i className="block h-3 w-1.5 rounded-sm bg-surface" />
        <i className="block h-4 w-1.5 rounded-sm bg-surface/70" />
      </span>
      Vaiban
    </div>
  );
}

const TITLES = {
  signin: 'Sign in',
  signup: 'Create your account',
  forgot: 'Reset your password',
  'check-email': 'Check your email',
  reset: 'Choose a new password',
};

/**
 * Sign in / sign up / forgot password / set a new password – one screen,
 * one mode at a time.
 *
 * Accessibility: every field has a visible label and the right
 * `autocomplete`, so password managers can fill them and pasting is never
 * blocked (WCAG 2.2 SC 3.3.8 Accessible Authentication, SC 1.3.5 Identify
 * Input Purpose). Errors are announced (role="alert").
 *
 * @param {{ initialMode?: keyof TITLES, onPasswordReset?: () => void, joining?: boolean, onContinueWithout?: () => void }} props
 *   onContinueWithout: go back to using Vaiban without an account (D74).
 *   joining: arrived from a board invite link (D62) – say so, so the sign-in isn't a surprise.
 */
export default function AuthScreen({ initialMode = 'signin', onPasswordReset, settings, onSettingsChange, joining = false, onContinueWithout }) {
  const [mode, setMode] = useState(initialMode);
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    document.title = `${TITLES[mode]} – Vaiban`;
  }, [mode]);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  const go = (next) => { setMode(next); setError(''); setNotice(''); };

  const run = async (action) => {
    setError('');
    setBusy(true);
    try {
      await action();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    const email = form.email.trim();
    if (mode === 'signin') return run(() => signIn({ email, password: form.password }));
    if (mode === 'signup') {
      if (!form.name.trim()) return setError('Enter your name.');
      const problem = checkPassword(form.password);
      if (problem) return setError(problem);
      return run(async () => {
        const { needsConfirmation } = await signUp({ name: form.name.trim(), username: form.username.trim(), email, password: form.password });
        if (needsConfirmation) { setSentTo(email); go('check-email'); }
      });
    }
    if (mode === 'forgot') {
      return run(async () => {
        await sendPasswordReset(email);
        setSentTo(email);
        go('check-email');
        setNotice('reset');
      });
    }
    if (mode === 'reset') {
      const problem = checkPassword(form.password);
      if (problem) return setError(problem);
      return run(async () => {
        await setNewPassword(form.password);
        onPasswordReset?.();
      });
    }
  };

  const primary = { signin: 'Sign in', signup: 'Create account', forgot: 'Send reset link', reset: 'Save new password' }[mode];

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-6">
      <div className="w-full max-w-sm">
        <Logo />
        <section aria-labelledby="auth-title" className="mt-6 grid gap-4 rounded-lg border border-slate-200 bg-surface p-6 shadow-sm">
          <h1 id="auth-title" className="text-lg font-semibold text-slate-900">{TITLES[mode]}</h1>
          {onContinueWithout && mode === 'signup' && (
            <p className="text-sm text-slate-700">Boards, prompts and skills you made without an account will move into it.</p>
          )}
          {joining && (mode === 'signin' || mode === 'signup') && (
            <p className="rounded-md bg-highlight px-3 py-2 text-sm text-slate-900">
              You've been invited to a board. Sign in, or create an account, and you'll be taken back to the invitation.
            </p>
          )}

          {mode === 'check-email' ? (
            <div className="grid gap-3 text-sm text-slate-700">
              <p>
                {notice === 'reset'
                  ? <>If there is an account for <strong>{sentTo}</strong>, we've sent it a link to reset the password.</>
                  : <>We've sent a confirmation link to <strong>{sentTo}</strong>. Open it to finish creating your account.</>}
              </p>
              <p className="text-slate-600">It can take a minute. Check your spam folder too.</p>
              <button type="button" onClick={() => go('signin')} className="justify-self-start rounded text-link underline underline-offset-2 hover:no-underline">
                Back to sign in
              </button>
            </div>
          ) : (
            <form onSubmit={submit} noValidate className="grid gap-3">
              {mode === 'signup' && (
                <>
                  <Field id="auth-name" label="Name" autoComplete="name" value={form.name} onChange={set('name')} required />
                  <Field id="auth-username" label="Display name (optional)" hint="What your teammates see on cards." autoComplete="nickname" value={form.username} onChange={set('username')} />
                </>
              )}
              {mode !== 'reset' && (
                <Field id="auth-email" label="Email" type="email" autoComplete="email" inputMode="email" value={form.email} onChange={set('email')} required />
              )}
              {mode !== 'forgot' && (
                <PasswordField
                  id="auth-password"
                  label={mode === 'reset' ? 'New password' : 'Password'}
                  hint={mode === 'signup' || mode === 'reset' ? `At least ${PASSWORD_MIN} characters. A short phrase is easy to remember.` : undefined}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  value={form.password}
                  onChange={set('password')}
                />
              )}

              {error && <p role="alert" className="rounded-md bg-due-overdue-soft px-3 py-2 text-sm font-medium text-due-overdue">{error}</p>}

              <button
                type="submit"
                disabled={busy}
                className="mt-1 rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 disabled:opacity-60"
              >
                {busy ? 'Please wait…' : primary}
              </button>

              <div className="flex flex-wrap justify-between gap-2 text-sm">
                {mode === 'signin' && (
                  <>
                    <button type="button" onClick={() => go('signup')} className="min-h-[24px] rounded py-1 text-link underline underline-offset-2 hover:no-underline">Create an account</button>
                    <button type="button" onClick={() => go('forgot')} className="min-h-[24px] rounded py-1 text-link underline underline-offset-2 hover:no-underline">Forgot password?</button>
                  </>
                )}
                {(mode === 'signup' || mode === 'forgot') && (
                  <button type="button" onClick={() => go('signin')} className="min-h-[24px] rounded py-1 text-link underline underline-offset-2 hover:no-underline">
                    {mode === 'signup' ? 'Already have an account? Sign in' : 'Back to sign in'}
                  </button>
                )}
              </div>
            </form>
          )}
        </section>
        {onContinueWithout && (
          <p className="mt-4 text-center text-sm">
            <button type="button" onClick={onContinueWithout} className="inline-flex min-h-[24px] items-center rounded text-link underline underline-offset-2 hover:no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary">
              ← Continue without an account
            </button>
          </p>
        )}
        {/* div, not p: the Settings window (a <dialog>) can't sit inside a paragraph */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-center text-xs text-slate-600">
          {/* Text size and theme are available before signing in, too. */}
          <SettingsButton settings={settings} onChange={onSettingsChange} />
          <a href="#/accessibility" className="inline-flex min-h-[24px] items-center rounded underline underline-offset-2 hover:no-underline">Accessibility statement</a>
        </div>
      </div>
    </main>
  );
}
