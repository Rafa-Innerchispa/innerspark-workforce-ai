import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { join } from 'path';

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

    // Hardcode some employees just to test the device
    const mockEmployees = [
      { id: "1717016487", name: "Xavier Gabriel Cevallos Morales" },
      { id: "0333269413", name: "Jose David Torres Vargas" },
      { id: "1836558898", name: "Jorge Andres Garcia Castro" },
      { id: "2453923548", name: "Alejandro Fernando Castro Almeida" },
      { id: "0853072775", name: "Laura Carolina Delgado Garcia" }
    ];

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
