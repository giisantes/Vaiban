import { useEffect } from 'react';

/**
 * Closes a pop-up menu when the user clicks outside it or presses Escape.
 * Shared by every small menu, instead of copying the same code into each.
 *
 * @param {{ current: HTMLElement | null }} ref  the menu's wrapper element
 * @param {boolean} open                         whether the menu is open
 * @param {() => void} close                     closes the menu
 */
export function useDismiss(ref, open, close) {
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) close();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [ref, open, close]);
}
