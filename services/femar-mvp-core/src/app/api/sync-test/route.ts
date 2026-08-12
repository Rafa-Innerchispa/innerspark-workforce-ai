import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { mockEmployees } from '@/lib/mockData';

export async function GET() {
  try {
    const devicesSnapshot = await db.collection('devices')
      .where('status', 'in', ['aprobado', 'activo'])
      .get();

    if (devicesSnapshot.empty) {
      return NextResponse.json({ success: false, message: "No active devices found to sync to." });
    }

    const batch = db.batch();
    let count = 0;

    devicesSnapshot.docs.forEach(deviceDoc => {
      const deviceId = deviceDoc.id;

      mockEmployees.forEach((emp) => {
        const shortName = emp.name.substring(0, 24);
        const commandString = `DATA UPDATE USERINFO PIN=${emp.id}\tName=${shortName}\tPri=0`;

        const newCmdRef = db.collection('device_commands').doc();
        batch.set(newCmdRef, {
          deviceId,
          command: commandString,
          status: 'pending',
          createdAt: new Date().toISOString()
        });
        count++;
      });
    });

    await batch.commit();
    return NextResponse.json({ success: true, queued: count, devices: devicesSnapshot.size });

  } catch (error) {
    console.error('Error during sync test:', error);
    return NextResponse.json({ error: 'Failed to execute sync test' }, { status: 500 });
  }
}
