import { DUE_STYLES, dueState } from '../lib/dueState.js';
import { typeStyle } from '../lib/typeStyles.js';
import DueChip from './DueChip.jsx';
import CardActions from './CardActions.jsx';
import TypeBadge from './TypeBadge.jsx';

/**
 * One task on the board: title, type and owner.
 * The whole card is clickable (M5) and opens the task to view – the title is a real <button> whose
 * click area is stretched over the card, so it also works by keyboard
 * (Tab to it, then Enter).
 * M6: a coloured left stripe and a type badge (icon + text) in the corner.
 * M7: the owner's avatar and name – click them to assign the task to
 *     someone else. Accessibility pass: a "Move" button as the keyboard
 *     alternative to dragging (CardActions).
 * `justHandedOff` briefly highlights the card after a reassignment.
 * M8: the card tints and shows a due label as the deadline approaches.
 * M10: a "Copy Context" button next to the owner.
 * M12: the card can be dragged to another column (native HTML drag and drop).
 *
 * @param {{
 *   task: import('../lib/createTask.js').Task,
 *   onOpen: (id: string) => void,
 *   onHandOff: (id: string, name: string) => void,
 *   onMove: (id: string, status: string, how?: object) => void,
 *   justHandedOff: boolean,
 *   today: string,
 *   onCopied: (ok: boolean) => void,
 *   isDragging: boolean,
 *   onDragStart: (task: import('../lib/createTask.js').Task) => void,
 *   onDragEnd: () => void,
 * }} props
 */
export default function TaskCard({ task, onOpen, onHandOff, onMove, justHandedOff, today, onCopied, isDragging, onDragStart, onDragEnd }) {
  const due = dueState(task, today);

  return (
    <article
      data-task-id={task.id}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', task.id);
        e.dataTransfer.effectAllowed = 'move';
        onDragStart(task);
      }}
      onDragEnd={onDragEnd}
      className={`relative cursor-grab rounded-md active:cursor-grabbing ${isDragging ? 'opacity-50' : ''} border border-l-4 border-slate-200 p-3 ${DUE_STYLES[due.state].card} transition-shadow duration-200 hover:border-y-slate-400 hover:border-r-slate-400 focus-within:ring-2 focus-within:ring-brand-primary ${typeStyle(task.type).stripe} ${
        justHandedOff ? 'ring-2 ring-brand-accent' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 text-sm font-medium text-slate-900 [overflow-wrap:anywhere]">
          <button
            type="button"
            onClick={() => onOpen(task.id)}
            aria-label={`View ${task.title}`}
            className="text-left after:absolute after:inset-0 after:content-[''] focus:outline-none"
          >
            {task.title}
          </button>
        </h3>
        <TypeBadge type={task.type} />
      </div>

      {due.state !== 'none' && (
        <div className="mt-2">
          <DueChip due={due} />
        </div>
      )}

      <CardActions task={task} onHandOff={onHandOff} onMove={onMove} onCopied={onCopied} />
    </article>
  );
}
