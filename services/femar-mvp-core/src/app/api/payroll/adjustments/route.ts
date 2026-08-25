import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { AuthError, authErrorResponse, requireAnyRole, requireSession, tenantForRequest } from '@/lib/auth/server';
import { assertAdjustment } from '@/lib/payroll/adjustment';

export async function GET(req: NextRequest) {
  try {
    const principal = await requireSession(req);
    const url = new URL(req.url);
    const tenantId = tenantForRequest(principal, url.searchParams.get('companyId'));
    const period = url.searchParams.get('period');
    const snapshot = await db.collection('payroll_adjustments').where('tenantId', '==', tenantId).get();
    let adjustments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Array<Record<string, unknown>>;
    if (period) adjustments = adjustments.filter(item => String(item.period) === period);
    adjustments.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    return NextResponse.json({ success: true, adjustments });
  } catch (error) {
    const auth = authErrorResponse(error);
    if (auth) return NextResponse.json(auth.body, { status: auth.status });
    return NextResponse.json({ error: 'Failed to load payroll adjustments' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const principal = await requireSession(req);
    const body = await req.json();
    const action = String(body.action || 'create');
    const tenantId = tenantForRequest(principal, body.companyId ? String(body.companyId) : null);
    const now = new Date().toISOString();

    if (action === 'create') {
      requireAnyRole(principal, ['tenant_admin', 'hr', 'payroll_approver']);
      const employeeId = String(body.employeeId || '');
      const period = String(body.period || '');
      const label = String(body.label || '');
      const amount = Number(body.amount);
      const kind = String(body.kind || '');
      assertAdjustment({ label, amount, kind, period });
      if (!employeeId) return NextResponse.json({ error: 'employee_required' }, { status: 400 });

      const employeeSnap = await db.collection('employees').doc(employeeId).get();
      if (!employeeSnap.exists) return NextResponse.json({ error: 'employee_not_found' }, { status: 404 });
      const employee = employeeSnap.data() || {};
      if (String(employee.companyId || employee.tenantId || '') !== tenantId) throw new AuthError(403, 'cross_tenant_forbidden', 'El empleado pertenece a otra empresa');

      const ref = db.collection('payroll_adjustments').doc();
      const record = {
        tenantId,
        employeeId,
        employeeName: String(employee.name || employeeId),
        period,
        label: label.trim(),
        amount,
        kind,
        status: 'pending',
        createdBy: principal.userId,
        createdAt: now,
        updatedAt: now,
      };
      await ref.set(record);
      await db.collection('audit_events').add({ type: 'PAYROLL_ADJUSTMENT_CREATED', actorUserId: principal.userId, actorTenantId: principal.tenantId, targetTenantId: tenantId, adjustmentId: ref.id, employeeId, period, createdAt: now });
      return NextResponse.json({ success: true, adjustment: { id: ref.id, ...record } });
    }

    const id = String(body.id || '');
    if (!id) return NextResponse.json({ error: 'adjustment_id_required' }, { status: 400 });
    const ref = db.collection('payroll_adjustments').doc(id);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: 'adjustment_not_found' }, { status: 404 });
    const adjustment = snap.data() || {};
    tenantForRequest(principal, String(adjustment.tenantId || ''));

    if (action === 'approve' || action === 'reject') {
      requireAnyRole(principal, ['tenant_admin', 'payroll_approver']);
      if (adjustment.status !== 'pending') return NextResponse.json({ error: 'adjustment_not_pending' }, { status: 409 });
      if (String(adjustment.createdBy || '') === principal.userId && principal.role !== 'master_admin') {
        throw new AuthError(409, 'maker_checker_required', 'Otro usuario autorizado debe aprobar el ajuste');
      }
      const status = action === 'approve' ? 'approved' : 'rejected';
      const decisionReason = String(body.decisionReason || '').trim();
      await ref.update({ status, decidedBy: principal.userId, decidedAt: now, decisionReason, updatedAt: now });
      await db.collection('audit_events').add({ type: status === 'approved' ? 'PAYROLL_ADJUSTMENT_APPROVED' : 'PAYROLL_ADJUSTMENT_REJECTED', actorUserId: principal.userId, actorTenantId: principal.tenantId, targetTenantId: tenantId, adjustmentId: id, employeeId: adjustment.employeeId, period: adjustment.period, decisionReason, createdAt: now });
      return NextResponse.json({ success: true, status });
    }

    if (action === 'cancel') {
      const owns = String(adjustment.createdBy || '') === principal.userId;
      if (!owns && principal.role !== 'master_admin' && principal.role !== 'tenant_admin') throw new AuthError(403, 'adjustment_cancel_forbidden', 'No puedes cancelar este ajuste');
      if (adjustment.status !== 'pending') return NextResponse.json({ error: 'adjustment_not_pending' }, { status: 409 });
      await ref.update({ status: 'cancelled', cancelledBy: principal.userId, cancelledAt: now, updatedAt: now });
      return NextResponse.json({ success: true, status: 'cancelled' });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error) {
    const auth = authErrorResponse(error);
    if (auth) return NextResponse.json(auth.body, { status: auth.status });
    const message = error instanceof Error ? error.message : 'Payroll adjustment operation failed';
    const status = message.startsWith('adjustment_') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
