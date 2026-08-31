import crypto from 'crypto';
import { INNEROS_SHELL_HOSTS } from '@/lib/publicDomains';

const GOOGLE_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO = 'https://www.googleapis.com/oauth2/v3/userinfo';

export function googleOAuthConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function oauthRedirectUri(origin: string): string {
  const configured = process.env.INNEROS_OAUTH_REDIRECT_URI?.trim();
  if (configured && process.env.INNEROS_OAUTH_REDIRECT_URI_FORCE === 'true') {
    return configured;
  }
  return `${origin.replace(/\/$/, '')}/api/auth/google/callback`;
}

function publicOriginFallback(): string {
  return (process.env.INNEROS_PUBLIC_ORIGIN || 'https://inneros.creatorcore.ai').replace(/\/$/, '');
}

/** Next.js 16 route handlers require absolute redirect URLs behind middleware/proxy. */
export function absoluteAppRedirect(origin: string, path: string): URL {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const candidates = [origin, publicOriginFallback()].filter((v) => {
    if (!v.startsWith('http')) return false;
    try {
      return !isInvalidBindHost(new URL(v).host);
    } catch {
      return false;
    }
  });
  for (const base of candidates) {
    try {
      return new URL(normalized, `${base.replace(/\/$/, '')}/`);
    } catch {
      continue;
    }
  }
  return new URL(normalized, `${publicOriginFallback()}/`);
}

function firstForwardedValue(value: string | null | undefined): string | null {
  return value?.split(',')[0]?.trim() || null;
}

function isLoopbackHost(host: string): boolean {
  return host === 'localhost' || host.startsWith('localhost:') || host.startsWith('127.');
}

function isInvalidBindHost(host: string): boolean {
  const name = hostOnly(host);
  return !name || name === '0.0.0.0' || isLoopbackHost(name);
}

function hostOnly(value: string): string {
  return value.split(':')[0].toLowerCase();
}

export function resolveOAuthOrigin(
  requestUrl: URL,
  cookieOrigin?: string | null,
  requestHeaders?: Headers
): string {
  if (cookieOrigin?.startsWith('http')) return cookieOrigin.replace(/\/$/, '');

  const forwardedHost = firstForwardedValue(requestHeaders?.get('x-forwarded-host'));
  const hostHeader = firstForwardedValue(requestHeaders?.get('host'));
  const forwardedHostName = forwardedHost ? hostOnly(forwardedHost) : null;
  const host = forwardedHost || hostHeader || requestUrl.host;
  const hostName = hostOnly(host);
  const forwardedProto = firstForwardedValue(requestHeaders?.get('x-forwarded-proto'));
  const shellHost =
    (forwardedHostName && INNEROS_SHELL_HOSTS.has(forwardedHostName) && forwardedHostName) ||
    (hostName && INNEROS_SHELL_HOSTS.has(hostName) && hostName) ||
    null;
  const proto =
    forwardedProto ||
    (shellHost ? 'https' : null) ||
    requestUrl.protocol.replace(':', '') ||
    'https';

  if (shellHost) {
    return `${proto}://${shellHost}`.replace(/\/$/, '');
  }

  if (host && !isInvalidBindHost(host)) {
    return `${proto}://${hostOnly(host)}`.replace(/\/$/, '');
  }

  const urlHost = hostOnly(requestUrl.hostname);
  if (urlHost && !isInvalidBindHost(urlHost)) {
    return `${proto}://${urlHost}`.replace(/\/$/, '');
  }

  return publicOriginFallback();
}

export function buildGoogleAuthUrl(origin: string, state: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const redirectUri = oauthRedirectUri(origin);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'online',
    prompt: 'select_account',
    state,
  });
  return `${GOOGLE_AUTH}?${params.toString()}`;
}

export async function exchangeGoogleCode(
  code: string,
  origin: string
): Promise<{ access_token: string }> {
  const body = new URLSearchParams({
    code,
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    redirect_uri: oauthRedirectUri(origin),
    grant_type: 'authorization_code',
  });
  const res = await fetch(GOOGLE_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    throw new Error(`google_token_error:${res.status}`);
  }
  return res.json();
}

export async function fetchGoogleProfile(accessToken: string): Promise<{
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
}> {
  const res = await fetch(GOOGLE_USERINFO, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`google_userinfo_error:${res.status}`);
  }
  return res.json();
}

export function newOAuthState(): string {
  return crypto.randomBytes(24).toString('hex');
}

export function mapGoogleEmailToCompany(email: string, host: string): string {
  const lower = email.toLowerCase();
  const hostEntity =
    host.includes('iskconguayaquil.org') || host.includes('iskcon.') ? 'iskcon' : null;
  if (hostEntity) return hostEntity;
  if (lower.includes('iskcon') || lower.endsWith('@iskconguayaquil.org')) return 'iskcon';
  if (lower.includes('femar')) return 'femar';
  if (lower.includes('innerchispa')) return 'iapro';
  if (lower === 'rafagye@gmail.com') return 'pcdoctor';
  return 'pcdoctor';
}
