import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  
  // ZKTeco devices hardcode paths starting with /iclock/ (e.g. /iclock/cdata)
  if (url.pathname.startsWith('/iclock/')) {
    url.pathname = `/api${url.pathname}`;
    return NextResponse.rewrite(url);
  }

  // Force HTTPS redirect for web clients (excluding localhost/dev and biometric ADMS traffic)
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const host = request.headers.get('host') || '';
  if (
    forwardedProto === 'http' &&
    !host.includes('localhost') &&
    !host.includes('127.0.0.1')
  ) {
    const secureUrl = `https://${host}${url.pathname}${url.search}`;
    return NextResponse.redirect(secureUrl, 301);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/iclock/:path*',
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
