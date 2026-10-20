import { STAGES, TASK_TYPES } from '../constants.js';

/**
 * Turns a task into a Markdown briefing to paste into an AI chat (M10).
 * Kept separate from the UI so the format lives in one place and can be
 * tested on its own.
 */

const longDate = (iso) =>
  new Date(iso.length === 10 ? iso + 'T00:00:00' : iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

const labelOf = (list, id) => list.find((item) => item.id === id)?.label ?? id;

/**
 * Removes Markdown headings that have nothing under them – e.g. the
 * unfilled parts of the M9 template – so the pasted briefing has no gaps.
 *
 * @param {string} markdown
 * @returns {string}
 */
export function dropEmptySections(markdown) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^#{1,6}\s/.test(lines[i])) {
      let j = i + 1;
      while (j < lines.length && !/^#{1,6}\s/.test(lines[j])) {
        if (lines[j].trim()) break;
        j++;
      }
      const empty = j >= lines.length || /^#{1,6}\s/.test(lines[j]);
      if (empty) { i = j - 1; continue; }
    }
    out.push(lines[i]);
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** Pushes every heading down one level, so the user's "## Background" sits under "## Context". */
const demoteHeadings = (markdown) => markdown.replace(/^(#{1,5})\s/gm, '#$1 ');

/**
 * @param {import('./createTask.js').Task} task
 * @returns {string} Markdown briefing
 */
export function formatContext(task) {
  const facts = [
    `**Type:** ${labelOf(TASK_TYPES, task.type)}`,
    `**Status:** ${labelOf(STAGES, task.status)}`,
    `**Owner:** ${task.assignee || 'Unassigned'}`,
  ];
  if (task.dueDate) facts.push(`**Due:** ${longDate(task.dueDate)}`);

  const context = dropEmptySections(task.context || '');
  const parts = [
    `# Task: ${task.title.trim() || 'Untitled task'}`,
    facts.join(' · '),
  ];
  if (task.description?.trim()) parts.push(`## Description\n${task.description.trim()}`);
  parts.push(`## Context\n${context ? demoteHeadings(context) : '_No context written yet._'}`);

  const source = [];
  if (task.contextTool) source.push(`last worked on with ${task.contextTool}`);
  if (task.contextUpdatedAt) source.push(`context updated ${longDate(task.contextUpdatedAt)}`);
  if (source.length) parts.push(`_${source.join(', ').replace(/^./, (c) => c.toUpperCase())}._`);

  parts.push('---\nPlease read this briefing and help me pick up the task from where it leaves off.');
  return parts.join('\n\n') + '\n';
}
