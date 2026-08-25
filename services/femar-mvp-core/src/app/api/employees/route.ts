import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { authErrorResponse, requireAnyRole, requireSession, tenantForRequest } from '@/lib/auth/server';

export async function POST(req: NextRequest) {
  try {
    const principal = await requireSession(req);
    requireAnyRole(principal, ['tenant_admin', 'hr']);
    const employeeData = await req.json();

    if (!employeeData.id || !employeeData.name) {
      return NextResponse.json({ error: 'ID and Name are required' }, { status: 400 });
    }

    const tenantId = tenantForRequest(principal, employeeData.companyId || employeeData.tenantId || null);
    const normalizedEmployee = {
      ...employeeData,
      companyId: tenantId,
      tenantId,
      updatedAt: new Date().toISOString(),
      updatedBy: principal.userId,
    };

    const empRef = db.collection('employees').doc(String(employeeData.id));
    await empRef.set(normalizedEmployee, { merge: true });

    const devicesSnapshot = await db.collection('devices')
      .where('companyId', '==', tenantId)
      .where('status', 'in', ['aprobado', 'active', 'activo'])
      .get();

    const batch = db.batch();
    devicesSnapshot.docs.forEach(deviceDoc => {
      const commandString = `DATA UPDATE USER PIN=${employeeData.id}\tName=${employeeData.name}\tPri=0`;
      const newCmdRef = db.collection('device_commands').doc();
      batch.set(newCmdRef, {
        deviceId: deviceDoc.id,
        companyId: tenantId,
        command: commandString,
        status: 'pending',
        createdAt: new Date().toISOString(),
        createdBy: principal.userId,
      });
    });
    if (!devicesSnapshot.empty) await batch.commit();

    return NextResponse.json({ success: true, employee: normalizedEmployee });
  } catch (error) {
    const auth = authErrorResponse(error);
    if (auth) return NextResponse.json(auth.body, { status: auth.status });
    console.error('Error saving employee:', error);
    return NextResponse.json({ error: 'Failed to save employee' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const principal = await requireSession(req);
    const requestedTenant = new URL(req.url).searchParams.get('companyId');
    const tenantId = tenantForRequest(principal, requestedTenant);
    const snapshot = await db.collection('employees').where('companyId', '==', tenantId).get();
    const employees = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json({ employees, tenantId });
  } catch (error) {
    const auth = authErrorResponse(error);
    if (auth) return NextResponse.json(auth.body, { status: auth.status });
    console.error('Error fetching employees:', error);
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 });
  }
}
