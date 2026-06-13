import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export function useUnreadNotificationCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .is('read_at', null)
      .then(({ count: c }) => {
        setCount(c ?? 0);
      });
  }, []);

  return count;
}
