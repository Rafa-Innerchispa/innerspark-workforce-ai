import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { resolveTenantContext, TenantAccessError } from '@/lib/serverAuth';

const ACTIVE_DEVICE_STATUSES = new Set(['aprobado', 'activo', 'active']);

function tenantError(error: unknown) {
  if (error instanceof TenantAccessError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { companyId } = await resolveTenantContext(req);
    const employeeData = await req.json();

    if (!employeeData.id || !employeeData.name) {
      return NextResponse.json({ error: 'ID and Name are required' }, { status: 400 });
    }

    const empRef = db.collection('employees').doc(employeeData.id);
    const existing = await empRef.get();
    const existingCompanyId = existing.exists ? existing.data()?.companyId : null;

    if (existingCompanyId && existingCompanyId !== companyId) {
      return NextResponse.json(
        { error: 'Employee ID already belongs to another company' },
        { status: 409 }
      );
    }

    // The tenant is always derived from the authenticated server-side session.
    // A client-supplied companyId is intentionally ignored.
    const { companyId: _ignoredClientCompany, ...safeEmployeeData } = employeeData;
    await empRef.set(
      {
        ...safeEmployeeData,
        companyId,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    // Only sync the employee to devices belonging to the same tenant.
    // Query by company first and filter status in memory to avoid requiring a composite index.
    const devicesSnapshot = await db.collection('devices')
      .where('companyId', '==', companyId)
      .get();

    const activeDevices = devicesSnapshot.docs.filter((deviceDoc) =>
      ACTIVE_DEVICE_STATUSES.has(String(deviceDoc.data()?.status || '').toLowerCase())
    );

    const batch = db.batch();
    activeDevices.forEach((deviceDoc) => {
      const deviceId = deviceDoc.id;
      const commandString = `DATA UPDATE USER PIN=${employeeData.id}\tName=${employeeData.name}\tPri=0`;
      const newCmdRef = db.collection('device_commands').doc();
      batch.set(newCmdRef, {
        companyId,
        deviceId,
        command: commandString,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
    });

    if (activeDevices.length > 0) {
      await batch.commit();
    }

    return NextResponse.json({
      success: true,
      message: 'Employee saved and synced',
      syncedDevices: activeDevices.length,
    });
  } catch (error) {
    const response = tenantError(error);
    if (response) return response;

    console.error('Error saving employee:', error);
    return NextResponse.json({ error: 'Failed to save employee' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { companyId } = await resolveTenantContext(req);
    const snapshot = await db.collection('employees')
      .where('companyId', '==', companyId)
      .get();

    const employees = snapshot.docs.map((doc) => ({ ...doc.data() }));
    return NextResponse.json({ employees });
  } catch (error) {
    const response = tenantError(error);
    if (response) return response;

    console.error('Error fetching employees:', error);
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 });
  }
}
