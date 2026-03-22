import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';
import { createRequest, parseResponse } from '../helpers/request';

const { mockGetSingle, mockPatchSingle, mockCheckSingle, mockAuth, mockSignedUrl } = vi.hoisted(() => ({
  mockGetSingle: vi.fn(),
  mockPatchSingle: vi.fn(),
  mockCheckSingle: vi.fn(),
  mockAuth: vi.fn(),
  mockSignedUrl: vi.fn().mockResolvedValue({
    data: { signedUrl: 'https://test.supabase.co/signed/photo.jpg' },
  }),
}));

vi.mock('../../lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn().mockImplementation(() => ({
      select: vi.fn().mockImplementation((selectStr: string) => {
        if (selectStr?.includes?.('session_generations')) {
          return { eq: vi.fn().mockReturnValue({ single: mockGetSingle }) };
        }
        return { eq: vi.fn().mockReturnValue({ single: mockCheckSingle }) };
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({ single: mockPatchSingle }),
        }),
      }),
    })),
    storage: {
      from: vi.fn().mockReturnValue({
        createSignedUrl: mockSignedUrl,
        createSignedUrls: vi.fn().mockImplementation((paths: string[], expiresIn: number) =>
          Promise.resolve({
            data: paths.map((p: string) => ({ path: p, signedUrl: `https://test.supabase.co/signed/${p}` })),
          }),
        ),
      }),
    },
    auth: { getUser: vi.fn() },
  },
  getSupabaseAdmin: vi.fn(),
}));

vi.mock('../../lib/auth', () => ({
  authenticate: mockAuth,
  requireAdmin: vi.fn().mockReturnValue(null),
}));

import { GET, PATCH } from '../../app/api/sessions/[id]/route';

describe('GET /api/sessions/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      userId: 'user-1', staffId: 'staff-1', role: 'stylist', storeCode: 'store-001',
    });
  });

  it('returns session with generations and signed URLs', async () => {
    mockGetSingle.mockResolvedValue({
      data: {
        id: 'sess-1',
        staff_id: 'staff-1',
        customer_photo_path: 'sess-1/photo.jpg',
        session_generations: [
          { id: 'g1', angle: 'front', style_group: 1, generated_photo_path: 'sess-1/g1.jpg', status: 'completed' },
          { id: 'g2', angle: 'side', style_group: 1, generated_photo_path: null, status: 'pending' },
        ],
      },
      error: null,
    });

    const req = createRequest('/api/sessions/sess-1');
    const res = await GET(req, { params: Promise.resolve({ id: 'sess-1' }) });
    const { status, body } = await parseResponse(res);

    expect(status).toBe(200);
    expect(body.session.session_generations).toHaveLength(2);
    expect(body.session.customer_photo_url).toBeDefined();
  });

  it('returns 404 when session not found', async () => {
    mockGetSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } });

    const req = createRequest('/api/sessions/nonexistent');
    const res = await GET(req, { params: Promise.resolve({ id: 'nonexistent' }) });
    expect(res.status).toBe(404);
  });

  it('returns 403 when user does not own session', async () => {
    mockGetSingle.mockResolvedValue({
      data: { id: 'sess-1', staff_id: 'other-staff', session_generations: [] },
      error: null,
    });

    const req = createRequest('/api/sessions/sess-1');
    const res = await GET(req, { params: Promise.resolve({ id: 'sess-1' }) });
    expect(res.status).toBe(403);
  });
});

describe('PATCH /api/sessions/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      userId: 'user-1', staffId: 'staff-1', role: 'stylist', storeCode: 'store-001',
    });
    mockCheckSingle.mockResolvedValue({ data: { staff_id: 'staff-1' }, error: null });
  });

  it('closes a session with is_closed=true', async () => {
    mockPatchSingle.mockResolvedValue({
      data: { id: 'sess-1', is_closed: true, closed_at: '2026-03-18T10:00:00Z' },
      error: null,
    });

    const req = createRequest('/api/sessions/sess-1', {
      method: 'PATCH',
      body: { is_closed: true },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'sess-1' }) });
    const { status, body } = await parseResponse(res);

    expect(status).toBe(200);
    expect(body.session.is_closed).toBe(true);
  });

  it('updates customer_photo_path', async () => {
    mockPatchSingle.mockResolvedValue({
      data: { id: 'sess-1', customer_photo_path: 'sess-1/new.jpg' },
      error: null,
    });

    const req = createRequest('/api/sessions/sess-1', {
      method: 'PATCH',
      body: { customer_photo_path: 'sess-1/new.jpg' },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'sess-1' }) });
    const { status, body } = await parseResponse(res);

    expect(status).toBe(200);
    expect(body.session.customer_photo_path).toBe('sess-1/new.jpg');
  });

  it('returns 400 when no valid fields', async () => {
    const req = createRequest('/api/sessions/sess-1', {
      method: 'PATCH',
      body: { random: 'val' },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'sess-1' }) });
    expect(res.status).toBe(400);
  });

  it('returns 404 when session not found', async () => {
    mockCheckSingle.mockResolvedValue({ data: null, error: null });

    const req = createRequest('/api/sessions/sess-1', {
      method: 'PATCH',
      body: { is_closed: true },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'sess-1' }) });
    expect(res.status).toBe(404);
  });

  it('returns 403 when user does not own session', async () => {
    mockCheckSingle.mockResolvedValue({ data: { staff_id: 'other-staff' }, error: null });

    const req = createRequest('/api/sessions/sess-1', {
      method: 'PATCH',
      body: { is_closed: true },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'sess-1' }) });
    expect(res.status).toBe(403);
  });

  it('sets closed_at to null when reopening a session', async () => {
    mockPatchSingle.mockResolvedValue({
      data: { id: 'sess-1', is_closed: false, closed_at: null },
      error: null,
    });

    const req = createRequest('/api/sessions/sess-1', {
      method: 'PATCH',
      body: { is_closed: false },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'sess-1' }) });
    const { status, body } = await parseResponse(res);

    expect(status).toBe(200);
    expect(body.session.is_closed).toBe(false);
    expect(body.session.closed_at).toBeNull();
  });
});
