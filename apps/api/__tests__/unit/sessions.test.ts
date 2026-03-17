import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';
import { createRequest, parseResponse } from '../helpers/request';

const { mockInsertSingle, mockSelectRange, mockAuth, mockSignedUrl } = vi.hoisted(() => ({
  mockInsertSingle: vi.fn(),
  mockSelectRange: vi.fn(),
  mockAuth: vi.fn(),
  mockSignedUrl: vi.fn().mockResolvedValue({
    data: { signedUrl: 'https://test.supabase.co/signed/photo.jpg' },
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
    chain.range = mockSelectRange;
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

import { POST, GET } from '../../app/api/sessions/route';

describe('POST /api/sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      userId: 'user-1', staffId: 'staff-1', role: 'stylist', storeCode: 'store-001',
    });
  });

  it('returns 400 when customer_photo_path is missing', async () => {
    const req = createRequest('/api/sessions', { method: 'POST', body: {} });
    const res = await POST(req);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(400);
    expect(body.message).toContain('customer_photo_path');
  });

  it('returns 201 with session on success', async () => {
    const mockSession = { id: 'sess-1', staff_id: 'staff-1', customer_photo_path: 'pending' };
    mockInsertSingle.mockResolvedValue({ data: mockSession, error: null });

    const req = createRequest('/api/sessions', {
      method: 'POST',
      body: { customer_photo_path: 'pending' },
    });
    const res = await POST(req);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(201);
    expect(body.session.id).toBe('sess-1');
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValueOnce(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    );
    const req = createRequest('/api/sessions', {
      method: 'POST',
      body: { customer_photo_path: 'pending' },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 500 on database error', async () => {
    mockInsertSingle.mockResolvedValue({ data: null, error: { message: 'DB error' } });
    const req = createRequest('/api/sessions', {
      method: 'POST',
      body: { customer_photo_path: 'pending' },
    });
    const res = await POST(req);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(500);
    expect(body.message).toBe('DB error');
  });
});

describe('GET /api/sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      userId: 'user-1', staffId: 'staff-1', role: 'stylist', storeCode: 'store-001',
    });
  });

  it('returns paginated sessions list (as admin to skip eq filter)', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user-1', staffId: 'staff-1', role: 'admin', storeCode: 'store-001',
    });
    mockSelectRange.mockResolvedValue({
      data: [
        {
          id: 'sess-1',
          created_at: '2026-03-18T10:00:00Z',
          session_generations: [
            { id: 'g1', style_group: 1, angle: 'front', generated_photo_path: 'path/1.jpg', status: 'completed' },
          ],
        },
      ],
      error: null,
      count: 1,
    });

    const req = createRequest('/api/sessions?page=1&limit=20');
    const res = await GET(req);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(200);
    expect(body.sessions).toBeDefined();
    expect(body.page).toBe(1);
    expect(body.limit).toBe(20);
  });
});
