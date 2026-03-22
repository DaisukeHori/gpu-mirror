import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextResponse } from 'next/server';
import { createRequest, parseResponse } from '../helpers/request';

const { mockUpload, mockSignedUrl, mockAuth } = vi.hoisted(() => ({
  mockUpload: vi.fn(),
  mockSignedUrl: vi.fn().mockResolvedValue({
    data: { signedUrl: 'https://test.supabase.co/signed/proxied.jpg' },
  }),
  mockAuth: vi.fn(),
}));

vi.mock('../../lib/supabase-admin', () => ({
  supabaseAdmin: {
    storage: {
      from: vi.fn().mockReturnValue({
        upload: mockUpload,
        createSignedUrl: mockSignedUrl,
      }),
    },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'sessions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { staff_id: 'staff-1' }, error: null }),
            }),
          }),
        };
      }
      return {};
    }),
    auth: { getUser: vi.fn() },
  },
  getSupabaseAdmin: vi.fn(),
}));

vi.mock('../../lib/auth', () => ({
  authenticate: mockAuth,
  requireAdmin: vi.fn().mockReturnValue(null),
}));

vi.mock('../../lib/image-utils', () => ({
  resizeImage: vi.fn().mockResolvedValue(Buffer.from('resized')),
  validateImageSize: vi.fn().mockReturnValue(true),
}));

const originalFetch = global.fetch;

import { POST } from '../../app/api/proxy-image/route';
import { validateImageSize } from '../../lib/image-utils';

describe('POST /api/proxy-image', () => {
  let mockFetchFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      userId: 'user-1', staffId: 'staff-1', role: 'stylist', storeCode: 'store-001',
    });
    mockUpload.mockResolvedValue({ data: { path: 'ref.jpg' }, error: null });

    mockFetchFn = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
    });
    global.fetch = mockFetchFn as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('proxies a Pinterest image and returns storage path', async () => {
    const req = createRequest('/api/proxy-image', {
      method: 'POST',
      body: { url: 'https://i.pinimg.com/originals/abc.jpg', session_id: '550e8400-e29b-41d4-a716-446655440000' },
    });

    const res = await POST(req);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(200);
    expect(body.storage_path).toBeDefined();
    expect(body.url).toBeDefined();
  });

  it('returns 400 when url is missing', async () => {
    const req = createRequest('/api/proxy-image', {
      method: 'POST',
      body: { session_id: '550e8400-e29b-41d4-a716-446655440000' },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when session_id is missing', async () => {
    const req = createRequest('/api/proxy-image', {
      method: 'POST',
      body: { url: 'https://i.pinimg.com/originals/abc.jpg' },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('rejects non-Pinterest URLs', async () => {
    const req = createRequest('/api/proxy-image', {
      method: 'POST',
      body: { url: 'https://evil.com/malware.jpg', session_id: '550e8400-e29b-41d4-a716-446655440000' },
    });

    const res = await POST(req);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(400);
    expect(body.message).toContain('URL not allowed');
  });

  it('rejects non-http protocols', async () => {
    const req = createRequest('/api/proxy-image', {
      method: 'POST',
      body: { url: 'ftp://i.pinimg.com/abc.jpg', session_id: '550e8400-e29b-41d4-a716-446655440000' },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValueOnce(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    );
    const req = createRequest('/api/proxy-image', {
      method: 'POST',
      body: { url: 'https://i.pinimg.com/abc.jpg', session_id: '550e8400-e29b-41d4-a716-446655440000' },
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 502 when upstream fetch fails', async () => {
    mockFetchFn.mockResolvedValueOnce({ ok: false, status: 403 });

    const req = createRequest('/api/proxy-image', {
      method: 'POST',
      body: { url: 'https://i.pinimg.com/originals/abc.jpg', session_id: '550e8400-e29b-41d4-a716-446655440000' },
    });

    const res = await POST(req);
    expect(res.status).toBe(502);
  });

  it('returns 413 when image too large', async () => {
    vi.mocked(validateImageSize).mockReturnValueOnce(false);

    const req = createRequest('/api/proxy-image', {
      method: 'POST',
      body: { url: 'https://i.pinimg.com/originals/abc.jpg', session_id: '550e8400-e29b-41d4-a716-446655440000' },
    });

    const res = await POST(req);
    expect(res.status).toBe(413);
  });

  it('returns 403 when user does not own the session', async () => {
    const { supabaseAdmin } = await import('../../lib/supabase-admin');
    vi.mocked(supabaseAdmin.from).mockImplementationOnce(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { staff_id: 'other-staff' }, error: null }),
        }),
      }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any));

    const req = createRequest('/api/proxy-image', {
      method: 'POST',
      body: { url: 'https://i.pinimg.com/originals/abc.jpg', session_id: '550e8400-e29b-41d4-a716-446655440000' },
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
  });
});
