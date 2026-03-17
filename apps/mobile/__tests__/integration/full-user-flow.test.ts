import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      }),
    },
  },
}));

const originalFetch = global.fetch;
let mockFetch: ReturnType<typeof vi.fn>;
let fetchLog: { method: string; url: string; body?: unknown }[] = [];

beforeEach(() => {
  fetchLog = [];
  mockFetch = vi.fn().mockImplementation((url: string, opts: RequestInit = {}) => {
    const method = opts.method ?? 'GET';
    let body: unknown;
    if (opts.body && typeof opts.body === 'string') {
      try { body = JSON.parse(opts.body); } catch { body = opts.body; }
    }
    fetchLog.push({ method, url, body });

    if (url.includes('/api/sessions') && method === 'POST' && !url.includes('/generations')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ session: { id: 'sess-1', staff_id: 'staff-1', customer_photo_path: 'pending' } }),
      });
    }

    if (url.includes('/api/upload') && method === 'POST') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ storage_path: 'sess-1/photo.jpg', url: 'https://signed/customer-photo' }),
      });
    }

    if (url.includes('/generations/') && url.includes('/retry') && method === 'POST') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          generation_id: 'g3',
          status: 'completed',
          photo_url: 'https://gen/back-retry',
          ai_latency_ms: 3000,
        }),
      });
    }

    if (url.includes('/generations/') && method === 'PATCH') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ generation: { id: 'g1', is_favorite: true } }),
      });
    }

    if (url.includes('/api/sessions/sess-1') && method === 'PATCH') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ session: { id: 'sess-1', customer_photo_path: 'sess-1/photo.jpg', is_closed: body && (body as Record<string, unknown>).is_closed } }),
      });
    }

    if (url.includes('/api/catalog') && method === 'GET') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          items: [
            { id: 'ci-1', title: 'ショートボブ', image_url: 'https://img1', thumbnail_url: 'https://thumb1' },
            { id: 'ci-2', title: 'レイヤーロング', image_url: 'https://img2', thumbnail_url: 'https://thumb2' },
          ],
          total: 2,
        }),
      });
    }

    if (url.includes('/api/colors') && method === 'GET') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          colors: [
            { id: 'hc-1', name: 'アッシュベージュ', hex_code: '#C8956C' },
          ],
        }),
      });
    }

    if (url.includes('/api/proxy-image') && method === 'POST') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ storage_path: 'sess-1/ref.jpg', url: 'https://signed/ref-url' }),
      });
    }

    if (url.includes('/api/generate') && method === 'POST') {
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('data: {"type":"generation_completed","generation_id":"g1","style_group":1,"angle":"front","photo_url":"https://gen/front"}\n\n'));
          controller.enqueue(encoder.encode('data: {"type":"generation_completed","generation_id":"g2","style_group":1,"angle":"side","photo_url":"https://gen/side"}\n\n'));
          controller.enqueue(encoder.encode('data: {"type":"all_completed"}\n\n'));
          controller.close();
        },
      });
      return Promise.resolve({ ok: true, body: readable });
    }

    if (url.match(/\/api\/sessions\/sess-1$/) && method === 'GET') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          session: {
            id: 'sess-1',
            customer_photo_url: 'https://signed/customer-photo',
            session_generations: [
              { id: 'g1', style_group: 1, angle: 'front', status: 'completed', photo_url: 'https://gen/front', is_favorite: false },
              { id: 'g2', style_group: 1, angle: 'side', status: 'completed', photo_url: 'https://gen/side', is_favorite: false },
              { id: 'g3', style_group: 1, angle: 'back', status: 'failed', photo_url: null, is_favorite: false },
            ],
          },
        }),
      });
    }

    if (url.includes('/api/sessions') && method === 'GET' && url.includes('page=')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          sessions: [{ id: 'sess-1', created_at: '2026-03-18', generation_count: 5, first_front_photo: null }],
          total: 1,
          page: 1,
          limit: 20,
        }),
      });
    }

    return Promise.resolve({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: () => Promise.resolve({ message: 'Not found' }),
    });
  });
  global.fetch = mockFetch as unknown as typeof fetch;
});

afterEach(() => {
  global.fetch = originalFetch;
});

import { apiPost, apiPatch, apiGet, uploadFile, apiSSE } from '../../lib/api';

