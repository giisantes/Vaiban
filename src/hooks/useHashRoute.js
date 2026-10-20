import { useCallback, useEffect, useState } from 'react';

/**
 * Tiny router using the URL hash, so the browser's Back button and a page
 * reload both keep you on the same screen – no routing library needed.
 *
 *   #/                 → home (all projects)
 *   #/project/<id>     → that project's board
 *
 * @returns {[string | null, (projectId: string | null) => void]}
 *          the open project's id (null = home), and a function to navigate
 */
export function useHashRoute() {
  const read = () => {
    const match = window.location.hash.match(/^#\/project\/(.+)$/);
    return match ? decodeURIComponent(match[1]) : null;
  };
  const [projectId, setProjectId] = useState(read);

  useEffect(() => {
    const onChange = () => setProjectId(read());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((id) => {
    window.location.hash = id ? `/project/${encodeURIComponent(id)}` : '/';
  }, []);

  return [projectId, navigate];
}
