import { useEffect, useRef, useState } from 'react';
import { AI_TOOLS, STAGES } from '../constants.js';
import { KINDS, LIMITS, parseTags } from '../lib/library.js';

const inputClass =
  'w-full min-w-0 rounded-md border border-slate-300 bg-surface px-2.5 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-primary aria-[invalid=true]:border-due-overdue';
const labelClass = 'grid gap-1 text-sm font-medium text-slate-700';
const button =
  'inline-flex min-h-[32px] items-center justify-center rounded-md border border-slate-300 bg-surface px-3 py-1 text-sm font-medium text-slate-800 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary disabled:opacity-50';
const primary =
  'inline-flex min-h-[32px] items-center justify-center rounded-md bg-brand-primary px-4 py-1.5 text-sm font-medium text-white hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 disabled:opacity-50';

/**
 * "Paste from clipboard" beside a text box (NFR4). Browsers may refuse to let
 * a page read the clipboard; then it says how to paste by hand instead.
 */
function PasteButton({ onPaste, label, onMessage }) {
  return (
    <button
      type="button"
      className={`${button} text-xs`}
      aria-label={`Paste ${label} from the clipboard`}
      onClick={async () => {
        try {
          const text = await navigator.clipboard.readText();
          if (text) { onPaste(text); onMessage(`Pasted into ${label}.`); }
          else onMessage('The clipboard is empty.');
        } catch {
          onMessage(`Your browser didn't allow pasting from here. Click in ${label} and press Ctrl+V (Cmd+V on a Mac).`);
        }
      }}
    >
      Paste
    </button>
  );
}

/**
 * Add or edit a prompt (FR36, FR38) or an AI skill (FR42).
 * Only the name (and, for a prompt, the prompt text) is required – everything
 * else can be added later (my NFR1: little effort per entry).
 *
 * @param {{
 *   item: import('../lib/library.js').LibraryItem,
 *   isNew: boolean,
 *   projects: object[], tasks: object[],
 *   onSave: (item: object) => Promise<void>, onCancel: () => void,
 *   onMessage: (text: string) => void, isCloud: boolean,
 * }} props
 */
