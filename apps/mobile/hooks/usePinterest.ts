import { useState, useCallback } from 'react';
import { apiPost } from '../lib/api';

interface PinterestImage {
  url: string;
  storagePath?: string;
  signedUrl?: string;
}

export function usePinterest(sessionId: string | null) {
  const [loading, setLoading] = useState(false);

  const proxyImage = useCallback(
    async (imageUrl: string): Promise<PinterestImage | null> => {
      if (!sessionId) return null;
      setLoading(true);
      try {
        const res = await apiPost<{ storage_path: string; url: string }>('/api/proxy-image', {
          url: imageUrl,
          session_id: sessionId,
        });
        return {
          url: imageUrl,
          storagePath: res.storage_path,
          signedUrl: res.url,
        };
      } catch (err) {
        console.error('Failed to proxy Pinterest image:', err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [sessionId],
  );

  return { loading, proxyImage };
}
