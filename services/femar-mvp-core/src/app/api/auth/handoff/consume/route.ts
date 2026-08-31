import { NextResponse } from 'next/server';
import { verifyInnerOSHandoffToken } from '@/lib/innerosHandoff';
import { applySessionCookies, hostFromRequest } from '@/lib/sessionCookies';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  const redirect = url.searchParams.get('redirect') || '/';
  const host = hostFromRequest(req);

  if (!token) {
    return NextResponse.json({ ok: false, error: 'Missing handoff token' }, { status: 400 });
  }

  const payload = verifyInnerOSHandoffToken(token, host);
  if (!payload) {
    return NextResponse.json({ ok: false, error: 'Invalid or expired handoff token' }, { status: 401 });
  }

  const safeRedirect = redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/';
  const response = NextResponse.json({
    ok: true,
    userId: payload.sub,
    companyId: payload.companyId,
    role: payload.role,
    moduleId: payload.moduleId,
    redirect: safeRedirect,
  });

  applySessionCookies(response, req, payload.sub, payload.companyId);
  return response;
}
