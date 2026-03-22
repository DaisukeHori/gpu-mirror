import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';
import { createRequest, parseResponse } from '../helpers/request';

const { mockUpdateSingle, mockSoftDelete, mockAuth, mockRequireAdmin } = vi.hoisted(() => ({
  mockUpdateSingle: vi.fn(),
  mockSoftDelete: vi.fn(),
  mockAuth: vi.fn(),
  mockRequireAdmin: vi.fn(),
}));

vi.mock('../../lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn().mockImplementation(() => ({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockImplementation(() => ({
          select: vi.fn().mockReturnValue({ single: mockUpdateSingle }),
          // for soft-delete (no .select() chain)
        })),
      }),
    })),
    storage: { from: vi.fn() },
    auth: { getUser: vi.fn() },
  },
  getSupabaseAdmin: vi.fn(),
}));

vi.mock('../../lib/auth', () => ({
  authenticate: mockAuth,
  requireAdmin: mockRequireAdmin,
}));

import { PATCH, DELETE } from '../../app/api/catalog/[id]/route';

describe('PATCH /api/catalog/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      userId: 'user-1', staffId: 'staff-1', role: 'admin', storeCode: 'store-001',
    });
    mockRequireAdmin.mockReturnValue(null);
  });

  it('updates a catalog item', async () => {
    mockUpdateSingle.mockResolvedValue({
      data: { id: 'ci-1', title: 'Updated Title' },
      error: null,
    });

    const req = createRequest('/api/catalog/ci-1', {
      method: 'PATCH',
      body: { title: 'Updated Title' },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'ci-1' }) });
    const { status, body } = await parseResponse(res);

    expect(status).toBe(200);
    expect(body.item.title).toBe('Updated Title');
  });

  it('proceeds with defaults when body is empty (schema has default values)', async () => {
    mockUpdateSingle.mockResolvedValue({
      data: { id: 'ci-1', title: 'Unchanged' },
      error: null,
    });

    const req = createRequest('/api/catalog/ci-1', {
      method: 'PATCH',
      body: {},
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'ci-1' }) });
    expect(res.status).toBe(200);
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValueOnce(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    );
    const req = createRequest('/api/catalog/ci-1', {
      method: 'PATCH',
      body: { title: 'test' },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'ci-1' }) });
    expect(res.status).toBe(401);
  });

  it('returns 403 when non-admin tries to update', async () => {
    mockRequireAdmin.mockReturnValueOnce(
      NextResponse.json({ error: 'Forbidden', message: 'Admin required' }, { status: 403 }),
    );
    const req = createRequest('/api/catalog/ci-1', {
      method: 'PATCH',
      body: { title: 'test' },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'ci-1' }) });
    expect(res.status).toBe(403);
  });

  it('returns 500 on database error', async () => {
    mockUpdateSingle.mockResolvedValue({ data: null, error: { message: 'DB error' } });
    const req = createRequest('/api/catalog/ci-1', {
      method: 'PATCH',
      body: { title: 'test' },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'ci-1' }) });
    expect(res.status).toBe(500);
  });
});

describe('DELETE /api/catalog/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      userId: 'user-1', staffId: 'staff-1', role: 'admin', storeCode: 'store-001',
    });
    mockRequireAdmin.mockReturnValue(null);
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValueOnce(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    );
    const req = createRequest('/api/catalog/ci-1', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: 'ci-1' }) });
    expect(res.status).toBe(401);
  });

  it('returns 403 when non-admin tries to delete', async () => {
    mockRequireAdmin.mockReturnValueOnce(
      NextResponse.json({ error: 'Forbidden', message: 'Admin required' }, { status: 403 }),
    );
    const req = createRequest('/api/catalog/ci-1', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: 'ci-1' }) });
    expect(res.status).toBe(403);
  });
});
