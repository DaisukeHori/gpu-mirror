import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';
import { createRequest } from '../helpers/request';

const {
  mockAuth,
  mockSessionSingle,
  mockGenInsertSingle,
  mockGenSelectRange,
  mockDownload,
  mockUpload,
  mockSignedUrl,
  mockGenerateSingle,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockSessionSingle: vi.fn(),
  mockGenInsertSingle: vi.fn(),
  mockGenSelectRange: vi.fn(),
  mockDownload: vi.fn(),
  mockUpload: vi.fn().mockResolvedValue({ error: null }),
  mockSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://test.co/signed.jpg' } }),
  mockGenerateSingle: vi.fn(),
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
        const chainableEq: any = vi.fn().mockImplementation(() => ({
          eq: chainableEq,
          not: vi.fn().mockResolvedValue({ data: [], error: null }),
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue(mockGenSelectRange),
          }),
          single: mockGenInsertSingle,
        }));
        return {
          select: vi.fn().mockReturnValue({
            eq: chainableEq,
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({ single: mockGenInsertSingle }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn() }) }) };
    }),
    storage: {
      from: vi.fn().mockReturnValue({
        download: mockDownload,
        upload: mockUpload,
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
  createConcurrencyLimiter: () => (fn: () => Promise<unknown>) => fn(),
  withTimeout: vi.fn().mockImplementation((promise: Promise<unknown>) => promise),
  GENERATION_TIMEOUT_MS: 60000,
}));

import { POST } from '../../app/api/generate/route';

async function readSSEStream(response: Response): Promise<Record<string, unknown>[]> {
  const reader = response.body?.getReader();
  if (!reader) return [];

  const decoder = new TextDecoder();
  const events: Record<string, unknown>[] = [];
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          events.push(JSON.parse(line.slice(6)));
        } catch { /* skip */ }
      }
    }
  }
  return events;
}

describe('POST /api/generate (SSE)', () => {
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
    const req = createRequest('/api/generate', {
      method: 'POST',
      body: { session_id: '550e8400-e29b-41d4-a716-446655440000', styles: [{ simulation_mode: 'style', reference_type: 'upload', reference_photo_path: 'x' }] },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 when session_id is missing', async () => {
    const req = createRequest('/api/generate', {
      method: 'POST',
      body: { styles: [{ simulation_mode: 'style', reference_type: 'upload', reference_photo_path: 'x' }] },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when styles is empty', async () => {
    const req = createRequest('/api/generate', {
      method: 'POST',
      body: { session_id: '550e8400-e29b-41d4-a716-446655440000', styles: [] },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 404 when session not found', async () => {
    mockSessionSingle.mockResolvedValue({ data: null, error: null });
    const req = createRequest('/api/generate', {
      method: 'POST',
      body: { session_id: '550e8400-e29b-41d4-a716-446655440000', styles: [{ simulation_mode: 'style', reference_type: 'upload', reference_photo_path: 'x' }] },
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it('returns 403 when user does not own session', async () => {
    mockSessionSingle.mockResolvedValue({
      data: { customer_photo_path: 'path.jpg', staff_id: 'other-staff' },
      error: null,
    });
    const req = createRequest('/api/generate', {
      method: 'POST',
      body: { session_id: '550e8400-e29b-41d4-a716-446655440000', styles: [{ simulation_mode: 'style', reference_type: 'upload', reference_photo_path: 'x' }] },
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('streams SSE events on successful generation', async () => {
    const fakeBlob = new Blob([Buffer.alloc(100)]);
    mockDownload.mockResolvedValue({ data: fakeBlob });
    mockGenSelectRange.mockResolvedValue({ data: [], error: null });
    let genIdx = 0;
    mockGenInsertSingle.mockImplementation(() => {
      genIdx++;
      return Promise.resolve({ data: { id: `gen-${genIdx}` }, error: null });
    });
    mockGenerateSingle.mockResolvedValue({
      image: Buffer.alloc(200),
      latencyMs: 1500,
      estimatedCostUsd: 0.039,
    });

    const req = createRequest('/api/generate', {
      method: 'POST',
      body: {
        session_id: '550e8400-e29b-41d4-a716-446655440000',
        styles: [{ simulation_mode: 'color', reference_type: 'color_only', hair_color_custom: 'red' }],
        angles: ['front'],
      },
    });
    const res = await POST(req);

    expect(res.headers.get('Content-Type')).toBe('text/event-stream');

    const events = await readSSEStream(res);
    const types = events.map((e) => e.type);
    expect(types).toContain('generation_completed');
    expect(types).toContain('all_completed');
  });
});
