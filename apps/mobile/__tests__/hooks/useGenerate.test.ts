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

import { apiSSE, apiPost, apiGet } from '../../lib/api';

describe('useGenerate hook API calls', () => {
  describe('startGeneration (SSE)', () => {
    it('POST /api/generate with session_id, styles, and angles', async () => {
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(
            'data: {"type":"generation_completed","generation_id":"g1","style_group":1,"angle":"front","photo_url":"https://signed/url"}\n\n',
          ));
          controller.enqueue(encoder.encode('data: {"type":"all_completed"}\n\n'));
          controller.close();
        },
      });

      mockFetch.mockResolvedValue({ ok: true, body: readable });

      const events: Record<string, unknown>[] = [];
      let completed = false;

      await apiSSE(
        '/api/generate',
        {
          session_id: 'sess-1',
          styles: [{ simulation_mode: 'style', reference_type: 'catalog', catalog_item_id: 'ci-1' }],
          angles: ['front', 'side'],
        },
        {
          onEvent: (e) => events.push(e),
          onComplete: () => { completed = true; },
        },
      );

      expect(events).toHaveLength(2);
      expect(events[0].type).toBe('generation_completed');
      expect(events[0].photo_url).toBe('https://signed/url');
      expect(events[1].type).toBe('all_completed');
      expect(completed).toBe(true);

      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toContain('/api/generate');
      expect(opts.method).toBe('POST');
      const body = JSON.parse(opts.body);
      expect(body.session_id).toBe('sess-1');
      expect(body.styles).toHaveLength(1);
      expect(body.angles).toEqual(['front', 'side']);
    });
  });

  describe('retryGeneration', () => {
    it('POST /api/sessions/:id/generations/:genId/retry', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          generation_id: 'gen-1',
          status: 'completed',
          photo_url: 'https://signed/retry-url',
          ai_latency_ms: 2500,
        }),
      });

      const result = await apiPost<{
        generation_id: string;
        status: string;
        photo_url: string;
      }>('/api/sessions/sess-1/generations/gen-1/retry');

      expect(result.generation_id).toBe('gen-1');
      expect(result.status).toBe('completed');
      expect(result.photo_url).toContain('retry-url');

      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toContain('/api/sessions/sess-1/generations/gen-1/retry');
      expect(opts.method).toBe('POST');
    });

    it('handles retry failure gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 502,
        statusText: 'Bad Gateway',
        json: () => Promise.resolve({ message: 'AI generation failed' }),
      });

      await expect(
        apiPost('/api/sessions/sess-1/generations/gen-1/retry'),
      ).rejects.toThrow('AI generation failed');
    });

    it('returns 409 when retrying non-failed generation', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 409,
        statusText: 'Conflict',
        json: () => Promise.resolve({ message: 'Cannot retry: status is "completed"' }),
      });

      await expect(
        apiPost('/api/sessions/sess-1/generations/gen-1/retry'),
      ).rejects.toThrow('Cannot retry');
    });
  });

  describe('syncFromDB (polling fallback)', () => {
    it('GET /api/sessions/:id fetches generation statuses', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          session: {
            id: 'sess-1',
            session_generations: [
              { id: 'g1', style_group: 1, angle: 'front', status: 'completed', photo_url: 'https://url1', generated_photo_path: 'p1' },
              { id: 'g2', style_group: 1, angle: 'side', status: 'generating', photo_url: null, generated_photo_path: null },
              { id: 'g3', style_group: 1, angle: 'back', status: 'failed', photo_url: null, generated_photo_path: null },
            ],
          },
        }),
      });

      const result = await apiGet<{
        session: { session_generations: { status: string }[] };
      }>('/api/sessions/sess-1');

      const gens = result.session.session_generations;
      expect(gens).toHaveLength(3);

      const completed = gens.filter((g) => g.status === 'completed');
      const generating = gens.filter((g) => g.status === 'generating');
      const failed = gens.filter((g) => g.status === 'failed');

      expect(completed).toHaveLength(1);
      expect(generating).toHaveLength(1);
      expect(failed).toHaveLength(1);
    });
  });
});
