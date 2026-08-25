import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { requireSession, requireRole } from '@/lib/auth/server';

const ALLOWED_STATUSES = new Set(['PENDING','COMPLETED','LATE','UNEXCUSED_ABSENCE','VACATION','LEAVE']);

export async function GET(req: NextRequest) {
  const auth = await requireSession(req);
  if (!auth.ok) return auth.response;

  const snapshot = await db.collection('schedules')
    .where('companyId', '==', auth.session.companyId)
    .orderBy('date', 'desc')
    .limit(500)
    .get();

  return NextResponse.json({ schedules: snapshot.docs.map(d => ({ id: d.id, ...d.data() })) });
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, ['master','tenant_admin','hr']);
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const { employeeId, date, startTime, endTime, status = 'PENDING', notes = '' } = body;
  if (!employeeId || !date || !startTime || !endTime || !ALLOWED_STATUSES.has(status)) {
    return NextResponse.json({ error: 'Invalid schedule payload' }, { status: 400 });
  }

  const employee = await db.collection('employees').doc(String(employeeId)).get();
  if (!employee.exists || employee.data()?.companyId !== auth.session.companyId) {
    return NextResponse.json({ error: 'Employee not available in this tenant' }, { status: 403 });
  }

  const ref = db.collection('schedules').doc();
  const now = new Date().toISOString();
  await ref.set({
    companyId: auth.session.companyId,
    employeeId: String(employeeId),
    employeeName: employee.data()?.name || String(employeeId),
    date,
    startTime,
    endTime,
    status,
    notes: String(notes).slice(0, 500),
    createdAt: now,
    updatedAt: now,
    updatedBy: auth.session.userId
  });
  return NextResponse.json({ success: true, id: ref.id });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireRole(req, ['master','tenant_admin','hr']);
  if (!auth.ok) return auth.response;
  const body = await req.json();
  const { id, date, startTime, endTime, status, notes } = body;
  if (!id) return NextResponse.json({ error: 'Missing schedule id' }, { status: 400 });

  const ref = db.collection('schedules').doc(String(id));
  const existing = await ref.get();
  if (!existing.exists || existing.data()?.companyId !== auth.session.companyId) {
    return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
  }
  const patch: Record<string, unknown> = { updatedAt: new Date().toISOString(), updatedBy: auth.session.userId };
  if (date) patch.date = date;
  if (startTime) patch.startTime = startTime;
  if (endTime) patch.endTime = endTime;
  if (status && ALLOWED_STATUSES.has(status)) patch.status = status;
  if (typeof notes === 'string') patch.notes = notes.slice(0, 500);
  await ref.update(patch);
  return NextResponse.json({ success: true });
}
