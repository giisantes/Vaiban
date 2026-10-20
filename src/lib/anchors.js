import { ANCHORS } from '../constants.js';

/**
 * One pinned deliverable slot (PRD §5).
 * @typedef {Object} Anchor
 * @property {'presentation'|'demo'|'report'|'documentation'} id
 * @property {string} label
 * @property {string|null} url
 */

/** The four empty slots, built from ANCHORS. @returns {Anchor[]} */
export function defaultAnchors() {
  return ANCHORS.map(({ id, label }) => ({ id, label, url: null }));
}

/**
 * Tidies what the user typed into a link: trims it and adds "https://"
 * if they left it off (people often paste "docs.google.com/…").
 * Returns null for an empty box, or undefined if it isn't a usable link.
 *
 * @param {string} input
 * @returns {string|null|undefined}
 */
export function normaliseUrl(input) {
  const text = input.trim();
  if (!text) return null;
  const withScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(text) ? text : `https://${text}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;
    if (!url.hostname.includes('.') && url.hostname !== 'localhost') return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}
