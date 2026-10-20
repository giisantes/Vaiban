import TaskCard from './TaskCard.jsx';

/**
 * One board column: a heading, a task count and its cards.
 *
 * @param {{
 *   stage: {id: string, label: string},
 *   tasks: import('../lib/createTask.js').Task[],
 *   onOpenTask: (id: string) => void,
 * }} props
 */
export default function Column({ stage, tasks, onOpenTask }) {
  const headingId = `column-${stage.id}`;

  return (
    <section aria-labelledby={headingId} className="flex min-w-0 flex-col rounded-lg bg-slate-100 p-3">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 id={headingId} className="text-base font-semibold uppercase text-slate-800">
          {stage.label}
        </h2>
        <span className="text-xs text-slate-600" aria-label={`${tasks.length} tasks`}>
          {tasks.length}
        </span>
      </div>

      {tasks.length === 0 ? (
        <p className="rounded-md border border-dashed border-slate-300 p-3 text-sm text-slate-600">
          Nothing here yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {tasks.map((task) => (
            <li key={task.id}>
              <TaskCard task={task} onOpen={onOpenTask} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
