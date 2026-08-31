import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();

  // Public hackathon Judge surface. Keep the canonical URL while serving a
  // standalone static UI that is independent from the authenticated Workforce shell.
  if (url.pathname === '/app/judge') {
    url.pathname = '/judge.html';
    return NextResponse.rewrite(url);
  }

  // ZKTeco devices hardcode paths starting with /iclock/ (e.g. /iclock/cdata)
  if (url.pathname.startsWith('/iclock/')) {
    url.pathname = `/api${url.pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/app/judge', '/iclock/:path*'],
};
