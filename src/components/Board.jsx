import { STAGES } from '../constants.js';
import Column from './Column.jsx';

/**
 * The Kanban board: one column per stage, each showing the tasks whose
 * status matches the column id.
 *
 * @param {{ tasks: import('../lib/createTask.js').Task[] }} props
 */
export default function Board({ tasks }) {
  return (
    <main className="grid grid-cols-4 gap-4">
      {STAGES.map((stage) => (
        <Column
          key={stage.id}
          stage={stage}
          tasks={tasks.filter((task) => task.status === stage.id)}
        />
      ))}
    </main>
  );
}
