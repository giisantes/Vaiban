/**
 * Copies text to the clipboard. Uses the modern Clipboard API, and falls
 * back to a hidden textarea + execCommand where that isn't available
 * (e.g. a page opened over plain http on another device).
 *
 * @param {string} text
 * @returns {Promise<boolean>} true if it worked
 */
export async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the fallback */
  }
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  } catch {
    return false;
  }
}
