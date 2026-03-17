import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequest, parseResponse } from '../helpers/request';

const { mockAuth } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
}));

const sessionsDB = new Map<string, Record<string, unknown>>();
const generationsDB = new Map<string, Record<string, unknown>>();
let sessionCounter = 0;
let genCounter = 0;

vi.mock('../../lib/supabase-admin', () => {
  function chainBuilder(resolvedValue: { data: unknown; error: unknown; count?: number }) {
    const chain: Record<string, unknown> = {};
    const methods = ['select', 'eq', 'neq', 'ilike', 'order', 'range', 'limit', 'in', 'is', 'filter', 'single'];
    for (const m of methods) {
      chain[m] = vi.fn().mockReturnValue(chain);
    }
    chain.then = (resolve: (v: unknown) => void) => resolve(resolvedValue);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (chain as any)[Symbol.toStringTag] = 'Promise';
    return chain;
  }

  return {
    supabaseAdmin: {
      from: vi.fn().mockImplementation((table: string) => ({
        insert: vi.fn().mockImplementation((data: Record<string, unknown>) => {
          if (table === 'sessions') {
            sessionCounter++;
            const id = `sess-${sessionCounter}`;
            sessionsDB.set(id, { id, ...data, is_closed: false, created_at: new Date().toISOString() });
            return chainBuilder({ data: sessionsDB.get(id), error: null });
          }
          if (table === 'session_generations') {
            genCounter++;
            const id = `gen-${genCounter}`;
            generationsDB.set(id, { id, ...data });
            return chainBuilder({ data: generationsDB.get(id), error: null });
          }
          return chainBuilder({ data: null, error: null });
        }),
        select: vi.fn().mockImplementation((_s?: string) => {
          const result = {
            eq: vi.fn().mockImplementation((_col: string, val: string) => {
              if (table === 'sessions') {
                const sess = sessionsDB.get(val);
                if (sess) {
                  const gens = Array.from(generationsDB.values()).filter((g) => g.session_id === val);
                  return {
                    single: vi.fn().mockResolvedValue({
                      data: { ...sess, session_generations: gens },
                      error: null,
                    }),
                  };
                }
                return {
                  single: vi.fn().mockResolvedValue({ data: { staff_id: 'staff-1' }, error: null }),
                };
              }
              if (table === 'session_generations') {
                return {
                  eq: vi.fn().mockImplementation((_c2: string, v2: string) => ({
                    select: vi.fn().mockReturnValue({
                      single: vi.fn().mockResolvedValue({
                        data: generationsDB.get(v2) ?? null,
                        error: null,
                      }),
                    }),
                    single: vi.fn().mockResolvedValue({
                      data: generationsDB.get(v2) ?? null,
                      error: null,
                    }),
                  })),
                  single: vi.fn().mockResolvedValue({
                    data: generationsDB.get(val) ?? null,
                    error: null,
                  }),
                };
              }
              return { single: vi.fn().mockResolvedValue({ data: null, error: null }) };
            }),
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: Array.from(sessionsDB.values()).map((s) => ({
                  ...s,
                  session_generations: Array.from(generationsDB.values()).filter(
                    (g) => g.session_id === s.id,
                  ),
                })),
                error: null,
                count: sessionsDB.size,
              }),
            }),
          };
          return result;
        }),
        update: vi.fn().mockImplementation((data: Record<string, unknown>) => ({
          eq: vi.fn().mockImplementation((_col: string, val: string) => {
            if (table === 'sessions' && sessionsDB.has(val)) {
              const sess = sessionsDB.get(val)!;
              Object.assign(sess, data);
              return {
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: sess, error: null }),
                }),
              };
            }
            if (table === 'session_generations' && generationsDB.has(val)) {
              const gen = generationsDB.get(val)!;
              Object.assign(gen, data);
              return {
                eq: vi.fn().mockReturnValue({
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: gen, error: null }),
                  }),
                }),
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: gen, error: null }),
                }),
              };
            }
            return {
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
              }),
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
                }),
              }),
            };
          }),
        })),
      })),
      storage: {
        from: vi.fn().mockReturnValue({
          download: vi.fn().mockResolvedValue({ data: new Blob(['img']), error: null }),
          upload: vi.fn().mockResolvedValue({ data: { path: 'test.jpg' }, error: null }),
          createSignedUrl: vi.fn().mockResolvedValue({
            data: { signedUrl: 'https://test.supabase.co/signed/photo.jpg' },
          }),
          remove: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
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

import { POST as createSession, GET as listSessions } from '../../app/api/sessions/route';
import { GET as getSession, PATCH as patchSession } from '../../app/api/sessions/[id]/route';
import { PATCH as patchGeneration } from '../../app/api/sessions/[id]/generations/[genId]/route';
import { GET as getHealth } from '../../app/api/health/route';

describe('Integration: Full session flow', () => {
  beforeEach(() => {
    sessionsDB.clear();
    generationsDB.clear();
    sessionCounter = 0;
    genCounter = 0;
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      userId: 'user-1', staffId: 'staff-1', role: 'stylist', storeCode: 'store-001',
    });
  });

  it('health check works', async () => {
    const res = await getHealth();
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  it('creates a session, updates photo path, then closes it', async () => {
    const createReq = createRequest('/api/sessions', {
      method: 'POST',
      body: { customer_photo_path: 'pending' },
    });
    const createRes = await createSession(createReq);
    const { body: createBody } = await parseResponse(createRes);
    expect(createRes.status).toBe(201);
    const sid = createBody.session.id;

    const patchReq = createRequest(`/api/sessions/${sid}`, {
      method: 'PATCH',
      body: { customer_photo_path: 'sess-1/customer.jpg' },
    });
    const patchRes = await patchSession(patchReq, { params: Promise.resolve({ id: sid }) });
    expect(patchRes.status).toBe(200);

    const closeReq = createRequest(`/api/sessions/${sid}`, {
      method: 'PATCH',
      body: { is_closed: true },
    });
    const closeRes = await patchSession(closeReq, { params: Promise.resolve({ id: sid }) });
    const { body: closeBody } = await parseResponse(closeRes);
    expect(closeRes.status).toBe(200);
    expect(closeBody.session.is_closed).toBe(true);
  });

  it('creates session, adds generation, toggles favorite', async () => {
    const createReq = createRequest('/api/sessions', {
      method: 'POST',
      body: { customer_photo_path: 'test/photo.jpg' },
    });
    const createRes = await createSession(createReq);
    const { body: sessBody } = await parseResponse(createRes);
    const sid = sessBody.session.id;

    genCounter++;
    const gid = `gen-${genCounter}`;
    generationsDB.set(gid, {
      id: gid,
      session_id: sid,
      style_group: 1,
      angle: 'front',
      status: 'completed',
      is_favorite: false,
    });

    const favReq = createRequest(`/api/sessions/${sid}/generations/${gid}`, {
      method: 'PATCH',
      body: { is_favorite: true },
    });
    const favRes = await patchGeneration(favReq, {
      params: Promise.resolve({ id: sid, genId: gid }),
    });
    const { status, body } = await parseResponse(favRes);
    expect(status).toBe(200);
    expect(body.generation.is_favorite).toBe(true);
  });

  it('lists sessions with pagination (as admin)', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user-1', staffId: 'staff-1', role: 'admin', storeCode: 'store-001',
    });

    for (let i = 0; i < 3; i++) {
      const req = createRequest('/api/sessions', {
        method: 'POST',
        body: { customer_photo_path: `photo-${i}.jpg` },
      });
      await createSession(req);
    }

    const req = createRequest('/api/sessions?page=1&limit=20');
    const res = await listSessions(req);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(200);
    expect(body.sessions.length).toBe(3);
    expect(body.page).toBe(1);
  });
});
