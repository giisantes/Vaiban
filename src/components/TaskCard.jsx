/**
 * One task on the board. M4 shows the title and the assignee.
 *
 * @param {{ task: import('../lib/createTask.js').Task }} props
 */
export default function TaskCard({ task }) {
  return (
    <article className="rounded-md border border-slate-200 bg-white p-3">
      <h3 className="text-sm font-medium text-slate-900">{task.title}</h3>
      <p className="mt-2 text-xs text-slate-600">
        <span className="sr-only">Assigned to </span>
        {task.assignee || 'Unassigned'}
      </p>
    </article>
  );
}
