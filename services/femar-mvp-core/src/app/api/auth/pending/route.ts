import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { authErrorResponse, requireAnyRole, requireSession } from '@/lib/auth/server';

function sanitizePendingUser(data: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(data).filter(([key]) => !/(password|token|secret|session)/i.test(key)),
  );
}

export async function GET(req: NextRequest) {
  try {
    const principal = await requireSession(req);
    requireAnyRole(principal, ['tenant_admin']);

    const baseQuery = db.collection('users').where('status', '==', 'PENDING');
    const snapshot = principal.role === 'master_admin'
      ? await baseQuery.get()
      : await baseQuery.where('companyId', '==', principal.tenantId).get();

    const users = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...sanitizePendingUser(doc.data()),
    }));

    return NextResponse.json({ success: true, users });
  } catch (error) {
    const auth = authErrorResponse(error);
    if (auth) return NextResponse.json(auth.body, { status: auth.status });
    console.error('Pending users query error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load pending users' }, { status: 500 });
  }
}
