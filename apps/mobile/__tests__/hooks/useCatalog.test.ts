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

describe('useCatalog hook API calls', () => {
  it('GET /api/catalog with sort and limit params', async () => {
    const mockItems = [
      { id: 'ci1', title: 'ショートボブ', image_url: 'https://url1', tags: ['ボブ'] },
      { id: 'ci2', title: 'レイヤーロング', image_url: 'https://url2', tags: ['ロング'] },
    ];
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ items: mockItems, total: 2 }),
    });

    const result = await apiGet<{ items: typeof mockItems }>('/api/catalog?sort=popularity&limit=50');

    expect(result.items).toHaveLength(2);
    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('sort=popularity');
    expect(url).toContain('limit=50');
  });

  it('GET /api/catalog with category filter', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ items: [], total: 0 }),
    });

    await apiGet('/api/catalog?sort=popularity&limit=50&category_id=cat-1');
    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('category_id=cat-1');
  });

  it('GET /api/catalog with created_at sort', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ items: [], total: 0 }),
    });

    await apiGet('/api/catalog?sort=created_at&limit=50');
    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('sort=created_at');
  });
});
