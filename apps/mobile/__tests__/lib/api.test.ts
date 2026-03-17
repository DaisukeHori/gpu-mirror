import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token-123' } },
      }),
    },
  },
}));

import { apiGet, apiPost, apiPatch, apiDelete, uploadFile, apiSSE } from '../../lib/api';

const originalFetch = global.fetch;

describe('api.ts', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('apiGet', () => {
    it('sends GET request with auth headers', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
      });

      const result = await apiGet('/api/colors');

      expect(mockFetch).toHaveBeenCalledOnce();
      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toContain('/api/colors');
      expect(opts.headers.Authorization).toBe('Bearer test-token-123');
      expect(result).toEqual({ data: 'test' });
    });

    it('throws on non-ok response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve({ message: 'Session not found' }),
      });

      await expect(apiGet('/api/sessions/bad-id')).rejects.toThrow('Session not found');
    });
  });

  describe('apiPost', () => {
    it('sends POST request with JSON body', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ session: { id: 'sess-1' } }),
      });

      const result = await apiPost('/api/sessions', { customer_photo_path: 'pending' });

      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toContain('/api/sessions');
      expect(opts.method).toBe('POST');
      expect(JSON.parse(opts.body)).toEqual({ customer_photo_path: 'pending' });
      expect(result).toEqual({ session: { id: 'sess-1' } });
    });

    it('sends POST request without body', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ ok: true }),
      });

      await apiPost('/api/sessions/sess-1/generations/gen-1/retry');

      const [, opts] = mockFetch.mock.calls[0];
      expect(opts.method).toBe('POST');
      expect(opts.body).toBeUndefined();
    });
  });

  describe('apiPatch', () => {
    it('sends PATCH request', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ session: { is_closed: true } }),
      });

      const result = await apiPatch('/api/sessions/sess-1', { is_closed: true });

      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toContain('/api/sessions/sess-1');
      expect(opts.method).toBe('PATCH');
      expect(JSON.parse(opts.body)).toEqual({ is_closed: true });
      expect(result).toEqual({ session: { is_closed: true } });
    });
  });

  describe('apiDelete', () => {
    it('sends DELETE request', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      await apiDelete('/api/catalog/item-1');

      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toContain('/api/catalog/item-1');
      expect(opts.method).toBe('DELETE');
    });

    it('throws on non-ok response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: () => Promise.resolve({ message: 'Admin access required' }),
      });

      await expect(apiDelete('/api/catalog/item-1')).rejects.toThrow('Admin access required');
    });
  });

  describe('uploadFile', () => {
    it('sends FormData with file', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ storage_path: 'sess-1/photo.jpg', url: 'https://signed-url' }),
      });

      const file = { uri: 'file://photo.jpg', name: 'photo.jpg', type: 'image/jpeg' };
      const result = await uploadFile('/api/upload', file, 'sess-1');

      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toContain('/api/upload');
      expect(opts.method).toBe('POST');
      expect(opts.body).toBeInstanceOf(FormData);
      expect(result.storage_path).toBe('sess-1/photo.jpg');
    });
  });

  describe('apiSSE', () => {
    it('parses SSE events from stream', async () => {
      const events: Record<string, unknown>[] = [];
      let completed = false;

      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('data: {"type":"generation_completed","generation_id":"g1","angle":"front"}\n\n'));
          controller.enqueue(encoder.encode('data: {"type":"generation_completed","generation_id":"g2","angle":"side"}\n\n'));
          controller.enqueue(encoder.encode('data: {"type":"all_completed"}\n\n'));
          controller.close();
        },
      });

      mockFetch.mockResolvedValue({
        ok: true,
        body: readable,
        json: () => Promise.resolve({}),
      });

      await apiSSE(
        '/api/generate',
        { session_id: 'sess-1', styles: [] },
        {
          onEvent: (event) => events.push(event),
          onComplete: () => { completed = true; },
        },
      );

      expect(events).toHaveLength(3);
      expect(events[0].type).toBe('generation_completed');
      expect(events[1].type).toBe('generation_completed');
      expect(events[2].type).toBe('all_completed');
      expect(completed).toBe(true);
    });

    it('calls onError when fetch fails', async () => {
      let receivedError: Error | null = null;

      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({ message: 'Server error' }),
      });

      await apiSSE(
        '/api/generate',
        { session_id: 'sess-1', styles: [] },
        {
          onEvent: () => {},
          onError: (err) => { receivedError = err; },
        },
      );

      expect(receivedError).not.toBeNull();
      expect(receivedError!.message).toBe('Server error');
    });

    it('handles heartbeat comments gracefully', async () => {
      const events: Record<string, unknown>[] = [];

      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
          controller.enqueue(encoder.encode('data: {"type":"generation_completed","generation_id":"g1"}\n\n'));
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
          controller.enqueue(encoder.encode('data: {"type":"all_completed"}\n\n'));
          controller.close();
        },
      });

      mockFetch.mockResolvedValue({ ok: true, body: readable });

      await apiSSE(
        '/api/generate',
        { session_id: 'sess-1', styles: [] },
        { onEvent: (e) => events.push(e) },
      );

      expect(events).toHaveLength(2);
    });
  });
});
