import { DUE_FILTERS, NONE, NO_FILTERS, isFiltering } from '../lib/taskFilters.js';

const select =
  'min-w-0 max-w-full rounded-md border border-slate-300 bg-surface px-2 py-1 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-primary';

/**
 * Filter the board (FR16 – D80): member, milestone, tag, due date.
 * Plain labelled <select>s: choosing an option only narrows the cards on
 * this page – it doesn't move focus or open anything (WCAG 3.2.2 On Input) –
 * and the result is announced ("Showing 3 of 8 tasks").
 *
 * @param {{
 *   filters: import('../lib/taskFilters.js').Filters, onChange: (f: object) => void,
 *   people: string[], me?: string, milestones: object[], tags: string[],
 *   shown: number, total: number,
 * }} props
 */
export default function FilterBar({ filters, onChange, people, me, milestones, tags, shown, total }) {
  const set = (key) => (e) => onChange({ ...filters, [key]: e.target.value });
  const active = isFiltering(filters);
  const field = (id, label, value, onSelect, options) => (
    <label htmlFor={id} className="grid min-w-0 gap-0.5 text-xs font-medium text-slate-700">
      <span>{label}</span>
      <select id={id} value={value} onChange={onSelect} className={`${select} ${value ? 'border-brand-primary ring-1 ring-brand-primary' : ''}`}>
        {options}
      </select>
    </label>
  );

  return (
    <div role="group" aria-labelledby="filter-heading" className="mb-4 grid gap-2">
      <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
        <h2 id="filter-heading" className="self-center text-sm font-semibold uppercase tracking-wide text-slate-800">Filter</h2>
        {field('filter-assignee', 'Member', filters.assignee, set('assignee'), (
          <>
            <option value="">Anyone</option>
            {me && <option value={me}>Me ({me})</option>}
            {people.filter((p) => p !== me).map((p) => <option key={p} value={p}>{p}</option>)}
            <option value={NONE}>Unassigned</option>
          </>
        ))}
        {field('filter-milestone', 'Milestone', filters.milestone, set('milestone'), (
          <>
            <option value="">Any milestone</option>
            {milestones.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            <option value={NONE}>No milestone</option>
          </>
        ))}
        {field('filter-tag', 'Tag', filters.tag, set('tag'), (
          <>
            <option value="">Any tag</option>
            {tags.map((t) => <option key={t} value={t}>{t}</option>)}
          </>
        ))}
        {field('filter-due', 'Due date', filters.due, set('due'), (
          <>
            <option value="">Any date</option>
            {DUE_FILTERS.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
          </>
        ))}
        {active && (
          <button
            type="button"
            onClick={() => onChange(NO_FILTERS)}
            className="inline-flex min-h-[30px] items-center rounded-md border border-slate-300 bg-surface px-2.5 py-1 text-xs font-medium text-slate-800 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
          >
            Clear filters
          </button>
        )}
      </div>
      <p role="status" className={active ? 'rounded-md bg-highlight px-3 py-1.5 text-sm text-slate-900' : 'sr-only'}>
        {active ? `Showing ${shown} of ${total} ${total === 1 ? 'task' : 'tasks'}.` : ''}
        {active && shown === 0 && ' Nothing matches – try removing a filter.'}
      </p>
    </div>
  );
}
