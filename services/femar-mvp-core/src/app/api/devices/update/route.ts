import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { authErrorResponse, requireAnyRole, requireSession } from '@/lib/auth/server';

export async function POST(req: Request) {
  try {
    const principal = await requireSession(req);
    requireAnyRole(principal, ['tenant_admin', 'hr']);

    const { id, name, location, model } = await req.json();
    if (!id) return NextResponse.json({ error: 'Missing device ID' }, { status: 400 });

    const deviceRef = db.collection('devices').doc(String(id));
    const device = await deviceRef.get();
    if (!device.exists) return NextResponse.json({ error: 'Device not found' }, { status: 404 });

    const data = device.data() || {};
    if (principal.role !== 'master_admin' && String(data.companyId || '') !== principal.tenantId) {
      return NextResponse.json({ error: 'Cross-tenant access denied' }, { status: 403 });
    }

    await deviceRef.update({
      name: String(name || '').trim(),
      location: String(location || '').trim(),
      model: String(model || '').trim(),
      updatedAt: new Date().toISOString(),
      updatedBy: principal.userId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const auth = authErrorResponse(error);
    if (auth) return NextResponse.json(auth.body, { status: auth.status });
    console.error('Error updating device:', error);
    return NextResponse.json({ error: 'Failed to update device' }, { status: 500 });
  }
}
