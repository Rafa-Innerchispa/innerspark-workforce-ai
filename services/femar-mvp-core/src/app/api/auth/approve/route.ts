import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { resolveAllowedModuleIds } from '@/lib/entityEntitlements';
import { requireSuperAdmin } from '@/lib/sessionAuth';

export async function POST(req: Request) {
  try {
    const gate = await requireSuperAdmin();
    if (gate instanceof NextResponse) return gate;

    const { cedula, userId, action, role, companyId: companyOverride } = await req.json();
    const docKey = String(userId || cedula || '').trim();

    if (!docKey || !action) {
      return NextResponse.json({ success: false, message: 'Faltan parámetros' }, { status: 400 });
    }

    const docRef = db.collection('users').doc(docKey);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json({ success: false, message: 'Usuario no encontrado' }, { status: 404 });
    }

    if (action === 'APPROVE') {
      const approvedRole = role || 'employee';
      const existing = doc.data() || {};
      const finalCompanyId = String(companyOverride || existing.companyId || 'pcdoctor').trim();
      const modules = resolveAllowedModuleIds(finalCompanyId, approvedRole, existing.modules);
      await docRef.update({
        status: 'APPROVED',
        role: approvedRole,
        companyId: finalCompanyId,
        modules,
        approvedAt: new Date().toISOString(),
        approvedBy: gate.id,
        updatedAt: new Date().toISOString(),
      });
    } else if (action === 'REJECT') {
      await docRef.update({
        status: 'REJECTED',
        updatedAt: new Date().toISOString()
      });
    }

    return NextResponse.json({ success: true, message: `Usuario ${action === 'APPROVE' ? 'aprobado' : 'rechazado'}` });

  } catch (error) {
    console.error('Error in approval:', error);
    return NextResponse.json({ success: false, message: 'Error interno' }, { status: 500 });
  }
}
