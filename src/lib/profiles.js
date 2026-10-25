import { createContext, useContext } from 'react';

/**
 * Profiles (D77): a picture, a short bio and a link for each account.
 * Teammates on a shared board can see each other's; nobody else can
 * (row-level security in supabase/migrations/006_profiles.sql).
 */

export const PROFILE_LIMITS = { bio: 160, link: 200 };

/**
 * Pictures shown in place of initials, by display name – provided once by
 * the workspace, read by every <Avatar>, like PeopleContext (D64).
 * @type {import('react').Context<Map<string, string>>}
 */
export const AvatarContext = createContext(new Map());
export const useAvatarFor = (name) => useContext(AvatarContext).get(name) || '';

/**
 * "github.com/me" → "https://github.com/me". Only https links are allowed,
 * so a profile can never carry a javascript: or plain-http link.
 * @returns {string} the tidied link, or '' for none
 * @throws {Error} with a message to show under the field
 */
export function normaliseLink(text) {
  const raw = (text || '').trim();
  if (!raw) return '';
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  let url;
  try { url = new URL(withScheme); } catch { throw new Error('That doesn\'t look like a web address, e.g. https://github.com/you'); }
  if (url.protocol !== 'https:') throw new Error('Use a secure link that starts with https://');
  if (!url.hostname.includes('.')) throw new Error('That doesn\'t look like a web address, e.g. https://github.com/you');
  const tidy = url.href;
  if (tidy.length > PROFILE_LIMITS.link) throw new Error(`Use a link of at most ${PROFILE_LIMITS.link} characters.`);
  return tidy;
}

/** "https://github.com/me/" → "github.com/me" for display. */
export const shortLink = (link) => link.replace(/^https:\/\//, '').replace(/\/$/, '');

/**
 * Turns a chosen photo into a small square JPEG (256 × 256, centre-cropped),
 * as a data: URL. Done in the browser, so the original file never leaves it.
 * @param {File} file
 * @returns {Promise<string>}
 */
export async function pictureFromFile(file) {
  if (!file || !/^image\/(jpeg|png|webp|gif)$/.test(file.type)) throw new Error('Choose a JPEG, PNG, WebP or GIF picture.');
  if (file.size > 10 * 1024 * 1024) throw new Error('Choose a picture smaller than 10 MB.');
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("That picture couldn't be opened. Try another one."));
      i.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff'; // transparent PNGs get a white background
    ctx.fillRect(0, 0, 256, 256);
    ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, 256, 256);
    for (const quality of [0.85, 0.7, 0.5]) {
      const data = canvas.toDataURL('image/jpeg', quality);
      if (data.length <= 150000) return data;
    }
    throw new Error('That picture is too detailed to store. Try another one.');
  } finally {
    URL.revokeObjectURL(url);
  }
}
