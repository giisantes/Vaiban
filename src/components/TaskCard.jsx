import { DUE_STYLES, dueState } from '../lib/dueState.js';
import { useLibraryContext } from '../lib/libraryRoute.js';
import { useMilestones } from '../lib/milestones.js';
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
  // D7 / FR36: the card says when prompts have been saved for this task.
  const milestone = useMilestones().find((m) => m.id === task.milestoneId); // D79
  const promptCount = useLibraryContext().prompts.filter((p) => p.boardId === task.projectId && p.taskIds.includes(task.id)).length;

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

      {(due.state !== 'none' || promptCount > 0 || milestone) && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {milestone && (
            <span className="inline-flex max-w-full items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-800 [overflow-wrap:anywhere]">
              <span aria-hidden="true" className="text-brand-primary">◆</span>
              <span className="sr-only">Milestone: </span>{milestone.name}
            </span>
          )}
          {due.state !== 'none' && <DueChip due={due} />}
          {promptCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-700">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 5h16M4 12h10M4 19h7" />
              </svg>
              {promptCount} {promptCount === 1 ? 'prompt' : 'prompts'}
            </span>
          )}
        </div>
      )}

      <CardActions task={task} onHandOff={onHandOff} onMove={onMove} onCopied={onCopied} />
    </article>
  );
}
