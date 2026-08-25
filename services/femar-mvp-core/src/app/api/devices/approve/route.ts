import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { authErrorResponse, requireAnyRole, requireSession, tenantForRequest } from '@/lib/auth/server';

export async function POST(req: NextRequest) {
  try {
    const principal = await requireSession(req);
    requireAnyRole(principal, ['tenant_admin']);
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'Missing device ID' }, { status: 400 });

    const deviceRef = db.collection('devices').doc(String(id));
    const deviceSnap = await deviceRef.get();
    if (!deviceSnap.exists) return NextResponse.json({ error: 'Device not found' }, { status: 404 });

    const device = deviceSnap.data() || {};
    const tenantId = tenantForRequest(principal, String(device.companyId || device.tenantId || ''));
    const now = new Date().toISOString();
    await deviceRef.update({
      status: 'activo',
      companyId: tenantId,
      approved_at: now,
      approved_by: principal.userId,
    });
    await db.collection('audit_events').add({
      type: 'DEVICE_APPROVED',
      actorUserId: principal.userId,
      actorTenantId: principal.tenantId,
      deviceId: String(id),
      targetTenantId: tenantId,
      createdAt: now,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const auth = authErrorResponse(error);
    if (auth) return NextResponse.json(auth.body, { status: auth.status });
    console.error('Error approving device:', error);
    return NextResponse.json({ error: 'Failed to approve device' }, { status: 500 });
  }
}
