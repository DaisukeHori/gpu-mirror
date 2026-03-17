import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';
import { createRequest, parseResponse } from '../helpers/request';

const { mockUpdateSingle, mockSessionSingle, mockAuth } = vi.hoisted(() => ({
  mockUpdateSingle: vi.fn(),
  mockSessionSingle: vi.fn(),
  mockAuth: vi.fn(),
}));

vi.mock('../../lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'sessions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ single: mockSessionSingle }),
          }),
        };
      }
      return {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({ single: mockUpdateSingle }),
            }),
          }),
        }),
      };
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

import { PATCH } from '../../app/api/sessions/[id]/generations/[genId]/route';

describe('PATCH /api/sessions/[id]/generations/[genId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      userId: 'user-1', staffId: 'staff-1', role: 'stylist', storeCode: 'store-001',
    });
    mockSessionSingle.mockResolvedValue({ data: { staff_id: 'staff-1' }, error: null });
  });

  it('toggles is_favorite on a generation', async () => {
    mockUpdateSingle.mockResolvedValue({
      data: { id: 'gen-1', is_favorite: true, session_id: 'sess-1' },
      error: null,
    });

    const req = createRequest('/api/sessions/sess-1/generations/gen-1', {
      method: 'PATCH',
      body: { is_favorite: true },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'sess-1', genId: 'gen-1' }) });
    const { status, body } = await parseResponse(res);

    expect(status).toBe(200);
    expect(body.generation.is_favorite).toBe(true);
  });

  it('toggles is_selected on a generation', async () => {
    mockUpdateSingle.mockResolvedValue({
      data: { id: 'gen-1', is_selected: true },
      error: null,
    });

    const req = createRequest('/api/sessions/sess-1/generations/gen-1', {
      method: 'PATCH',
      body: { is_selected: true },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'sess-1', genId: 'gen-1' }) });
    const { status, body } = await parseResponse(res);

    expect(status).toBe(200);
    expect(body.generation.is_selected).toBe(true);
  });

  it('returns 400 when no valid fields provided', async () => {
    const req = createRequest('/api/sessions/sess-1/generations/gen-1', {
      method: 'PATCH',
      body: { invalid_field: 'test' },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'sess-1', genId: 'gen-1' }) });
    expect(res.status).toBe(400);
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValueOnce(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    );
    const req = createRequest('/api/sessions/sess-1/generations/gen-1', {
      method: 'PATCH',
      body: { is_favorite: true },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'sess-1', genId: 'gen-1' }) });
    expect(res.status).toBe(401);
  });

  it('returns 404 when session not found', async () => {
    mockSessionSingle.mockResolvedValue({ data: null, error: null });
    const req = createRequest('/api/sessions/sess-1/generations/gen-1', {
      method: 'PATCH',
      body: { is_favorite: true },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'sess-1', genId: 'gen-1' }) });
    expect(res.status).toBe(404);
  });

  it('returns 403 when user does not own session', async () => {
    mockSessionSingle.mockResolvedValue({ data: { staff_id: 'other-staff' }, error: null });
    const req = createRequest('/api/sessions/sess-1/generations/gen-1', {
      method: 'PATCH',
      body: { is_favorite: true },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'sess-1', genId: 'gen-1' }) });
    expect(res.status).toBe(403);
  });
});
