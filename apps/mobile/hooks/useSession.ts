import { useState, useCallback } from 'react';
import { apiPost, apiPatch, apiGet } from '../lib/api';

interface Session {
  id: string;
  staff_id: string;
  customer_photo_path: string;
  is_closed: boolean;
  created_at: string;
  generations?: unknown[];
}

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createSession = useCallback(async (customerPhotoPath: string, storeCode?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiPost<{ session: Session }>('/api/sessions', {
        customer_photo_path: customerPhotoPath,
        store_code: storeCode,
      });
      setSession(res.session);
      return res.session;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create session';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSession = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<{ session: Session }>(`/api/sessions/${id}`);
      setSession(res.session);
      return res.session;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load session';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const closeSession = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      await apiPatch(`/api/sessions/${session.id}`, { is_closed: true });
      setSession(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to close session';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [session]);

  return { session, loading, error, createSession, loadSession, closeSession, setSession };
}
