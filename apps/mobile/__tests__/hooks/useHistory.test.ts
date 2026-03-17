import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      }),
    },
  },
}));

const originalFetch = global.fetch;
let mockFetch: ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockFetch = vi.fn();
  global.fetch = mockFetch as unknown as typeof fetch;
});

afterEach(() => {
  global.fetch = originalFetch;
});

import { apiGet } from '../../lib/api';

describe('useHistory hook API calls', () => {
  it('GET /api/sessions with pagination params', async () => {
    const mockResponse = {
      sessions: [
        { id: 'sess-1', created_at: '2026-03-18T10:00:00Z', generation_count: 5, first_front_photo: null },
        { id: 'sess-2', created_at: '2026-03-17T10:00:00Z', generation_count: 3, first_front_photo: 'https://url' },
      ],
      total: 2,
      page: 1,
      limit: 20,
    };
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await apiGet<typeof mockResponse>('/api/sessions?page=1&limit=20');

    expect(result.sessions).toHaveLength(2);
    expect(result.page).toBe(1);
    expect(result.total).toBe(2);

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('page=1');
    expect(url).toContain('limit=20');
  });

  it('GET /api/sessions page 2 for loadMore', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ sessions: [], total: 2, page: 2, limit: 20 }),
    });

    const result = await apiGet<{ sessions: unknown[]; page: number }>('/api/sessions?page=2&limit=20');
    expect(result.page).toBe(2);
    expect(result.sessions).toHaveLength(0);
  });
});
