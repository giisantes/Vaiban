/**
 * Copies text to the clipboard, trying three ways in turn:
 *
 * 1. The modern Clipboard API (needs https or localhost, page focus and
 *    permission – it can refuse, e.g. when DevTools has focus).
 * 2. A "copy" event that puts our text straight onto the clipboard.
 *    This needs no selection, so it also works inside the open <dialog>,
 *    where the rest of the page is inert.
 * 3. A hidden textarea, placed inside the open dialog if there is one,
 *    selected and copied. Only counted as success if text was really selected.
 *
 * @param {string} text
 * @returns {Promise<boolean>} true if it worked
 */
export async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* refused – try the fallbacks */
  }

  // 2. copy event
  let viaEvent = false;
  const onCopy = (e) => {
    e.clipboardData.setData('text/plain', text);
    e.preventDefault();
    viaEvent = true;
  };
  document.addEventListener('copy', onCopy);
  try {
    document.execCommand('copy');
  } catch {
    /* ignore */
  } finally {
    document.removeEventListener('copy', onCopy);
  }
  if (viaEvent) return true;

  // 3. hidden textarea
  try {
    const host = document.querySelector('dialog[open]') || document.body;
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.top = '0';
    area.style.opacity = '0';
    host.appendChild(area);
    const previous = document.activeElement;
    area.focus();
    area.select();
    const selected = area.selectionEnd - area.selectionStart === text.length;
    const ok = selected && document.execCommand('copy');
    area.remove();
    previous?.focus?.();
    return ok;
  } catch {
    return false;
  }
}
