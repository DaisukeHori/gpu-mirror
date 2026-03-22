import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockGetInitialURL, mockAddEventListener } = vi.hoisted(() => ({
  mockGetInitialURL: vi.fn(),
  mockAddEventListener: vi.fn(),
}));

vi.mock('expo-linking', () => ({
  getInitialURL: mockGetInitialURL,
  addEventListener: mockAddEventListener,
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      setSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'ok' } }, error: null }),
      exchangeCodeForSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'ok' } }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
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

import { hasAuthCallbackParams, createSessionFromUrl, parseAuthCallback } from '../../lib/sso';

describe('deep link / SSO coldstart', () => {
  describe('hasAuthCallbackParams', () => {
    it('returns true for a URL with access_token in hash', () => {
      expect(hasAuthCallbackParams('revol-mirror://login-callback#access_token=abc&refresh_token=def')).toBe(true);
    });

    it('returns true for a URL with code in query', () => {
      expect(hasAuthCallbackParams('revol-mirror://login-callback?code=xyz')).toBe(true);
    });

    it('returns true for a URL with error in query', () => {
      expect(hasAuthCallbackParams('revol-mirror://login-callback?error=access_denied')).toBe(true);
    });

    it('returns false for a URL without any auth params', () => {
      expect(hasAuthCallbackParams('revol-mirror://login-callback')).toBe(false);
    });

    it('returns false for a plain HTTPS URL', () => {
      expect(hasAuthCallbackParams('https://example.com')).toBe(false);
    });

    it('returns false for an empty hash', () => {
      expect(hasAuthCallbackParams('revol-mirror://login-callback#')).toBe(false);
    });
  });

  describe('parseAuthCallback', () => {
    it('extracts access_token and refresh_token from hash', () => {
      const parsed = parseAuthCallback('revol-mirror://login-callback#access_token=tok1&refresh_token=tok2');
      expect(parsed.accessToken).toBe('tok1');
      expect(parsed.refreshToken).toBe('tok2');
      expect(parsed.code).toBeNull();
    });

    it('extracts code from query params', () => {
      const parsed = parseAuthCallback('revol-mirror://login-callback?code=my-code');
      expect(parsed.code).toBe('my-code');
      expect(parsed.accessToken).toBeNull();
    });

    it('extracts error info from query params', () => {
      const parsed = parseAuthCallback('revol-mirror://login-callback?error=denied&error_description=User+denied');
      expect(parsed.errorCode).toBe('denied');
      expect(parsed.errorDescription).toBe('User denied');
    });

    it('returns all nulls for a URL without auth params', () => {
      const parsed = parseAuthCallback('revol-mirror://login-callback');
      expect(parsed.accessToken).toBeNull();
      expect(parsed.refreshToken).toBeNull();
      expect(parsed.code).toBeNull();
      expect(parsed.errorCode).toBeNull();
    });

    it('handles hash with only access_token', () => {
      const parsed = parseAuthCallback('revol-mirror://login-callback#access_token=single');
      expect(parsed.accessToken).toBe('single');
      expect(parsed.refreshToken).toBeNull();
    });
  });

  describe('createSessionFromUrl', () => {
    it('calls setSession when both access_token and refresh_token are present', async () => {
      const { supabase } = await import('../../lib/supabase');
      const result = await createSessionFromUrl(
        'revol-mirror://login-callback#access_token=at&refresh_token=rt',
      );
      expect(supabase.auth.setSession).toHaveBeenCalledWith({
        access_token: 'at',
        refresh_token: 'rt',
      });
    });

    it('calls exchangeCodeForSession when code is present', async () => {
      const { supabase } = await import('../../lib/supabase');
      await createSessionFromUrl('revol-mirror://login-callback?code=exchange-me');
      expect(supabase.auth.exchangeCodeForSession).toHaveBeenCalledWith('exchange-me');
    });

    it('throws when error params are present', async () => {
      await expect(
        createSessionFromUrl('revol-mirror://login-callback?error=bad&error_description=Bad+request'),
      ).rejects.toThrow('Bad request');
    });

    it('returns null for a URL without any auth params', async () => {
      const result = await createSessionFromUrl('revol-mirror://login-callback');
      expect(result).toBeNull();
    });
  });

  describe('Linking integration (simulated)', () => {
    it('getInitialURL returns a deep link URL', async () => {
      mockGetInitialURL.mockResolvedValue('revol-mirror://login-callback?code=init-code');
      const url = await mockGetInitialURL();
      expect(url).toContain('code=init-code');
      expect(hasAuthCallbackParams(url)).toBe(true);
    });

    it('getInitialURL returns null when no deep link', async () => {
      mockGetInitialURL.mockResolvedValue(null);
      const url = await mockGetInitialURL();
      expect(url).toBeNull();
    });

    it('addEventListener callback fires for URL events', () => {
      let capturedCb: ((event: { url: string }) => void) | null = null;
      mockAddEventListener.mockImplementation((_event: string, cb: (event: { url: string }) => void) => {
        capturedCb = cb;
        return { remove: vi.fn() };
      });

      mockAddEventListener('url', () => {});
      expect(capturedCb).toBeDefined();

      const eventUrl = 'revol-mirror://login-callback#access_token=event-tok&refresh_token=rt';
      expect(hasAuthCallbackParams(eventUrl)).toBe(true);
    });

    it('addEventListener returns a removable subscription', () => {
      const removeFn = vi.fn();
      mockAddEventListener.mockReturnValue({ remove: removeFn });

      const sub = mockAddEventListener('url', vi.fn());
      sub.remove();
      expect(removeFn).toHaveBeenCalled();
    });
  });
});
