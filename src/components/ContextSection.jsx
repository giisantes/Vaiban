import { AI_TOOLS } from '../constants.js';
import { relativeTime } from '../lib/relativeTime.js';

/**
 * The Context section of the task modal (M9): a Markdown briefing for the
 * next AI tool or teammate, the AI tool it was last used with, and when it
 * was last updated. Kept out of TaskModal so that file stays readable.
 *
 * @param {{
 *   context: string,
 *   contextTool: string | null,
 *   contextUpdatedAt: string | null,
 *   onChange: (field: 'context' | 'contextTool', value: string | null) => void,
 *   inputClass: string,
 *   children?: import('react').ReactNode,   // extra actions (M10 copy button)
 * }} props
 */
export default function ContextSection({ context, contextTool, contextUpdatedAt, onChange, inputClass, children }) {
  const updated = contextUpdatedAt ? `Last updated ${relativeTime(contextUpdatedAt)}` : 'Not saved yet';

  return (
    <section aria-labelledby="context-heading" className="grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="context-heading" className="text-sm font-semibold text-slate-900">Context</h3>
        <p id="context-updated" className="text-xs text-slate-600">{updated}</p>
      </div>
      <p id="context-help" className="text-xs text-slate-600">
        A briefing for whoever picks this up next – you, a teammate or an AI tool. Markdown is fine.
      </p>
      <label htmlFor="task-context" className="sr-only">Context</label>
      <textarea
        id="task-context"
        value={context}
        onChange={(e) => onChange('context', e.target.value)}
        rows={9}
        aria-describedby="context-help context-updated"
        className={`${inputClass} font-mono text-[13px] leading-relaxed`}
      />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          <span>AI tool (optional)</span>
          <select
            id="task-context-tool"
            value={contextTool || ''}
            onChange={(e) => onChange('contextTool', e.target.value || null)}
            className={`${inputClass} w-44`}
          >
            <option value="">Not set</option>
            {AI_TOOLS.map((tool) => (
              <option key={tool} value={tool}>{tool}</option>
            ))}
          </select>
        </label>
        {children}
      </div>
    </section>
  );
}
