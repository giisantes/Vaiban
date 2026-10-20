import { useEffect, useState } from 'react';
import { todayISO } from '../lib/createTask.js';

/**
 * Today's ISO date that updates by itself when the date changes (checked
 * once a minute), so due-date colours move on without a reload (M8).
 *
 * @returns {string} 'YYYY-MM-DD'
 */
export function useToday() {
  const [today, setToday] = useState(todayISO);
  useEffect(() => {
    const timer = setInterval(() => setToday(todayISO()), 60_000);
    return () => clearInterval(timer);
  }, []);
  return today;
}
