import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { tenantEmployeesCollection } from '@/tenant/tenantFirestore';

function resolveTenantId(
  ...candidates: Array<string | null | undefined>
): string | undefined {
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

export async function POST(req: NextRequest) {
  try {
    const employeeData = await req.json();
    
    if (!employeeData.id || !employeeData.name) {
      return NextResponse.json({ error: 'ID and Name are required' }, { status: 400 });
    }

    const tenantId = resolveTenantId(
      employeeData.tenant_id,
      employeeData.companyId
    );

    // Tenant-scoped path when id is known; legacy flat collection otherwise.
    const empRef = tenantId
      ? tenantEmployeesCollection(db, tenantId).doc(employeeData.id)
      : db.collection('employees').doc(employeeData.id);
    await empRef.set({
      ...employeeData,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    // Enqueue command to all active devices
    const devicesSnapshot = await db.collection('devices')
      .where('status', 'in', ['aprobado', 'active'])
      .get();
      
    const batch = db.batch();
    
    devicesSnapshot.docs.forEach(deviceDoc => {
      const deviceId = deviceDoc.id;
      // Command format: DATA UPDATE USER PIN=123 Name=John Doe
      // Note: we can also set permissions, card numbers, etc.
      const commandString = `DATA UPDATE USER PIN=${employeeData.id}\tName=${employeeData.name}\tPri=0`;
      
      const newCmdRef = db.collection('device_commands').doc();
      batch.set(newCmdRef, {
        deviceId,
        command: commandString,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
    });

    if (!devicesSnapshot.empty) {
      await batch.commit();
    }

    return NextResponse.json({ success: true, message: 'Employee saved and synced' });
  } catch (error) {
    console.error('Error saving employee:', error);
    return NextResponse.json({ error: 'Failed to save employee' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const tenantId = resolveTenantId(
      url.searchParams.get('tenant_id'),
      url.searchParams.get('companyId')
    );

    let query: FirebaseFirestore.Query = tenantId
      ? tenantEmployeesCollection(db, tenantId)
      : db.collection('employees');

    if (!tenantId && url.searchParams.get('companyId')) {
      query = query.where('companyId', '==', url.searchParams.get('companyId'));
    }
    
    const snapshot = await query.get();
    const employees = snapshot.docs.map(doc => ({ ...doc.data() }));
    return NextResponse.json({ employees });
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 });
  }
}
