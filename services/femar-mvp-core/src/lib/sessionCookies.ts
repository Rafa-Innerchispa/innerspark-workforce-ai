import type { NextResponse } from 'next/server';

export type SessionCookieOptions = {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  path: string;
  domain?: string;
  maxAge?: number;
};

/** Hostnames that share the InnerOS session cookie (creatorcore.ai zone). */
export const SHARED_SESSION_COOKIE_DOMAINS = ['.creatorcore.ai', '.pcdoctor.ai'] as const;

function requestHeaders(req: Request): Headers {
  return req.headers ?? new Headers();
}

export function hostFromRequest(req: Request): string {
  try {
    const headers = requestHeaders(req);
    const forwarded = headers.get('x-forwarded-host') || headers.get('host') || '';
    const fromHeader = forwarded.split(',')[0]?.trim().split(':')[0]?.toLowerCase();
    if (fromHeader) return fromHeader;
  } catch {
    // Mock Request objects in tests may omit headers
  }
  try {
    return new URL(req.url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

export function isSecureRequest(req: Request): boolean {
  const host = hostFromRequest(req);
  if (host.endsWith('.creatorcore.ai') || host.endsWith('.pcdoctor.ai') || host.endsWith('.iskconguayaquil.org')) {
    return true;
  }
  const proto = requestHeaders(req).get('x-forwarded-proto');
  return proto === 'https';
}

export function sessionCookieDomain(host: string): string | undefined {
  if (host.endsWith('.creatorcore.ai') || host === 'creatorcore.ai') return '.creatorcore.ai';
  if (host.endsWith('.pcdoctor.ai') || host === 'pcdoctor.ai') return '.pcdoctor.ai';
  return undefined;
}

export function buildSessionCookieOptions(req: Request, maxAge?: number): SessionCookieOptions {
  const host = hostFromRequest(req);
  const secure = isSecureRequest(req);
  const domain = sessionCookieDomain(host);
  return {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    ...(domain ? { domain } : {}),
    ...(maxAge !== undefined ? { maxAge } : {}),
  };
}

export const SESSION_COOKIE_MAX_AGE_SEC = 86400 * 30;

export function applySessionCookies(
  response: NextResponse,
  req: Request,
  userId: string,
  companyId?: string,
): void {
  const opts = buildSessionCookieOptions(req, SESSION_COOKIE_MAX_AGE_SEC);
  response.cookies.set('session_token', userId, opts);
  if (companyId) {
    response.cookies.set('inneros_entity', companyId, {
      ...opts,
      httpOnly: false,
      maxAge: 86400 * 30,
    });
  }
}

export function clearSessionCookies(response: NextResponse, req: Request): void {
  const opts = buildSessionCookieOptions(req, 0);
  response.cookies.set('session_token', '', opts);
  response.cookies.set('inneros_entity', '', { ...opts, httpOnly: false });
}
