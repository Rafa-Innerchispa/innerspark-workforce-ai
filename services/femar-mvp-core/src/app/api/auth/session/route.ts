import { NextResponse } from 'next/server';
import { authErrorResponse, requireSession } from '@/lib/auth/server';

export async function GET(req: Request) {
  try {
    const principal = await requireSession(req);
    return NextResponse.json({
      success: true,
      user: {
        id: principal.userId,
        name: principal.displayName || principal.userId,
        role: principal.role,
        companyId: principal.tenantId,
      },
      session: { expiresAt: principal.expiresAt },
    });
  } catch (error) {
    const auth = authErrorResponse(error);
    if (auth) return NextResponse.json(auth.body, { status: auth.status });
    return NextResponse.json({ success: false, message: 'Session check failed' }, { status: 500 });
  }
}
