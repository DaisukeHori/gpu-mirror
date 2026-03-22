import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

const { mockUpload, mockSignedUrl, mockAuth } = vi.hoisted(() => ({
  mockUpload: vi.fn(),
  mockSignedUrl: vi.fn().mockResolvedValue({
    data: { signedUrl: 'https://test.supabase.co/signed/uploaded.jpg' },
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
  resizeImage: vi.fn().mockResolvedValue(Buffer.from('resized-image')),
  createThumbnail: vi.fn().mockResolvedValue(Buffer.from('thumb')),
  validateImageSize: vi.fn().mockReturnValue(true),
}));

import { POST } from '../../app/api/upload/route';
import { resizeImage, validateImageSize } from '../../lib/image-utils';

function createFormDataRequest(fields: Record<string, string | Blob>): NextRequest {
  const formData = new FormData();
  for (const [key, val] of Object.entries(fields)) {
    formData.append(key, val);
  }
  const req = new NextRequest('http://localhost:3000/api/upload', {
    method: 'POST',
    body: formData,
    headers: { Authorization: 'Bearer test-token' },
  } as any);
  return req;
}

describe('POST /api/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      userId: 'user-1', staffId: 'staff-1', role: 'stylist', storeCode: 'store-001',
    });
    mockUpload.mockResolvedValue({ data: { path: 'test.jpg' }, error: null });
  });

  it('uploads a file and returns storage_path and signed url', async () => {
    const file = new Blob(['fake-image-data'], { type: 'image/jpeg' });
    const req = createFormDataRequest({
      file: file,
      session_id: 'sess-1',
      bucket: 'customer-photos',
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.storage_path).toBeDefined();
    expect(body.url).toBeDefined();
  });

  it('returns 400 when file is missing', async () => {
    const req = createFormDataRequest({ session_id: 'sess-1' });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when session_id is missing', async () => {
    const file = new Blob(['data'], { type: 'image/jpeg' });
    const req = createFormDataRequest({ file });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValueOnce(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    );
    const file = new Blob(['data'], { type: 'image/jpeg' });
    const req = createFormDataRequest({ file, session_id: 'sess-1' });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 413 when image exceeds size limit', async () => {
    vi.mocked(validateImageSize).mockReturnValueOnce(false);

    const file = new Blob(['huge-data'], { type: 'image/jpeg' });
    const req = createFormDataRequest({ file, session_id: 'sess-1' });

    const res = await POST(req);
    expect(res.status).toBe(413);
  });

  it('returns 500 when storage upload fails', async () => {
    mockUpload.mockResolvedValueOnce({ data: null, error: { message: 'Storage full' } });

    const file = new Blob(['data'], { type: 'image/jpeg' });
    const req = createFormDataRequest({ file, session_id: 'sess-1' });

    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it('returns 500 with message when image processing fails', async () => {
    vi.mocked(resizeImage).mockRejectedValueOnce(new Error('Input buffer contains unsupported image format'));

    const file = new Blob(['not-an-image'], { type: 'image/jpeg' });
    const req = createFormDataRequest({ file, session_id: 'sess-1', bucket: 'reference-photos' });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.message).toContain('unsupported image format');
  });

  it('returns 403 when user does not own the session', async () => {
    const { supabaseAdmin } = await import('../../lib/supabase-admin');
    vi.mocked(supabaseAdmin.from).mockImplementationOnce(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { staff_id: 'other-staff' }, error: null }),
        }),
      }),
    } as any));

    const file = new Blob(['data'], { type: 'image/jpeg' });
    const req = createFormDataRequest({ file, session_id: 'sess-1' });

    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('returns 404 when session does not exist', async () => {
    const { supabaseAdmin } = await import('../../lib/supabase-admin');
    vi.mocked(supabaseAdmin.from).mockImplementationOnce(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    } as any));

    const file = new Blob(['data'], { type: 'image/jpeg' });
    const req = createFormDataRequest({ file, session_id: 'nonexistent' });

    const res = await POST(req);
    expect(res.status).toBe(404);
  });
});
