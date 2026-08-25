import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { authErrorResponse, requireSession, tenantForRequest } from '@/lib/auth/server';

export async function GET(req: NextRequest) {
  try {
    const principal = await requireSession(req);
    const requestedTenant = new URL(req.url).searchParams.get('companyId');
    const tenantId = tenantForRequest(principal, requestedTenant);
    const snapshot = await db.collection('devices').where('companyId', '==', tenantId).get();

    const pending: Record<string, unknown>[] = [];
    const active: Record<string, unknown>[] = [];
    snapshot.forEach(doc => {
      const data = { id: doc.id, ...doc.data() };
      if (['pendiente', 'pending'].includes(String((data as { status?: string }).status || ''))) pending.push(data);
      else if (['activo', 'active', 'aprobado'].includes(String((data as { status?: string }).status || ''))) active.push(data);
    });

    return NextResponse.json({ pending, active, tenantId });
  } catch (error) {
    const auth = authErrorResponse(error);
    if (auth) return NextResponse.json(auth.body, { status: auth.status });
    console.error('Error fetching devices:', error);
    return NextResponse.json({ error: 'Failed to fetch devices' }, { status: 500 });
  }
}
