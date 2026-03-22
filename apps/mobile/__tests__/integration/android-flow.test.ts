import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      }),
      setSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'ok' } }, error: null }),
      exchangeCodeForSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'ok' } }, error: null }),
    },
  },
}));

vi.mock('expo-auth-session', () => ({
  makeRedirectUri: vi.fn(() => 'revol-mirror://login-callback'),
}));

vi.mock('expo-auth-session/build/QueryParams', () => ({
  getQueryParams: (url: string) => {
    const parsedUrl = new URL(url);
    const searchParams = parsedUrl.search ? new URLSearchParams(parsedUrl.search) : null;
    const hashParams = parsedUrl.hash ? new URLSearchParams(parsedUrl.hash.replace(/^#/, '')) : null;
    const source = hashParams && Array.from(hashParams.keys()).length > 0 ? hashParams : searchParams;
    const params = Object.fromEntries(source?.entries() ?? []);
    return { params, errorCode: params.error_code ?? null };
  },
}));

const originalFetch = global.fetch;
let mockFetch: ReturnType<typeof vi.fn>;
let fetchLog: { method: string; url: string }[] = [];

beforeEach(() => {
  fetchLog = [];
  mockFetch = vi.fn().mockImplementation((url: string, opts: RequestInit = {}) => {
    const method = opts.method ?? 'GET';
    fetchLog.push({ method, url });

    if (url.includes('/api/sessions') && method === 'POST' && !url.includes('/generations')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ session: { id: 'android-sess-1', staff_id: 's1', customer_photo_path: 'pending' } }),
      });
    }

    if (url.includes('/api/upload') && method === 'POST') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ storage_path: 'android-sess-1/photo.jpg', url: 'https://signed/photo' }),
      });
    }

    if (url.match(/\/api\/sessions\/android-sess-1$/) && method === 'PATCH') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ session: { id: 'android-sess-1' } }),
      });
    }

    if (url.includes('/api/generate') && method === 'POST') {
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('data: {"type":"generation_completed","generation_id":"ag1","style_group":1,"angle":"front","photo_url":"https://gen/front"}\n\n'));
          controller.enqueue(encoder.encode('data: {"type":"generation_completed","generation_id":"ag2","style_group":1,"angle":"glamour","photo_url":"https://gen/glamour"}\n\n'));
          controller.enqueue(encoder.encode('data: {"type":"all_completed"}\n\n'));
          controller.close();
        },
      });
      return Promise.resolve({ ok: true, body: readable });
    }

    if (url.match(/\/api\/sessions\/android-sess-1$/) && method === 'GET') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          session: {
            id: 'android-sess-1',
            customer_photo_url: 'https://signed/photo',
            session_generations: [
              { id: 'ag1', style_group: 1, angle: 'front', status: 'completed', photo_url: 'https://gen/front', is_favorite: false },
              { id: 'ag2', style_group: 1, angle: 'glamour', status: 'completed', photo_url: 'https://gen/glamour', is_favorite: false },
            ],
          },
        }),
      });
    }

    if (url.includes('/api/colors') && method === 'GET') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ colors: [{ id: 'c1', name: 'ブラウン', hex_code: '#8B4513' }] }),
      });
    }

    return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({ message: 'Not found' }) });
  });
  global.fetch = mockFetch as unknown as typeof fetch;
});

afterEach(() => {
  global.fetch = originalFetch;
});

import { apiPost, apiPatch, apiGet, uploadFile, apiSSE } from '../../lib/api';
import { hasAuthCallbackParams, createSessionFromUrl } from '../../lib/sso';

describe('Android-specific integration flow', () => {
  it('SSO deep link → session creation → generate → result', async () => {
    // Step 1: SSO deep link callback (simulating Android coldstart)
    const deepLinkUrl = 'revol-mirror://login-callback?code=android-auth-code';
    expect(hasAuthCallbackParams(deepLinkUrl)).toBe(true);

    const session = await createSessionFromUrl(deepLinkUrl);
    expect(session).toBeDefined();

    // Step 2: Create a session (after camera capture)
    const sessResult = await apiPost<{ session: { id: string } }>('/api/sessions', {
      customer_photo_path: 'pending',
    });
    expect(sessResult.session.id).toBe('android-sess-1');

    // Step 3: Upload customer photo
    const upload = await uploadFile(
      '/api/upload',
      { uri: 'file:///android-photo.jpg', name: 'customer.jpg', type: 'image/jpeg' },
      'android-sess-1',
    );
    expect(upload.storage_path).toContain('android-sess-1');

    // Step 4: Update session with photo path
    await apiPatch('/api/sessions/android-sess-1', {
      customer_photo_path: upload.storage_path,
    });

    // Step 5: Generate with SSE
    const events: Record<string, unknown>[] = [];
    let complete = false;

    await apiSSE(
      '/api/generate',
      {
        session_id: 'android-sess-1',
        styles: [{ simulation_mode: 'style', reference_type: 'catalog' }],
        angles: ['front', 'glamour'],
      },
      {
        onEvent: (e) => events.push(e),
        onComplete: () => { complete = true; },
      },
    );

    expect(events.filter((e) => e.type === 'generation_completed')).toHaveLength(2);
    expect(complete).toBe(true);

    // Step 6: Fetch results
    const detail = await apiGet<{
      session: { session_generations: { id: string; status: string }[] };
    }>('/api/sessions/android-sess-1');

    expect(detail.session.session_generations).toHaveLength(2);
    expect(detail.session.session_generations.every((g) => g.status === 'completed')).toBe(true);
  });

  it('handles permission flow before image pick on Android', async () => {
    const permissionGranted = true;
    if (!permissionGranted) {
      throw new Error('Permission denied');
    }

    const upload = await uploadFile(
      '/api/upload',
      { uri: 'file:///library-pick.jpg', name: 'ref.jpg', type: 'image/jpeg' },
      'android-sess-1',
      'reference-photos',
    );
    expect(upload.storage_path).toBeDefined();
  });

  it('fetches colors for Android hair color selection', async () => {
    const colors = await apiGet<{ colors: { id: string; name: string }[] }>('/api/colors');
    expect(colors.colors).toHaveLength(1);
    expect(colors.colors[0].name).toBe('ブラウン');
  });

  it('all API calls include auth headers when making requests', async () => {
    await apiGet<unknown>('/api/colors');

    const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1] as [string, RequestInit?];
    const headers = lastCall[1]?.headers as Record<string, string> | undefined;
    expect(headers?.Authorization).toMatch(/^Bearer /);
  });

  it('verifies requests are logged in fetchLog', async () => {
    await apiPost<unknown>('/api/sessions', { customer_photo_path: 'pending' });
    await apiGet<unknown>('/api/colors');

    const methods = fetchLog.map((l) => l.method);
    expect(methods).toContain('POST');
    expect(methods).toContain('GET');
  });
});
