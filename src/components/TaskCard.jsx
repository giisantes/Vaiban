/**
 * One task on the board: title and assignee.
 * The whole card is clickable (M5) – the title is a real <button> whose
 * click area is stretched over the card, so it also works by keyboard
 * (Tab to it, then Enter).
 *
 * @param {{ task: import('../lib/createTask.js').Task, onOpen: (id: string) => void }} props
 */
export default function TaskCard({ task, onOpen }) {
  return (
    <article className="relative rounded-md border border-slate-200 bg-white p-3 hover:border-slate-400 focus-within:ring-2 focus-within:ring-[#23466E]">
      <h3 className="text-sm font-medium text-slate-900">
        <button
          type="button"
          onClick={() => onOpen(task.id)}
          className="text-left after:absolute after:inset-0 after:content-[''] focus:outline-none"
        >
          {task.title}
        </button>
      </h3>
      <p className="mt-2 text-xs text-slate-600">
        <span className="sr-only">Assigned to </span>
        {task.assignee || 'Unassigned'}
      </p>
    </article>
  );
}
