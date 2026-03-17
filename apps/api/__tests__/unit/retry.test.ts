import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';
import { createRequest, parseResponse } from '../helpers/request';

const mockGeneration = {
  id: 'gen-1',
  session_id: 'sess-1',
  angle: 'front',
  simulation_mode: 'style',
  reference_photo_path: null,
  reference_type: 'upload',
  hair_color_id: null,
  hair_color_custom: null,
  status: 'generating',
};

const {
  mockSessionSingle,
  mockUpdateGenSingle,
  mockExistingSingle,
  mockAuth,
  mockGenerateSingle,
  mockDownload,
  mockUpload,
  mockRemove,
  mockSignedUrl,
} = vi.hoisted(() => ({
  mockSessionSingle: vi.fn(),
  mockUpdateGenSingle: vi.fn(),
  mockExistingSingle: vi.fn(),
  mockAuth: vi.fn(),
  mockGenerateSingle: vi.fn(),
  mockDownload: vi.fn(),
  mockUpload: vi.fn().mockResolvedValue({ error: null }),
  mockRemove: vi.fn().mockResolvedValue({ error: null }),
  mockSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://test.co/signed.jpg' } }),
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
      if (table === 'session_generations') {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  select: vi.fn().mockReturnValue({ single: mockUpdateGenSingle }),
                }),
              }),
              select: vi.fn().mockReturnValue({ single: vi.fn() }),
            }),
          }),
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({ single: mockExistingSingle }),
            }),
          }),
        };
      }
      return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn() }) }) };
    }),
    storage: {
      from: vi.fn().mockReturnValue({
        download: mockDownload,
        upload: mockUpload,
        remove: mockRemove,
        createSignedUrl: mockSignedUrl,
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

vi.mock('../../lib/ai-gateway', () => ({
  getAIProvider: () => ({ generateSingle: mockGenerateSingle }),
}));

vi.mock('../../lib/image-utils', () => ({
  resizeImage: vi.fn().mockImplementation((buf: Buffer) => Promise.resolve(buf)),
}));

vi.mock('../../lib/concurrency', () => ({
  withTimeout: vi.fn().mockImplementation((promise: Promise<unknown>) => promise),
}));

import { POST } from '../../app/api/sessions/[id]/generations/[genId]/retry/route';

describe('POST /api/sessions/[id]/generations/[genId]/retry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      userId: 'user-1', staffId: 'staff-1', role: 'stylist', storeCode: 'store-001',
    });
    mockSessionSingle.mockResolvedValue({
      data: { customer_photo_path: 'photos/customer.jpg', staff_id: 'staff-1' },
      error: null,
    });
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValueOnce(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    );
    const req = createRequest('/api/sessions/sess-1/generations/gen-1/retry', { method: 'POST' });
    const res = await POST(req, { params: Promise.resolve({ id: 'sess-1', genId: 'gen-1' }) });
    expect(res.status).toBe(401);
  });

  it('returns 404 when session not found', async () => {
    mockSessionSingle.mockResolvedValue({ data: null, error: null });
    const req = createRequest('/api/sessions/sess-1/generations/gen-1/retry', { method: 'POST' });
    const res = await POST(req, { params: Promise.resolve({ id: 'sess-1', genId: 'gen-1' }) });
    expect(res.status).toBe(404);
  });

  it('returns 403 when user does not own session', async () => {
    mockSessionSingle.mockResolvedValue({
      data: { customer_photo_path: 'path.jpg', staff_id: 'other-staff' },
      error: null,
    });
    const req = createRequest('/api/sessions/sess-1/generations/gen-1/retry', { method: 'POST' });
    const res = await POST(req, { params: Promise.resolve({ id: 'sess-1', genId: 'gen-1' }) });
    expect(res.status).toBe(403);
  });

  it('returns 409 when generation is not in failed state', async () => {
    mockUpdateGenSingle.mockResolvedValue({ data: null, error: { message: 'no rows' } });
    mockExistingSingle.mockResolvedValue({ data: { status: 'completed' }, error: null });

    const req = createRequest('/api/sessions/sess-1/generations/gen-1/retry', { method: 'POST' });
    const res = await POST(req, { params: Promise.resolve({ id: 'sess-1', genId: 'gen-1' }) });
    const { status, body } = await parseResponse(res);
    expect(status).toBe(409);
    expect(body.message).toContain('completed');
  });

  it('returns 404 when generation does not exist', async () => {
    mockUpdateGenSingle.mockResolvedValue({ data: null, error: { message: 'no rows' } });
    mockExistingSingle.mockResolvedValue({ data: null, error: null });

    const req = createRequest('/api/sessions/sess-1/generations/gen-1/retry', { method: 'POST' });
    const res = await POST(req, { params: Promise.resolve({ id: 'sess-1', genId: 'gen-1' }) });
    expect(res.status).toBe(404);
  });

  it('successfully retries a failed generation', async () => {
    const fakeBlob = new Blob([Buffer.alloc(100)]);
    mockUpdateGenSingle.mockResolvedValue({ data: mockGeneration, error: null });
    mockDownload.mockResolvedValue({ data: fakeBlob });
    mockGenerateSingle.mockResolvedValue({
      image: Buffer.alloc(200),
      latencyMs: 1500,
      estimatedCostUsd: 0.039,
    });

    const req = createRequest('/api/sessions/sess-1/generations/gen-1/retry', { method: 'POST' });
    const res = await POST(req, { params: Promise.resolve({ id: 'sess-1', genId: 'gen-1' }) });
    const { status, body } = await parseResponse(res);

    expect(status).toBe(200);
    expect(body.generation_id).toBe('gen-1');
    expect(body.status).toBe('completed');
    expect(body.photo_url).toBeDefined();
  });
});
