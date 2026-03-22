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

afterEach(() => {
  global.fetch = originalFetch;
});

import { apiSSE } from '../../lib/api';

function createSSEResponse(lines: string[]): Response {
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    start(controller) {
      for (const line of lines) {
        controller.enqueue(encoder.encode(line + '\n'));
      }
      controller.close();
    },
  });
  return new Response(readable, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

describe('SSE parser (apiSSE)', () => {
  it('parses generation_completed events', async () => {
    const events: Record<string, unknown>[] = [];
    global.fetch = vi.fn().mockResolvedValue(
      createSSEResponse([
        'data: {"type":"generation_completed","generation_id":"g1","style_group":1,"angle":"front","photo_url":"https://gen/front"}',
        '',
      ]),
    ) as unknown as typeof fetch;

    await apiSSE('/api/generate', {}, { onEvent: (e) => events.push(e) });

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('generation_completed');
    expect(events[0].generation_id).toBe('g1');
    expect(events[0].photo_url).toBe('https://gen/front');
  });

  it('parses generation_failed events', async () => {
    const events: Record<string, unknown>[] = [];
    global.fetch = vi.fn().mockResolvedValue(
      createSSEResponse([
        'data: {"type":"generation_failed","generation_id":"g2","error":"Timeout"}',
        '',
      ]),
    ) as unknown as typeof fetch;

    await apiSSE('/api/generate', {}, { onEvent: (e) => events.push(e) });

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('generation_failed');
    expect(events[0].error).toBe('Timeout');
  });

  it('parses all_completed event', async () => {
    const events: Record<string, unknown>[] = [];
    let completed = false;
    global.fetch = vi.fn().mockResolvedValue(
      createSSEResponse([
        'data: {"type":"generation_completed","generation_id":"g1","style_group":1,"angle":"front","photo_url":"https://gen/front"}',
        '',
        'data: {"type":"all_completed"}',
        '',
      ]),
    ) as unknown as typeof fetch;

    await apiSSE('/api/generate', {}, {
      onEvent: (e) => events.push(e),
      onComplete: () => { completed = true; },
    });

    expect(events).toHaveLength(2);
    expect(events[1].type).toBe('all_completed');
    expect(completed).toBe(true);
  });

  it('skips heartbeat comments', async () => {
    const events: Record<string, unknown>[] = [];
    global.fetch = vi.fn().mockResolvedValue(
      createSSEResponse([
        ': heartbeat',
        '',
        'data: {"type":"generation_completed","generation_id":"g1","style_group":1,"angle":"front","photo_url":"x"}',
        '',
        ': heartbeat',
        '',
      ]),
    ) as unknown as typeof fetch;

    await apiSSE('/api/generate', {}, { onEvent: (e) => events.push(e) });

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('generation_completed');
  });

  it('skips malformed JSON lines and parses valid ones', async () => {
    const events: Record<string, unknown>[] = [];
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('data: not-json\n\ndata: {"type":"all_completed"}\n\n'));
        controller.close();
      },
    });
    global.fetch = vi.fn().mockResolvedValue(
      new Response(readable, { status: 200, headers: { 'Content-Type': 'text/event-stream' } }),
    ) as unknown as typeof fetch;

    await apiSSE('/api/generate', {}, { onEvent: (e) => events.push(e) });

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('all_completed');
  });

  it('handles multiple events in rapid succession', async () => {
    const events: Record<string, unknown>[] = [];
    const lines = [];
    for (let i = 0; i < 10; i++) {
      lines.push(`data: {"type":"generation_completed","generation_id":"g${i}","style_group":1,"angle":"front","photo_url":"url${i}"}`);
      lines.push('');
    }
    lines.push('data: {"type":"all_completed"}');
    lines.push('');

    global.fetch = vi.fn().mockResolvedValue(
      createSSEResponse(lines),
    ) as unknown as typeof fetch;

    await apiSSE('/api/generate', {}, { onEvent: (e) => events.push(e) });

    expect(events).toHaveLength(11);
    expect(events[10].type).toBe('all_completed');
  });

  it('calls onError when response is not ok', async () => {
    let errorMsg = '';
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: 'Server error' }), { status: 500 }),
    ) as unknown as typeof fetch;

    await apiSSE('/api/generate', {}, {
      onEvent: () => {},
      onError: (err) => { errorMsg = err.message; },
    });

    expect(errorMsg).toBe('Server error');
  });

  it('calls onComplete when stream ends normally', async () => {
    let completed = false;
    global.fetch = vi.fn().mockResolvedValue(
      createSSEResponse([]),
    ) as unknown as typeof fetch;

    await apiSSE('/api/generate', {}, {
      onEvent: () => {},
      onComplete: () => { completed = true; },
    });

    expect(completed).toBe(true);
  });
});
