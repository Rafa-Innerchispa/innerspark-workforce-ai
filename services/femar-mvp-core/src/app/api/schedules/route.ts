import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import {
  authErrorResponse,
  requireAnyRole,
  requireSession,
  tenantForRequest,
} from '@/lib/auth/server';

const ALLOWED_STATUSES = new Set([
  'PENDING',
  'COMPLETED',
  'LATE',
  'UNEXCUSED_ABSENCE',
  'VACATION',
  'LEAVE',
]);

function serverError(error: unknown, operation: string) {
  const auth = authErrorResponse(error);
  if (auth) return NextResponse.json(auth.body, { status: auth.status });
  console.error(`Schedule ${operation} error:`, error);
  return NextResponse.json({ error: `Failed to ${operation} schedule` }, { status: 500 });
}

export async function GET(req: NextRequest) {
  try {
    const principal = await requireSession(req);
    const requestedTenant = new URL(req.url).searchParams.get('companyId');
    const tenantId = tenantForRequest(principal, requestedTenant);

    const snapshot = await db
      .collection('schedules')
      .where('companyId', '==', tenantId)
      .orderBy('date', 'desc')
      .limit(500)
      .get();

    return NextResponse.json({
      schedules: snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      tenantId,
    });
  } catch (error) {
    return serverError(error, 'fetch');
  }
}

export async function POST(req: NextRequest) {
  try {
    const principal = await requireSession(req);
    requireAnyRole(principal, ['tenant_admin', 'hr']);

    const body = await req.json();
    const {
      employeeId,
      date,
      startTime,
      endTime,
      status = 'PENDING',
      notes = '',
    } = body;

    if (!employeeId || !date || !startTime || !endTime || !ALLOWED_STATUSES.has(status)) {
      return NextResponse.json({ error: 'Invalid schedule payload' }, { status: 400 });
    }

    const tenantId = tenantForRequest(principal, body.companyId || body.tenantId || null);
    const employee = await db.collection('employees').doc(String(employeeId)).get();
    if (!employee.exists || employee.data()?.companyId !== tenantId) {
      return NextResponse.json({ error: 'Employee not available in this tenant' }, { status: 403 });
    }

    const ref = db.collection('schedules').doc();
    const now = new Date().toISOString();
    await ref.set({
      companyId: tenantId,
      tenantId,
      employeeId: String(employeeId),
      employeeName: employee.data()?.name || String(employeeId),
      date,
      startTime,
      endTime,
      status,
      notes: String(notes).slice(0, 500),
      createdAt: now,
      updatedAt: now,
      updatedBy: principal.userId,
    });

    return NextResponse.json({ success: true, id: ref.id });
  } catch (error) {
    return serverError(error, 'create');
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const principal = await requireSession(req);
    requireAnyRole(principal, ['tenant_admin', 'hr']);

    const body = await req.json();
    const { id, date, startTime, endTime, status, notes } = body;
    if (!id) return NextResponse.json({ error: 'Missing schedule id' }, { status: 400 });

    const tenantId = tenantForRequest(principal, body.companyId || body.tenantId || null);
    const ref = db.collection('schedules').doc(String(id));
    const existing = await ref.get();
    if (!existing.exists || existing.data()?.companyId !== tenantId) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    const patch: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
      updatedBy: principal.userId,
    };
    if (date) patch.date = date;
    if (startTime) patch.startTime = startTime;
    if (endTime) patch.endTime = endTime;
    if (status && ALLOWED_STATUSES.has(status)) patch.status = status;
    if (typeof notes === 'string') patch.notes = notes.slice(0, 500);

    await ref.update(patch);
    return NextResponse.json({ success: true });
  } catch (error) {
    return serverError(error, 'update');
  }
}
