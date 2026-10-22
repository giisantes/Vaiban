import { useState } from 'react';
import { STAGES } from '../constants.js';
import Column from './Column.jsx';

/**
 * The Kanban board: one column per stage, each showing the tasks whose
 * status matches the column id.
 * M12: remembers which card is being dragged, so columns can show where
 * it can be dropped.
 *
 * @param {{
 *   tasks: import('../lib/createTask.js').Task[],
 *   onOpenTask: (id: string) => void,
 *   onHandOff: (id: string, name: string) => void,
 *   onMoveTask: (id: string, status: string, how?: object) => void,
 *   highlightId: string | null,
 *   today: string,
 *   onCopied: (ok: boolean) => void,
 * }} props
 */
export default function Board({ tasks, onOpenTask, onHandOff, onMoveTask, highlightId, today, onCopied }) {
  const [dragging, setDragging] = useState(null); // the task being dragged, or null

  return (
    // One column on narrow screens or high zoom, two on tablets, four on desktop –
    // so nothing has to scroll sideways at 400% zoom (WCAG 2.2 SC 1.4.10 Reflow).
    <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {STAGES.map((stage) => (
        <Column
          key={stage.id}
          stage={stage}
          tasks={tasks.filter((task) => task.status === stage.id)}
          onOpenTask={onOpenTask}
          onHandOff={onHandOff}
          onMoveTask={onMoveTask}
          highlightId={highlightId}
          today={today}
          onCopied={onCopied}
          dragging={dragging}
          onDragStart={setDragging}
          onDragEnd={() => setDragging(null)}
          onDrop={(id) => { setDragging(null); onMoveTask(id, stage.id); }}
        />
      ))}
    </div>
  );
}
