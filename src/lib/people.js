import { createContext, useContext } from 'react';
import { TEAM } from '../constants.js';

/**
 * Avatar background colours. All pass WCAG AA with white initials (6:1 or
 * better) and avoid the feature-blue and bug-red type colours, so an avatar
 * is never mistaken for a type marker. Full class strings so Tailwind
 * generates them.
 */
const AVATAR_COLOURS = ['bg-[#334155]', 'bg-[#6B3FA0]', 'bg-[#1F6F5C]', 'bg-[#8A4B12]', 'bg-[#7A2E5C]', 'bg-[#2F5D2A]'];

/** "Teammate A" → "TA", "Ghassan" → "GH", "" → "?" */
export function initials(name) {
  const words = (name || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

/**
 * Stable avatar colour for a person. The placeholder team keeps its fixed
 * order; real members (shared boards, D64) get a colour worked out from
 * their name, so the same person is the same colour on every screen.
 */
export function avatarColour(name) {
  const index = TEAM.indexOf(name);
  if (index >= 0) return AVATAR_COLOURS[index % AVATAR_COLOURS.length];
  let hash = 0;
  for (const ch of name || '') hash = (hash * 31 + ch.codePointAt(0)) >>> 0;
  return AVATAR_COLOURS[hash % AVATAR_COLOURS.length];
}

/**
 * Who tasks can be assigned to on the board that's open (D64).
 * Browser-only mode: the placeholder TEAM. A cloud board: its active members.
 * Provided once by the workspace and read by the cards and the task window,
 * instead of being passed down through every component in between.
 */
export const PeopleContext = createContext(TEAM);
export const usePeople = () => useContext(PeopleContext);
