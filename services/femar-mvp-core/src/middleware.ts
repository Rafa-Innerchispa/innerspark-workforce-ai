import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { INNEROS_APP_HOSTS, ISKCON_HOSTS, MODULE_HOST_ALIASES } from '@/lib/publicDomains';

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const host = (request.headers.get('host') || '').split(':')[0].toLowerCase();

  if (host in MODULE_HOST_ALIASES) {
    const target = new URL(MODULE_HOST_ALIASES[host]);
    url.hostname = target.hostname;
    url.pathname = target.pathname === '/' ? url.pathname : target.pathname;
    if (url.toString() !== request.nextUrl.toString()) {
      return NextResponse.redirect(url, 308);
    }
  }

  if (url.pathname.startsWith('/iclock/')) {
    url.pathname = `/api${url.pathname}`;
    return NextResponse.rewrite(url);
  }

  const isAppHost = INNEROS_APP_HOSTS.has(host);
  if (isAppHost) {
    const path = url.pathname;
    if (
      path.startsWith('/api') ||
      path.startsWith('/_next') ||
      path.startsWith('/app') ||
      path.startsWith('/static') ||
      path.startsWith('/brands') ||
      path.startsWith('/desk') ||
      path === '/favicon.ico'
    ) {
      const requestHeaders = new Headers(request.headers);
      if (!requestHeaders.get('x-forwarded-host')) {
        requestHeaders.set('x-forwarded-host', host);
      }
      const res = NextResponse.next({ request: { headers: requestHeaders } });
      if (ISKCON_HOSTS.has(host)) {
        res.cookies.set('inneros_entity', 'iskcon', { path: '/', sameSite: 'lax' });
      }
      return res;
    }
    if (path === '/' || path === '/login' || path === '/register') {
      if (ISKCON_HOSTS.has(host) && path === '/') {
        url.pathname = '/app/desk';
      } else {
        url.pathname = path === '/register' ? '/app/register' : '/app/login';
      }
      const res = NextResponse.redirect(url);
      if (ISKCON_HOSTS.has(host)) {
        res.cookies.set('inneros_entity', 'iskcon', { path: '/', sameSite: 'lax' });
      }
      return res;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
