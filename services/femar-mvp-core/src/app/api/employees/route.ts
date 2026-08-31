import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import {
  assertTenantAccess,
  requireModuleAccess,
  requireSession,
} from '@/lib/sessionAuth';

export async function POST(req: NextRequest) {
  try {
    const user = await requireModuleAccess('workforce-ai');
    if (user instanceof NextResponse) return user;

    const employeeData = await req.json();
    
    if (!employeeData.id || !employeeData.name) {
      return NextResponse.json({ error: 'ID and Name are required' }, { status: 400 });
    }

    const tenantDenied = assertTenantAccess(user, employeeData.companyId);
    if (tenantDenied) return tenantDenied;

    const companyId =
      user.role === 'superadmin' && employeeData.companyId
        ? employeeData.companyId
        : user.companyId;

    // Save or update employee in Firestore
    const empRef = db.collection('employees').doc(employeeData.id);
    await empRef.set({
      ...employeeData,
      companyId,
      updatedAt: new Date().toISOString(),
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
    const user = await requireModuleAccess('workforce-ai');
    if (user instanceof NextResponse) return user;

    const url = new URL(req.url);
    const requestedCompany = url.searchParams.get('companyId');
    const tenantDenied = assertTenantAccess(user, requestedCompany);
    if (tenantDenied) return tenantDenied;

    const companyId =
      user.role === 'superadmin' && requestedCompany ? requestedCompany : user.companyId;

    let query: FirebaseFirestore.Query = db.collection('employees').where('companyId', '==', companyId);
    
    const snapshot = await query.get();
    const employees = snapshot.docs.map(doc => ({ ...doc.data() }));
    return NextResponse.json({ employees });
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 });
  }
}
