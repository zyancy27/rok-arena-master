import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const STORAGE_KEY = 'rok-activity-last-pinged';

/**
 * Pings the backend once per UTC day to record an active day for the current user.
 * After 5 active days, reserved founders are auto-promoted to founder status server-side.
 */
export function useActivityTracker() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    const today = new Date().toISOString().slice(0, 10);
    const last = localStorage.getItem(STORAGE_KEY);
    if (last === today) return;

    supabase.rpc('record_user_activity').then(({ error }) => {
      if (!error) localStorage.setItem(STORAGE_KEY, today);
    });
  }, [user]);
}
