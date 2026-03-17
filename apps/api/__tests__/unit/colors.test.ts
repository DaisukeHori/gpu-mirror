import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';
import { createRequest, parseResponse } from '../helpers/request';

const { mockOrder, mockAuth } = vi.hoisted(() => ({
  mockOrder: vi.fn(),
  mockAuth: vi.fn(),
}));

vi.mock('../../lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: mockOrder,
        }),
      }),
    }),
    storage: { from: vi.fn() },
    auth: { getUser: vi.fn() },
  },
  getSupabaseAdmin: vi.fn(),
}));

vi.mock('../../lib/auth', () => ({
  authenticate: mockAuth,
  requireAdmin: vi.fn().mockReturnValue(null),
}));

import { GET } from '../../app/api/colors/route';

describe('GET /api/colors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      userId: 'user-1', staffId: 'staff-1', role: 'stylist', storeCode: 'store-001',
    });
  });

  it('returns color list on success', async () => {
    const mockColors = [
      { id: 'c1', name: 'アッシュベージュ', hex_code: '#C8956C', color_family: 'ベージュ系' },
      { id: 'c2', name: 'ダークブラウン', hex_code: '#3B2819', color_family: 'ブラウン系' },
    ];
    mockOrder.mockResolvedValue({ data: mockColors, error: null });

    const req = createRequest('/api/colors');
    const res = await GET(req);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(200);
    expect(body.colors).toHaveLength(2);
    expect(body.colors[0].name).toBe('アッシュベージュ');
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValueOnce(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    );

    const req = createRequest('/api/colors');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns 500 on database error', async () => {
    mockOrder.mockResolvedValue({ data: null, error: { message: 'Connection refused' } });

    const req = createRequest('/api/colors');
    const res = await GET(req);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(500);
    expect(body.message).toBe('Connection refused');
  });

  it('returns empty array when no colors exist', async () => {
    mockOrder.mockResolvedValue({ data: [], error: null });

    const req = createRequest('/api/colors');
    const res = await GET(req);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(200);
    expect(body.colors).toEqual([]);
  });
});
