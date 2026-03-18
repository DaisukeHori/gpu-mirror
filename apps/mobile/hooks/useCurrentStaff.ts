import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Staff } from '@revol-mirror/shared';

export type CurrentStaff = Pick<Staff, 'id' | 'display_name' | 'email' | 'store_code' | 'role'>;

export function useCurrentStaff() {
  const [staff, setStaff] = useState<CurrentStaff | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setStaff(null);
        return;
      }

      const { data } = await supabase
        .from('staffs')
        .select('id, display_name, email, store_code, role')
        .eq('auth_user_id', user.id)
        .single();

      setStaff(data ?? null);
    } catch {
      setStaff(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    staff,
    loading,
    refresh,
  };
}
