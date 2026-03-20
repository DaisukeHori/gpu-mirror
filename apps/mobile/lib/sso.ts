import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import { getBrowserLocation, replaceBrowserHistory } from './browser';
import { supabase } from './supabase';

type SsoSignInParams = Parameters<typeof supabase.auth.signInWithSSO>[0];

interface ParsedAuthCallback {
  accessToken: string | null;
  refreshToken: string | null;
  code: string | null;
  errorCode: string | null;
  errorDescription: string | null;
}

function getStringParam(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function getSsoTarget(): { providerId: string } | { domain: string } | null {
  const providerId = process.env.EXPO_PUBLIC_SSO_PROVIDER_ID?.trim();
  if (providerId) {
    return { providerId };
  }

  const domain = process.env.EXPO_PUBLIC_SSO_DOMAIN?.trim();
  if (domain) {
    return { domain };
  }

  return null;
}

export function getAuthRedirectUri(): string {
  const browserLocation = getBrowserLocation();
  if (browserLocation) {
    return `${browserLocation.origin}/login`;
  }

  return makeRedirectUri({
    scheme: 'revol-mirror',
    path: 'login-callback',
  });
}

export function buildSsoSignInParams(redirectTo = getAuthRedirectUri()): SsoSignInParams {
  const target = getSsoTarget();

  if (!target) {
    throw new Error(
      'SAML SSO が未設定です。EXPO_PUBLIC_SSO_DOMAIN または EXPO_PUBLIC_SSO_PROVIDER_ID を設定してください。'
    );
  }

  return {
    ...target,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  };
}

export function parseAuthCallback(url: string): ParsedAuthCallback {
  const { params, errorCode } = QueryParams.getQueryParams(url);

  return {
    accessToken: getStringParam(params.access_token),
    refreshToken: getStringParam(params.refresh_token),
    code: getStringParam(params.code),
    errorCode: getStringParam(errorCode) ?? getStringParam(params.error),
    errorDescription: getStringParam(params.error_description),
  };
}

export function hasAuthCallbackParams(url: string): boolean {
  const parsed = parseAuthCallback(url);

  return Boolean(parsed.accessToken || parsed.refreshToken || parsed.code || parsed.errorCode);
}

export async function createSessionFromUrl(url: string) {
  const parsed = parseAuthCallback(url);

  if (parsed.errorCode) {
    throw new Error(parsed.errorDescription ?? parsed.errorCode);
  }

  if (parsed.accessToken && parsed.refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: parsed.accessToken,
      refresh_token: parsed.refreshToken,
    });

    if (error) {
      throw error;
    }

    return data.session;
  }

  if (parsed.code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(parsed.code);

    if (error) {
      throw error;
    }

    return data.session;
  }

  return null;
}

export function clearBrowserAuthCallback(url: string) {
  if (!getBrowserLocation()) {
    return;
  }

  const parsedUrl = new URL(url);
  const searchParams = parsedUrl.searchParams;

  searchParams.delete('code');
  searchParams.delete('error');
  searchParams.delete('error_description');
  parsedUrl.hash = '';

  const nextUrl = `${parsedUrl.pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
  replaceBrowserHistory(nextUrl);
}
