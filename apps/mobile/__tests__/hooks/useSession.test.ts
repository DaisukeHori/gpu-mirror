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

import { apiPost, apiPatch, apiGet } from '../../lib/api';

describe('useSession hook API calls', () => {
  describe('createSession flow', () => {
    it('POST /api/sessions with customer_photo_path', async () => {
      const mockSession = { id: 'sess-1', staff_id: 'staff-1', customer_photo_path: 'pending' };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ session: mockSession }),
      });

      const result = await apiPost<{ session: typeof mockSession }>('/api/sessions', {
        customer_photo_path: 'pending',
      });

      expect(result.session.id).toBe('sess-1');
      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toContain('/api/sessions');
      expect(opts.method).toBe('POST');
      expect(opts.headers.Authorization).toBe('Bearer test-token');
    });
  });

  describe('loadSession flow', () => {
    it('GET /api/sessions/:id returns session with generations', async () => {
      const mockSession = {
        id: 'sess-1',
        session_generations: [
          { id: 'g1', angle: 'front', status: 'completed', photo_url: 'https://signed/url' },
        ],
        customer_photo_url: 'https://signed/customer-url',
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ session: mockSession }),
      });

      const result = await apiGet<{ session: typeof mockSession }>('/api/sessions/sess-1');

      expect(result.session.session_generations).toHaveLength(1);
      expect(result.session.customer_photo_url).toBeDefined();
    });
  });

  describe('closeSession flow', () => {
    it('PATCH /api/sessions/:id with is_closed=true', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ session: { id: 'sess-1', is_closed: true } }),
      });

      const result = await apiPatch<{ session: { is_closed: boolean } }>('/api/sessions/sess-1', {
        is_closed: true,
      });

      expect(result.session.is_closed).toBe(true);
      const [, opts] = mockFetch.mock.calls[0];
      expect(opts.method).toBe('PATCH');
      expect(JSON.parse(opts.body).is_closed).toBe(true);
    });
  });
});