export default function LibraryItemForm({ item, isNew, projects, tasks, onSave, onCancel, onMessage, isCloud }) {
  const kind = item.kind;
  const [form, setForm] = useState({ ...item, tagsText: item.tags.join(', ') });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const firstField = useRef(null);

  useEffect(() => { firstField.current?.focus(); }, []);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const boardTasks = form.boardId ? tasks.filter((t) => t.projectId === form.boardId) : [];
  const toggleTask = (id) =>
    setForm((f) => ({ ...f, taskIds: f.taskIds.includes(id) ? f.taskIds.filter((x) => x !== id) : [...f.taskIds, id] }));

  const submit = async (e) => {
    e.preventDefault();
    const problems = {};
    if (!form.name.trim()) problems.name = `Give the ${KINDS[kind].label.toLowerCase()} a name.`;
    if (kind === 'prompt' && !form.body.trim()) problems.body = 'Add the prompt text.';
    setErrors(problems);
    if (Object.keys(problems).length) {
      document.getElementById(problems.name ? 'lib-name' : 'lib-body')?.focus();
      return;
    }
    const { tagsText, ...rest } = form;
    const saved = {
      ...rest,
      name: form.name.trim(),
      tags: parseTags(tagsText),
      aiTool: form.aiTool || null,
      // links only to tasks on the board it is saved to
      ...(kind === 'prompt' ? { taskIds: form.boardId ? form.taskIds.filter((id) => boardTasks.some((t) => t.id === id)) : [] } : {}),
    };
    setSaving(true);
    setSaveError('');
    try {
      await onSave(saved);
    } catch (err) {
      setSaveError(err?.message || "Couldn't save. Check your connection and try again.");
      setSaving(false);
    }
  };

  const errorFor = (field) =>
    errors[field] && <p id={`lib-${field}-error`} className="text-xs font-medium text-due-overdue">{errors[field]}</p>;

  return (
    <form onSubmit={submit} noValidate className="grid gap-4" aria-labelledby="library-form-title">
      <h2 id="library-form-title" className="text-lg font-semibold text-slate-900">
        {isNew ? `New ${KINDS[kind].label.toLowerCase()}` : `Edit ${KINDS[kind].label.toLowerCase()}`}
      </h2>

      <label className={labelClass}>
        <span>Name (required)</span>
        <input
          id="lib-name"
          ref={firstField}
          value={form.name}
          onChange={set('name')}
          maxLength={LIMITS.name}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? 'lib-name-error' : undefined}
          className={inputClass}
        />
        {errorFor('name')}
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          <span>Library</span>
          <select
            id="lib-board"
            value={form.boardId ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, boardId: e.target.value || null }))}
            className={inputClass}
          >
            <option value="">{isCloud ? 'Private – only you' : 'Private'}</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{isCloud ? `${p.name} – shared with the board` : p.name}</option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          <span>AI tool (optional)</span>
          <select id="lib-tool" value={form.aiTool ?? ''} onChange={set('aiTool')} className={inputClass}>
            <option value="">Not set</option>
            {AI_TOOLS.map((tool) => <option key={tool} value={tool}>{tool}</option>)}
          </select>
        </label>
      </div>

      <label className={labelClass}>
        <span>Tags (optional)</span>
        <span id="lib-tags-hint" className="text-xs font-normal text-slate-600">Separate tags with commas, e.g. React, Bug fix, Onboarding</span>
        <input id="lib-tags" value={form.tagsText} onChange={set('tagsText')} aria-describedby="lib-tags-hint" className={inputClass} />
      </label>

      {kind === 'prompt' ? (
        <>
          <div className="grid gap-1">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <label htmlFor="lib-body" className="text-sm font-medium text-slate-700">Prompt (required)</label>
              <PasteButton label="the prompt" onPaste={(t) => setForm((f) => ({ ...f, body: t }))} onMessage={onMessage} />
            </div>
            <textarea
              id="lib-body"
              value={form.body}
              onChange={set('body')}
              rows={7}
              maxLength={LIMITS.body}
              aria-invalid={Boolean(errors.body)}
              aria-describedby={errors.body ? 'lib-body-error' : undefined}
              className={`${inputClass} font-mono leading-relaxed`}
            />
            {errorFor('body')}
          </div>
          <div className="grid gap-1">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <label htmlFor="lib-result" className="text-sm font-medium text-slate-700">Result (optional)</label>
              <PasteButton label="the result" onPaste={(t) => setForm((f) => ({ ...f, result: t }))} onMessage={onMessage} />
            </div>
            <span id="lib-result-hint" className="text-xs text-slate-600">What the AI produced, and whether it worked.</span>
            <textarea id="lib-result" value={form.result} onChange={set('result')} rows={5} maxLength={LIMITS.result} aria-describedby="lib-result-hint" className={`${inputClass} font-mono leading-relaxed`} />
          </div>

          <fieldset className="grid gap-2 rounded-md border border-slate-200 p-3">
            <legend className="px-1 text-sm font-medium text-slate-700">Used for these tasks (optional)</legend>
            {!form.boardId ? (
              <p className="text-sm text-slate-600">Choose a board under Library to link this prompt to its tasks.</p>
            ) : boardTasks.length === 0 ? (
              <p className="text-sm text-slate-600">This board has no tasks yet.</p>
            ) : (
              <ul className="grid max-h-56 gap-1 overflow-y-auto">
                {boardTasks.map((t) => (
                  <li key={t.id}>
                    <label className="flex min-h-[28px] cursor-pointer items-start gap-2 rounded px-1 py-0.5 text-sm text-slate-800 hover:bg-slate-100">
                      <input type="checkbox" checked={form.taskIds.includes(t.id)} onChange={() => toggleTask(t.id)} className="mt-1 h-4 w-4 accent-[rgb(var(--brand-primary))]" />
                      <span className="min-w-0 [overflow-wrap:anywhere]">
                        {t.title} <span className="text-xs text-slate-600">· {STAGES.find((s) => s.id === t.status)?.label}</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </fieldset>
        </>
      ) : (
        <>
          <label className={labelClass}>
            <span>Overview (optional)</span>
            <span id="lib-overview-hint" className="text-xs font-normal text-slate-600">One or two sentences: what the skill does and when to use it.</span>
            <textarea id="lib-overview" value={form.overview} onChange={set('overview')} rows={2} maxLength={LIMITS.overview} aria-describedby="lib-overview-hint" className={inputClass} />
          </label>
          <div className="grid gap-1">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <label htmlFor="lib-instructions" className="text-sm font-medium text-slate-700">Instructions (optional)</label>
              <PasteButton label="the instructions" onPaste={(t) => setForm((f) => ({ ...f, instructions: t }))} onMessage={onMessage} />
            </div>
            <span id="lib-instructions-hint" className="text-xs text-slate-600">How to use it, step by step.</span>
            <textarea id="lib-instructions" value={form.instructions} onChange={set('instructions')} rows={7} maxLength={LIMITS.instructions} aria-describedby="lib-instructions-hint" className={`${inputClass} font-mono leading-relaxed`} />
          </div>
        </>
      )}

      {saveError && <p role="alert" className="rounded-md border border-due-overdue px-3 py-2 text-sm font-medium text-due-overdue">{saveError}</p>}

      <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4">
        <button type="button" onClick={onCancel} className={button}>Cancel</button>
        <button type="submit" disabled={saving} className={primary}>{saving ? 'Saving…' : isNew ? `Save ${KINDS[kind].label.toLowerCase()}` : 'Save changes'}</button>
      </div>
    </form>
  );
}
