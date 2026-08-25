import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { AuthError, authErrorResponse, requireAnyRole, requireSession, tenantForRequest } from '@/lib/auth/server';
import { assertLeaveRange, defaultPayTreatment, isLeaveType } from '@/lib/leave/policy';

export async function GET(req: NextRequest) {
  try {
    const principal = await requireSession(req);
    const url = new URL(req.url);
    const tenantId = tenantForRequest(principal, url.searchParams.get('companyId'));
    const snapshot = await db.collection('leave_requests').where('tenantId', '==', tenantId).get();
    let requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Array<Record<string, unknown>>;

    if (principal.role === 'employee') {
      requests = requests.filter(item => String(item.employeeId) === principal.userId);
    }

    requests.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    return NextResponse.json({ success: true, tenantId, requests });
  } catch (error) {
    const auth = authErrorResponse(error);
    if (auth) return NextResponse.json(auth.body, { status: auth.status });
    return NextResponse.json({ error: 'Failed to load leave requests' }, { status: 500 });
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
      const type = String(body.type || '').toUpperCase();
      if (!isLeaveType(type)) return NextResponse.json({ error: 'leave_type_invalid' }, { status: 400 });
      const startDate = String(body.startDate || '');
      const endDate = String(body.endDate || '');
      const days = assertLeaveRange(startDate, endDate);
      const requestedEmployeeId = body.employeeId ? String(body.employeeId) : principal.userId;

      if (principal.role === 'employee' && requestedEmployeeId !== principal.userId) {
        throw new AuthError(403, 'leave_cross_employee_forbidden', 'Un empleado sólo puede solicitar permisos para sí mismo');
      }
      if (principal.role !== 'employee') {
        requireAnyRole(principal, ['tenant_admin', 'hr', 'payroll_approver', 'supervisor']);
      }

      const employeeSnap = await db.collection('employees').doc(requestedEmployeeId).get();
      if (!employeeSnap.exists) return NextResponse.json({ error: 'employee_not_found' }, { status: 404 });
      const employee = employeeSnap.data() || {};
      if (String(employee.companyId || employee.tenantId || '') !== tenantId) {
        throw new AuthError(403, 'cross_tenant_forbidden', 'El empleado pertenece a otra empresa');
      }

      const payTreatment = body.payTreatment && ['paid', 'unpaid', 'policy_defined'].includes(String(body.payTreatment))
        ? String(body.payTreatment)
        : defaultPayTreatment(type);

      const ref = db.collection('leave_requests').doc();
      const record = {
        tenantId,
        employeeId: requestedEmployeeId,
        employeeName: String(employee.name || requestedEmployeeId),
        type,
        startDate,
        endDate,
        days,
        reason: String(body.reason || '').trim(),
        payTreatment,
        status: 'pending',
        requestedBy: principal.userId,
        createdAt: now,
        updatedAt: now,
      };
      await ref.set(record);
      await db.collection('audit_events').add({ type: 'LEAVE_REQUEST_CREATED', actorUserId: principal.userId, actorTenantId: principal.tenantId, targetTenantId: tenantId, leaveRequestId: ref.id, employeeId: requestedEmployeeId, createdAt: now });
      return NextResponse.json({ success: true, request: { id: ref.id, ...record } });
    }

    const requestId = String(body.id || '');
    if (!requestId) return NextResponse.json({ error: 'leave_request_id_required' }, { status: 400 });
    const ref = db.collection('leave_requests').doc(requestId);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: 'leave_request_not_found' }, { status: 404 });
    const request = snap.data() || {};
    tenantForRequest(principal, String(request.tenantId || ''));

    if (action === 'cancel') {
      const ownsRequest = String(request.employeeId || '') === principal.userId;
      if (!ownsRequest && principal.role === 'employee') throw new AuthError(403, 'leave_cancel_forbidden', 'No puedes cancelar solicitudes de otro empleado');
      if (request.status !== 'pending') return NextResponse.json({ error: 'leave_not_pending' }, { status: 409 });
      await ref.update({ status: 'cancelled', cancelledBy: principal.userId, cancelledAt: now, updatedAt: now });
      await db.collection('audit_events').add({ type: 'LEAVE_REQUEST_CANCELLED', actorUserId: principal.userId, actorTenantId: principal.tenantId, leaveRequestId: requestId, createdAt: now });
      return NextResponse.json({ success: true });
    }

    if (action === 'approve' || action === 'reject') {
      requireAnyRole(principal, ['tenant_admin', 'hr', 'supervisor']);
      if (request.status !== 'pending') return NextResponse.json({ error: 'leave_not_pending' }, { status: 409 });
      const status = action === 'approve' ? 'approved' : 'rejected';
      const decisionReason = String(body.decisionReason || '').trim();
      await ref.update({ status, decidedBy: principal.userId, decidedAt: now, decisionReason, updatedAt: now });
      await db.collection('audit_events').add({ type: status === 'approved' ? 'LEAVE_REQUEST_APPROVED' : 'LEAVE_REQUEST_REJECTED', actorUserId: principal.userId, actorTenantId: principal.tenantId, targetTenantId: tenantId, leaveRequestId: requestId, employeeId: request.employeeId, decisionReason, createdAt: now });
      return NextResponse.json({ success: true, status });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error) {
    const auth = authErrorResponse(error);
    if (auth) return NextResponse.json(auth.body, { status: auth.status });
    const message = error instanceof Error ? error.message : 'Leave operation failed';
    const status = message.startsWith('leave_') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
