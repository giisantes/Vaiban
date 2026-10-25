import { useEffect, useRef, useState } from 'react';

const button =
  'inline-flex min-h-[32px] items-center justify-center rounded-md border border-slate-300 bg-surface px-3 py-1 text-sm font-medium text-slate-800 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary disabled:opacity-50';
const danger =
  'inline-flex min-h-[32px] items-center justify-center rounded-md bg-due-overdue px-3 py-1 text-sm font-medium text-due-overdue-on hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 disabled:opacity-50';

/** "Remove" that asks once more before doing it (no browser pop-ups – D17). */
export default function ConfirmButton({ label, confirmLabel, question, onConfirm, className = button, describedBy }) {
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

