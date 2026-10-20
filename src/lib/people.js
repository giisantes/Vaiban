import { TEAM } from '../constants.js';

/**
 * Avatar background for each person, in TEAM order. All pass WCAG AA
 * with white initials (6:1 or better) and avoid the feature-blue and
 * bug-red type colours, so an avatar is never mistaken for a type marker.
 * Full class strings so Tailwind generates them.
 */
const AVATAR_COLOURS = ['bg-[#334155]', 'bg-[#6B3FA0]', 'bg-[#1F6F5C]', 'bg-[#8A4B12]'];

/** "Teammate A" → "TA", "Ghassan" → "GH", "" → "?" */
export function initials(name) {
  const words = (name || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

/** Stable avatar colour for a person: by their place in TEAM. */
export function avatarColour(name) {
  const index = TEAM.indexOf(name);
  return AVATAR_COLOURS[(index >= 0 ? index : 0) % AVATAR_COLOURS.length];
}
