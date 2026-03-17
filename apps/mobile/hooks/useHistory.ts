import { useState, useCallback } from 'react';
import { apiGet } from '../lib/api';

interface SessionSummary {
  id: string;
  created_at: string;
  is_closed: boolean;
  generation_count: number;
  first_front_photo: string | null;
}

export function useHistory() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchSessions = useCallback(async (pageNum: number = 1) => {
    setLoading(true);
    try {
      const res = await apiGet<{
        sessions: SessionSummary[];
        total: number;
        page: number;
        limit: number;
      }>(`/api/sessions?page=${pageNum}&limit=20`);

      if (pageNum === 1) {
        setSessions(res.sessions);
      } else {
        setSessions((prev) => [...prev, ...res.sessions]);
      }
      setPage(pageNum);
      setHasMore(res.sessions.length >= res.limit);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchSessions(page + 1);
    }
  }, [loading, hasMore, page, fetchSessions]);

  const refresh = useCallback(() => {
    fetchSessions(1);
  }, [fetchSessions]);

  return { sessions, loading, hasMore, fetchSessions, loadMore, refresh };
}
