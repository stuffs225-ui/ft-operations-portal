import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export function useInboxCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    supabase
      .from('action_inbox_view' as any)
      .select('id', { count: 'exact', head: true })
      .then(({ count: c }) => {
        setCount(c ?? 0);
      });
  }, []);

  return count;
}
