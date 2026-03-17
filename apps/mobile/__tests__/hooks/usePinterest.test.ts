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

import { apiPost } from '../../lib/api';

describe('usePinterest hook API calls', () => {
  it('POST /api/proxy-image with Pinterest URL', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        storage_path: 'sess-1/abc123.jpg',
        url: 'https://test.supabase.co/signed/pinterest-image',
      }),
    });

    const result = await apiPost<{ storage_path: string; url: string }>('/api/proxy-image', {
      url: 'https://i.pinimg.com/originals/abc/def.jpg',
      session_id: 'sess-1',
    });

    expect(result.storage_path).toBe('sess-1/abc123.jpg');
    expect(result.url).toContain('pinterest-image');

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain('/api/proxy-image');
    expect(opts.method).toBe('POST');
    const body = JSON.parse(opts.body);
    expect(body.url).toContain('pinimg.com');
    expect(body.session_id).toBe('sess-1');
  });

  it('rejects non-Pinterest URLs', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: () => Promise.resolve({ message: 'URL not allowed' }),
    });

    await expect(
      apiPost('/api/proxy-image', { url: 'https://evil.com/image.jpg', session_id: 'sess-1' }),
    ).rejects.toThrow('URL not allowed');
  });
});
