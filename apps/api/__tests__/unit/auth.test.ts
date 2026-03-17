import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockGetUser, mockStaffSingle } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockStaffSingle: vi.fn(),
}));

vi.mock('../../lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn().mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ single: mockStaffSingle }),
        }),
      }),
    })),
    storage: { from: vi.fn() },
    auth: { getUser: mockGetUser },
  },
  getSupabaseAdmin: vi.fn(),
}));

import { authenticate, requireAdmin, type AuthContext } from '../../lib/auth';

function makeReq(token?: string): NextRequest {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return new NextRequest('http://localhost:3000/api/test', { headers });
}

describe('authenticate()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when Authorization header is missing', async () => {
    const res = await authenticate(makeReq());
    expect(res).toHaveProperty('status', 401);
  });

  it('returns 401 when token is invalid', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'bad token' } });
    const res = await authenticate(makeReq('invalid'));
    expect(res).toHaveProperty('status', 401);
  });

  it('returns 403 when staff is not found', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u-1' } }, error: null });
    mockStaffSingle.mockResolvedValue({ data: null, error: null });
    const res = await authenticate(makeReq('valid'));
    expect(res).toHaveProperty('status', 403);
  });

  it('returns AuthContext on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u-1' } }, error: null });
    mockStaffSingle.mockResolvedValue({
      data: { id: 'staff-1', role: 'stylist', store_code: 'S001' },
      error: null,
    });
    const res = await authenticate(makeReq('valid'));
    expect(res).toEqual({
      userId: 'u-1',
      staffId: 'staff-1',
      role: 'stylist',
      storeCode: 'S001',
    });
  });
});

describe('requireAdmin()', () => {
  it('returns null for admin role', () => {
    const ctx: AuthContext = { userId: 'u', staffId: 's', role: 'admin', storeCode: null };
    expect(requireAdmin(ctx)).toBeNull();
  });

  it('returns null for manager role', () => {
    const ctx: AuthContext = { userId: 'u', staffId: 's', role: 'manager', storeCode: null };
    expect(requireAdmin(ctx)).toBeNull();
  });

  it('returns 403 for stylist role', () => {
    const ctx: AuthContext = { userId: 'u', staffId: 's', role: 'stylist', storeCode: null };
    const res = requireAdmin(ctx);
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
  });

  it('returns 403 for unknown role', () => {
    const ctx: AuthContext = { userId: 'u', staffId: 's', role: 'viewer', storeCode: null };
    const res = requireAdmin(ctx);
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
  });
});
