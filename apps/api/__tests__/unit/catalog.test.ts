import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';
import { createRequest, parseResponse } from '../helpers/request';

const { mockRange, mockInsertSingle, mockAuth, mockSignedUrl } = vi.hoisted(() => ({
  mockRange: vi.fn(),
  mockInsertSingle: vi.fn(),
  mockAuth: vi.fn(),
  mockSignedUrl: vi.fn().mockResolvedValue({
    data: { signedUrl: 'https://test.supabase.co/signed/catalog.jpg' },
  }),
}));

vi.mock('../../lib/supabase-admin', () => {
  const chainable = () => {
    const chain: Record<string, unknown> = {};
    const methods = ['select', 'eq', 'neq', 'ilike', 'order', 'limit', 'in', 'is', 'filter'];
    for (const m of methods) {
      chain[m] = vi.fn().mockReturnValue(chain);
    }
    chain.single = vi.fn().mockResolvedValue({ data: null, error: null });
    chain.range = mockRange;
    return chain;
  };

  return {
    supabaseAdmin: {
      from: vi.fn().mockImplementation(() => {
        const c = chainable();
        (c as Record<string, unknown>).insert = vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({ single: mockInsertSingle }),
        });
        return c;
      }),
      storage: {
        from: vi.fn().mockReturnValue({ createSignedUrl: mockSignedUrl }),
      },
      auth: { getUser: vi.fn() },
    },
    getSupabaseAdmin: vi.fn(),
  };
});

vi.mock('../../lib/auth', () => ({
  authenticate: mockAuth,
  requireAdmin: vi.fn().mockReturnValue(null),
}));

import { GET, POST } from '../../app/api/catalog/route';

describe('GET /api/catalog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      userId: 'user-1', staffId: 'staff-1', role: 'stylist', storeCode: 'store-001',
    });
  });

  it('returns catalog items with signed URLs', async () => {
    mockRange.mockResolvedValue({
      data: [
        { id: 'ci-1', title: 'ショートボブ', image_path: 'short.jpg', thumbnail_path: 'short_thumb.jpg', tags: ['ボブ'] },
        { id: 'ci-2', title: 'ロング', image_path: 'long.jpg', thumbnail_path: null, tags: ['ロング'] },
      ],
      error: null,
      count: 2,
    });

    const req = createRequest('/api/catalog?sort=popularity&limit=30');
    const res = await GET(req);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(200);
    expect(body.items).toHaveLength(2);
    expect(body.items[0].image_url).toBeDefined();
    expect(body.items[0].thumbnail_url).toBeDefined();
    expect(body.total).toBe(2);
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValueOnce(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    );

    const req = createRequest('/api/catalog');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns 500 on database error', async () => {
    mockRange.mockResolvedValue({ data: null, error: { message: 'DB error' }, count: null });

    const req = createRequest('/api/catalog');
    const res = await GET(req);
    expect(res.status).toBe(500);
  });

  it('returns empty items when no catalog entries', async () => {
    mockRange.mockResolvedValue({ data: [], error: null, count: 0 });

    const req = createRequest('/api/catalog');
    const res = await GET(req);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(200);
    expect(body.items).toEqual([]);
    expect(body.total).toBe(0);
  });
});

describe('POST /api/catalog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      userId: 'user-1', staffId: 'staff-1', role: 'admin', storeCode: 'store-001',
    });
  });

  it('creates a catalog item', async () => {
    const mockItem = {
      id: 'ci-new',
      title: '新スタイル',
      image_path: 'new.jpg',
      category_id: 'cat-1',
    };
    mockInsertSingle.mockResolvedValue({ data: mockItem, error: null });

    const req = createRequest('/api/catalog', {
      method: 'POST',
      body: { title: '新スタイル', image_path: 'new.jpg', category_id: 'cat-1' },
    });
    const res = await POST(req);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(201);
    expect(body.item.title).toBe('新スタイル');
  });

  it('returns 500 on insert error', async () => {
    mockInsertSingle.mockResolvedValue({ data: null, error: { message: 'Duplicate' } });

    const req = createRequest('/api/catalog', {
      method: 'POST',
      body: { title: 'test', image_path: 'test.jpg' },
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});
