import { useState } from 'react';
import TaskCard from './TaskCard.jsx';

/**
 * One board column: a heading, a task count and its cards.
 * M12: also a drop target. While a card from another column is being
 * dragged, every column it could go to shows a dashed outline; the one
 * under the pointer is highlighted and says "Drop to move here".
 *
 * @param {{
 *   stage: {id: string, label: string},
 *   tasks: import('../lib/createTask.js').Task[],
 *   onOpenTask: (id: string) => void,
 *   onHandOff: (id: string, name: string) => void,
 *   onMoveTask: (id: string, status: string, how?: object) => void,
 *   highlightId: string | null,
 *   today: string,
 *   onCopied: (ok: boolean) => void,
 *   dragging: import('../lib/createTask.js').Task | null,
 *   onDragStart: (task: import('../lib/createTask.js').Task) => void,
 *   onDragEnd: () => void,
 *   onDrop: (id: string) => void,
 * }} props
 */
export default function Column({ stage, totalCount, tasks, onOpenTask, onHandOff, onMoveTask, highlightId, today, onCopied, dragging, onDragStart, onDragEnd, onDrop }) {
  const headingId = `column-${stage.id}`;
  const [over, setOver] = useState(false);
  const canDrop = Boolean(dragging) && dragging.status !== stage.id;

  const dropProps = {
    onDragOver: (e) => {
      if (!canDrop) return;
      e.preventDefault(); // allows the drop
      e.dataTransfer.dropEffect = 'move';
      if (!over) setOver(true);
    },
    onDragLeave: (e) => {
      if (!e.currentTarget.contains(e.relatedTarget)) setOver(false);
    },
    onDrop: (e) => {
      e.preventDefault();
      setOver(false);
      const id = e.dataTransfer.getData('text/plain');
      if (id && canDrop) onDrop(id);
    },
  };

  const outline = !canDrop
    ? ''
    : over
      ? 'outline outline-2 outline-offset-2 outline-brand-primary'
      : 'outline-dashed outline-2 outline-offset-2 outline-slate-400';

  return (
    <section
      aria-labelledby={headingId}
      {...dropProps}
      className={`flex min-h-[8rem] min-w-0 flex-col rounded-lg p-3 transition-colors duration-150 ${over && canDrop ? 'bg-highlight' : 'bg-slate-100'} ${outline}`}
    >
      <div className="mb-3 flex items-baseline justify-between">
        <h2 id={headingId} className="text-base font-semibold uppercase text-slate-800">
          {stage.label}
        </h2>
        {/* D80: while a filter is on, "1 of 3" – so hidden tasks aren't mistaken for missing ones */}
        <span className="text-xs text-slate-600">
          {totalCount === undefined ? (
            <>
              {tasks.length}
              <span className="sr-only"> {tasks.length === 1 ? 'task' : 'tasks'}</span>
            </>
          ) : (
            <>
              {tasks.length} of {totalCount}
              <span className="sr-only"> {totalCount === 1 ? 'task' : 'tasks'} shown</span>
            </>
          )}
        </span>
      </div>

      {tasks.length === 0 ? (
        <p className="rounded-md border border-dashed border-slate-300 p-3 text-sm text-slate-600">
          {totalCount ? `None match the filters (${totalCount} hidden).` : 'Nothing here yet.'}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {tasks.map((task) => (
            <li key={task.id}>
              <TaskCard
                task={task}
                onOpen={onOpenTask}
                onHandOff={onHandOff}
                onMove={onMoveTask}
                justHandedOff={task.id === highlightId}
                today={today}
                onCopied={onCopied}
                isDragging={dragging?.id === task.id}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />
            </li>
          ))}
        </ul>
      )}

      {canDrop && (
        <p aria-hidden="true" className={`mt-2 rounded-md border-2 border-dashed p-2 text-center text-xs font-medium ${over ? 'border-brand-primary text-link' : 'border-slate-300 text-slate-600'}`}>
          {over ? 'Drop to move here' : `Move to ${stage.label}`}
        </p>
      )}
    </section>
  );
}
