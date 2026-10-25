import { createContext, useContext } from 'react';
import { dueState } from './dueState.js';

/**
 * Milestones (FR14, FR17 – D79): named goals on a board, each with an
 * optional target date. A task belongs to at most one (`task.milestoneId`),
 * and a milestone's progress is how many of its tasks are Done.
 *
 * @typedef {Object} Milestone
 * @property {string} id
 * @property {string} name
 * @property {string|null} dueDate   ISO 'YYYY-MM-DD', optional
 */

export const MILESTONE_LIMITS = { name: 60, count: 50 };

const newId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID ? `ms-${crypto.randomUUID()}` : `ms-${Date.now()}${Math.random().toString(36).slice(2, 7)}`;

/** Factory, like createTask() and createProject() (P4). */
export function createMilestone(fields = {}) {
  return { id: newId(), name: '', dueDate: null, ...fields };
}

/** The open board's milestones, read by cards and the task window (like PeopleContext, D64). */
export const MilestonesContext = createContext([]);
export const useMilestones = () => useContext(MilestonesContext);

/**
 * @param {Milestone} milestone
 * @param {object[]} tasks   the board's tasks
 * @param {string} today
 * @returns {{ total: number, done: number, percent: number, complete: boolean, overdueTasks: number, due: { state: string, label: string } }}
 */
export function milestoneProgress(milestone, tasks, today) {
  const mine = tasks.filter((t) => t.milestoneId === milestone.id);
  const done = mine.filter((t) => t.status === 'done').length;
  const complete = mine.length > 0 && done === mine.length;
  return {
    total: mine.length,
    done,
    percent: mine.length ? Math.round((done / mine.length) * 100) : 0,
    complete,
    overdueTasks: mine.filter((t) => dueState(t, today).state === 'overdue').length,
    // the milestone's own date reads like a task's: "Due in 3 days", "Overdue by 1 day"…
    due: dueState({ dueDate: milestone.dueDate, status: complete ? 'done' : 'todo' }, today),
  };
}
