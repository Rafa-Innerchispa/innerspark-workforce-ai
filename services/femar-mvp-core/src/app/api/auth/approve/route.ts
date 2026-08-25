import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import {
  assertApprovalAllowed,
  authErrorResponse,
  normalizeRole,
  requireSession,
} from '@/lib/auth/server';

export async function POST(req: Request) {
  try {
    const principal = await requireSession(req);
    const { cedula, action, role } = await req.json();
    if (!cedula || !['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json({ success: false, message: 'Solicitud inválida' }, { status: 400 });
    }

    const docRef = db.collection('users').doc(String(cedula));
    const doc = await docRef.get();
    if (!doc.exists) {
      return NextResponse.json({ success: false, message: 'Usuario no encontrado' }, { status: 404 });
    }

    const target = doc.data() || {};
    const targetTenantId = String(target.requestedCompanyId || target.companyId || target.tenantId || '');
    const targetRole = normalizeRole(String(role || target.role || 'employee'));
    assertApprovalAllowed(principal, targetTenantId, targetRole);

    const now = new Date().toISOString();
    if (action === 'APPROVE') {
      await docRef.update({
        status: 'APPROVED',
        companyId: targetTenantId,
        requestedCompanyId: target.requestedCompanyId || targetTenantId,
        role: targetRole,
        approvedAt: now,
        approvedBy: principal.userId,
        updatedAt: now,
      });
    } else {
      await docRef.update({
        status: 'REJECTED',
        rejectedAt: now,
        rejectedBy: principal.userId,
        updatedAt: now,
      });
    }

    await db.collection('audit_events').add({
      type: action === 'APPROVE' ? 'USER_APPROVED' : 'USER_REJECTED',
      actorUserId: principal.userId,
      actorTenantId: principal.tenantId,
      actorRole: principal.role,
      targetUserId: String(cedula),
      targetTenantId,
      targetRole,
      createdAt: now,
    });

    return NextResponse.json({
      success: true,
      message: action === 'APPROVE' ? 'Usuario aprobado' : 'Usuario rechazado',
    });
  } catch (error) {
    const auth = authErrorResponse(error);
    if (auth) return NextResponse.json(auth.body, { status: auth.status });
    console.error('Error in approval:', error);
    return NextResponse.json({ success: false, message: 'Error interno' }, { status: 500 });
  }
}
