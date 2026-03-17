import { NextRequest } from 'next/server';

export function createRequest(
  url: string,
  options: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
  } = {},
): NextRequest {
  const { method = 'GET', body, headers = {} } = options;

  const fullUrl = url.startsWith('http') ? url : `http://localhost:3000${url}`;
  const init = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer test-token',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new NextRequest(fullUrl, init as any);
}

export async function parseResponse(response: Response) {
  const json = await response.json();
  return { status: response.status, body: json };
}
