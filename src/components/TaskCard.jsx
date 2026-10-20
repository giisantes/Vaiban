import { typeStyle } from '../lib/typeStyles.js';
import TypeBadge from './TypeBadge.jsx';

/**
 * One task on the board: title, type and assignee.
 * The whole card is clickable (M5) – the title is a real <button> whose
 * click area is stretched over the card, so it also works by keyboard
 * (Tab to it, then Enter).
 * M6: a coloured left stripe and a type badge (icon + text) in the corner.
 *
 * @param {{ task: import('../lib/createTask.js').Task, onOpen: (id: string) => void }} props
 */
export default function TaskCard({ task, onOpen }) {
  return (
    <article
      className={`relative rounded-md border border-l-4 border-slate-200 bg-white p-3 hover:border-y-slate-400 hover:border-r-slate-400 focus-within:ring-2 focus-within:ring-[#23466E] ${typeStyle(task.type).stripe}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 text-sm font-medium text-slate-900">
          <button
            type="button"
            onClick={() => onOpen(task.id)}
            className="text-left after:absolute after:inset-0 after:content-[''] focus:outline-none"
          >
            {task.title}
          </button>
        </h3>
        <TypeBadge type={task.type} />
      </div>
      <p className="mt-2 text-xs text-slate-600">
        <span className="sr-only">Assigned to </span>
        {task.assignee || 'Unassigned'}
      </p>
    </article>
  );
}