describe('Full User Flow: Camera → Explore → Generate → Result', () => {
  it('completes the entire session flow with all API calls', async () => {
    // === STEP 1: Camera Screen ===
    // User takes a photo → create session with 'pending'
    const sessResult = await apiPost<{ session: { id: string } }>('/api/sessions', {
      customer_photo_path: 'pending',
    });
    const sessionId = sessResult.session.id;
    expect(sessionId).toBe('sess-1');

    // Upload the photo
    const uploadResult = await uploadFile(
      '/api/upload',
      { uri: 'file://photo.jpg', name: 'photo.jpg', type: 'image/jpeg' },
      sessionId,
    );
    expect(uploadResult.storage_path).toBe('sess-1/photo.jpg');

    // Update session with real photo path
    await apiPatch(`/api/sessions/${sessionId}`, {
      customer_photo_path: uploadResult.storage_path,
    });

    // === STEP 2: Explore Screen ===
    // Fetch catalog items
    const catalog = await apiGet<{ items: { id: string }[] }>('/api/catalog?sort=popularity&limit=50');
    expect(catalog.items.length).toBeGreaterThan(0);

    // Fetch hair colors
    const colors = await apiGet<{ colors: { id: string }[] }>('/api/colors');
    expect(colors.colors.length).toBeGreaterThan(0);

    // Proxy a Pinterest image
    const proxyResult = await apiPost<{ storage_path: string }>('/api/proxy-image', {
      url: 'https://i.pinimg.com/originals/test.jpg',
      session_id: sessionId,
    });
    expect(proxyResult.storage_path).toBeDefined();

    // === STEP 3: Generating Screen ===
    const sseEvents: Record<string, unknown>[] = [];
    let sseComplete = false;

    await apiSSE(
      '/api/generate',
      {
        session_id: sessionId,
        styles: [
          {
            simulation_mode: 'style',
            reference_type: 'catalog',
            catalog_item_id: catalog.items[0].id,
            hair_color_id: colors.colors[0].id,
          },
        ],
        angles: ['front', 'side'],
      },
      {
        onEvent: (e) => sseEvents.push(e),
        onComplete: () => { sseComplete = true; },
      },
    );

    expect(sseEvents.length).toBeGreaterThanOrEqual(2);
    const completedEvents = sseEvents.filter((e) => e.type === 'generation_completed');
    expect(completedEvents).toHaveLength(2);
    expect(sseEvents.some((e) => e.type === 'all_completed')).toBe(true);
    expect(sseComplete).toBe(true);

    // === STEP 4: Result Screen ===
    // Fetch session with all generations
    const sessDetail = await apiGet<{
      session: {
        customer_photo_url: string;
        session_generations: { id: string; status: string; is_favorite: boolean }[];
      };
    }>(`/api/sessions/${sessionId}`);

    const gens = sessDetail.session.session_generations;
    expect(gens.length).toBe(3);
    expect(gens.filter((g) => g.status === 'completed')).toHaveLength(2);
    expect(gens.filter((g) => g.status === 'failed')).toHaveLength(1);

    // Toggle favorite
    const favResult = await apiPatch<{ generation: { is_favorite: boolean } }>(
      `/api/sessions/${sessionId}/generations/g1`,
      { is_favorite: true },
    );
    expect(favResult.generation.is_favorite).toBe(true);

    // Retry failed generation
    const retryResult = await apiPost<{ generation_id: string; status: string; photo_url: string }>(
      `/api/sessions/${sessionId}/generations/g3/retry`,
    );
    expect(retryResult.status).toBe('completed');
    expect(retryResult.photo_url).toContain('retry');

    // === STEP 5: Close Session ===
    const closeResult = await apiPatch<{ session: { is_closed: boolean } }>(
      `/api/sessions/${sessionId}`,
      { is_closed: true },
    );
    expect(closeResult.session.is_closed).toBe(true);

    // === VERIFY ALL API CALLS WERE MADE ===
    const methods = fetchLog.map((l) => `${l.method} ${new URL(l.url).pathname}`);

    // Session lifecycle
    expect(methods).toContain('POST /api/sessions');
    expect(methods).toContain('POST /api/upload');
    expect(methods.filter((m) => m === 'PATCH /api/sessions/sess-1').length).toBe(2);

    // Explore
    expect(methods.some((m) => m.startsWith('GET /api/catalog'))).toBe(true);
    expect(methods.some((m) => m.startsWith('GET /api/colors'))).toBe(true);
    expect(methods).toContain('POST /api/proxy-image');

    // Generate
    expect(methods).toContain('POST /api/generate');

    // Result
    expect(methods).toContain('GET /api/sessions/sess-1');
    expect(methods).toContain('PATCH /api/sessions/sess-1/generations/g1');
    expect(methods).toContain('POST /api/sessions/sess-1/generations/g3/retry');
  });

  it('loads a session from history flow', async () => {
    const historyResult = await apiGet<{
      sessions: { id: string; generation_count: number }[];
      total: number;
    }>('/api/sessions?page=1&limit=20');

    expect(historyResult.sessions).toHaveLength(1);
    expect(historyResult.sessions[0].id).toBe('sess-1');
    expect(historyResult.sessions[0].generation_count).toBe(5);
    expect(historyResult.total).toBe(1);

    const listCall = fetchLog.find((l) => l.url.includes('/api/sessions?page='));
    expect(listCall).toBeDefined();
    expect(listCall!.method).toBe('GET');
  });
});
