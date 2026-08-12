import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { mockEmployees } from './src/lib/mockData';

if (!getApps().length) {
  initializeApp({
    credential: applicationDefault()
  });
}
const db = getFirestore();

async function run() {
  try {
    const devicesSnapshot = await db.collection('devices')
      .where('status', 'in', ['aprobado', 'active'])
      .get();

    if (devicesSnapshot.empty) {
      console.log("No active devices found to sync to.");
      return;
    }

    const batch = db.batch();
    let count = 0;

    devicesSnapshot.docs.forEach(deviceDoc => {
      const deviceId = deviceDoc.id;

      mockEmployees.forEach((emp) => {
        const shortName = emp.name.substring(0, 24);
        const commandString = `DATA UPDATE USER PIN=${emp.id}\tName=${shortName}\tPri=0`;

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
    console.log(`Success: queued ${count} commands to ${devicesSnapshot.size} devices`);
  } catch (error) {
    console.error('Error during sync test:', error);
  }
}

run().then(() => process.exit(0));
