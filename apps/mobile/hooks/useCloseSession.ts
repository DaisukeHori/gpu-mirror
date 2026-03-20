import { useCallback } from 'react';
import { router } from 'expo-router';
import { apiPatch } from '../lib/api';
import { clearStoredSelectedStyles } from '../lib/style-selection-store';

export function useCloseSession(sessionId: string | undefined) {
  return useCallback(async () => {
    if (sessionId) {
      await apiPatch(`/api/sessions/${sessionId}`, { is_closed: true }).catch(() => {});
    }
    clearStoredSelectedStyles(sessionId);
    router.replace('/(main)');
  }, [sessionId]);
}
