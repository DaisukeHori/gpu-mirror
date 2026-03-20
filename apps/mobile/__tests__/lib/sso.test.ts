import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithSSO: vi.fn(),
      setSession: vi.fn(),
      exchangeCodeForSession: vi.fn(),
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
    return {
      params,
      errorCode: params.error_code ?? null,
    };
  },
}));

import {
  buildSsoSignInParams,
  clearBrowserAuthCallback,
  getAuthRedirectUri,
  getSsoTarget,
  hasAuthCallbackParams,
  parseAuthCallback,
} from '../../lib/sso';

describe('sso helpers', () => {
  const originalDomain = process.env.EXPO_PUBLIC_SSO_DOMAIN;
  const originalProviderId = process.env.EXPO_PUBLIC_SSO_PROVIDER_ID;
  const testGlobals = globalThis as unknown as { window?: unknown; document?: unknown };
  const originalWindow = testGlobals.window;
  const originalDocument = testGlobals.document;

  afterEach(() => {
    if (originalDomain === undefined) {
      delete process.env.EXPO_PUBLIC_SSO_DOMAIN;
    } else {
      process.env.EXPO_PUBLIC_SSO_DOMAIN = originalDomain;
    }

    if (originalProviderId === undefined) {
      delete process.env.EXPO_PUBLIC_SSO_PROVIDER_ID;
    } else {
      process.env.EXPO_PUBLIC_SSO_PROVIDER_ID = originalProviderId;
    }

    if (originalWindow === undefined) {
      Reflect.deleteProperty(testGlobals, 'window');
    } else {
      testGlobals.window = originalWindow;
    }

    if (originalDocument === undefined) {
      Reflect.deleteProperty(testGlobals, 'document');
    } else {
      testGlobals.document = originalDocument;
    }
  });

  it('prefers providerId over domain', () => {
    process.env.EXPO_PUBLIC_SSO_DOMAIN = 'revol.co.jp';
    process.env.EXPO_PUBLIC_SSO_PROVIDER_ID = 'provider-123';

    expect(getSsoTarget()).toEqual({ providerId: 'provider-123' });
  });

  it('builds SSO params from the configured domain', () => {
    process.env.EXPO_PUBLIC_SSO_DOMAIN = 'revol.co.jp';
    delete process.env.EXPO_PUBLIC_SSO_PROVIDER_ID;

    expect(buildSsoSignInParams('revol-mirror://login-callback')).toEqual({
      domain: 'revol.co.jp',
      options: {
        redirectTo: 'revol-mirror://login-callback',
        skipBrowserRedirect: true,
      },
    });
  });

  it('throws when no SSO target is configured', () => {
    delete process.env.EXPO_PUBLIC_SSO_DOMAIN;
    delete process.env.EXPO_PUBLIC_SSO_PROVIDER_ID;

    expect(() => buildSsoSignInParams('revol-mirror://login-callback')).toThrow(
      'SAML SSO が未設定です。EXPO_PUBLIC_SSO_DOMAIN または EXPO_PUBLIC_SSO_PROVIDER_ID を設定してください。'
    );
  });

  it('falls back to the native redirect URI when browser location is unavailable', () => {
    testGlobals.window = {};

    expect(getAuthRedirectUri()).toBe('revol-mirror://login-callback');
  });

  it('parses PKCE callback URLs', () => {
    const parsed = parseAuthCallback('https://revol-mirror-admin.vercel.app/login?code=test-code');

    expect(parsed).toMatchObject({
      code: 'test-code',
      accessToken: null,
      refreshToken: null,
      errorCode: null,
    });
    expect(hasAuthCallbackParams('https://revol-mirror-admin.vercel.app/login?code=test-code')).toBe(true);
  });

  it('parses implicit callback URLs from hash fragments', () => {
    const parsed = parseAuthCallback(
      'revol-mirror://login-callback#access_token=token-1&refresh_token=token-2'
    );

    expect(parsed).toMatchObject({
      accessToken: 'token-1',
      refreshToken: 'token-2',
      code: null,
      errorCode: null,
    });
    expect(hasAuthCallbackParams('revol-mirror://login-callback#access_token=token-1')).toBe(true);
  });

  it('clears browser auth callback parameters only when browser history is available', () => {
    const replaceState = vi.fn();
    testGlobals.document = { title: 'Login' };
    testGlobals.window = {
      location: {
        href: 'https://revol-mirror-admin.vercel.app/login?code=test-code',
        origin: 'https://revol-mirror-admin.vercel.app',
        assign: vi.fn(),
      },
      history: {
        replaceState,
      },
    };

    clearBrowserAuthCallback(
      'https://revol-mirror-admin.vercel.app/login?code=test-code#access_token=token-1'
    );

    expect(replaceState).toHaveBeenCalledWith({}, 'Login', '/login');
  });
});
