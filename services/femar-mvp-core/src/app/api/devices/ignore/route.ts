import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { authErrorResponse, requireAnyRole, requireSession } from '@/lib/auth/server';

export async function POST(req: Request) {
  try {
    const principal = await requireSession(req);
    requireAnyRole(principal, ['tenant_admin', 'hr']);

    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'Device ID is required' }, { status: 400 });

    const deviceRef = db.collection('devices').doc(String(id));
    const device = await deviceRef.get();
    if (!device.exists) return NextResponse.json({ error: 'Device not found' }, { status: 404 });

    const data = device.data() || {};
    if (principal.role !== 'master_admin' && String(data.companyId || '') !== principal.tenantId) {
      return NextResponse.json({ error: 'Cross-tenant access denied' }, { status: 403 });
    }

    await deviceRef.update({ status: 'ignorado', updatedAt: new Date().toISOString() });
    return NextResponse.json({ success: true });
  } catch (error) {
    const auth = authErrorResponse(error);
    if (auth) return NextResponse.json(auth.body, { status: auth.status });
    console.error('Error ignoring device:', error);
    return NextResponse.json({ error: 'Failed to ignore device' }, { status: 500 });
  }
}
