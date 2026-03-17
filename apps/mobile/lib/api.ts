import { supabase } from './supabase';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }
  return headers;
}

export async function apiGet<T>(path: string): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message ?? `API error: ${res.status}`);
  }
  return res.json();
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message ?? `API error: ${res.status}`);
  }
  return res.json();
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message ?? `API error: ${res.status}`);
  }
  return res.json();
}

export async function apiDelete(path: string): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, { method: 'DELETE', headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message ?? `API error: ${res.status}`);
  }
}

export async function uploadFile(
  path: string,
  file: { uri: string; name: string; type: string },
  sessionId: string,
  bucket: string = 'customer-photos',
): Promise<{ storage_path: string; url: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  const formData = new FormData();
  formData.append('file', file as unknown as Blob);
  formData.append('session_id', sessionId);
  formData.append('bucket', bucket);

  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session?.access_token ?? ''}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message ?? `Upload error: ${res.status}`);
  }
  return res.json();
}

export interface SSECallbacks {
  onEvent: (event: Record<string, unknown>) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
}

export async function apiSSE(
  path: string,
  body: unknown,
  callbacks: SSECallbacks,
  abortSignal?: AbortSignal,
): Promise<void> {
  const headers = await getAuthHeaders();

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: abortSignal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return;
    callbacks.onError?.(err instanceof Error ? err : new Error('Network error'));
    return;
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    callbacks.onError?.(new Error(err.message));
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  let buffer = '';
  let receivedAllCompleted = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            callbacks.onEvent(data);
            if (data.type === 'all_completed') {
              receivedAllCompleted = true;
            }
          } catch {
            // skip malformed JSON
          }
        }
      }
    }
    // Stream ended — notify caller regardless of whether all_completed was received
    callbacks.onComplete?.();
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return;
    callbacks.onError?.(err instanceof Error ? err : new Error('Stream read error'));
  } finally {
    reader.releaseLock();
  }
}
