import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  
  // ZKTeco devices hardcode paths starting with /iclock/ (e.g. /iclock/cdata)
  if (url.pathname.startsWith('/iclock/')) {
    url.pathname = `/api${url.pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/iclock/:path*',
};
