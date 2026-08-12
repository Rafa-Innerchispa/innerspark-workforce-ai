const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Initialize Firebase Admin using Application Default Credentials
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
}

const db = admin.firestore();

// We will use the same mockData logic to get the 30 employees
// Since we can't easily import TS mockData in this commonjs script, I'll just read it or inject it.
// Actually it's easier to just fetch them from the 'employees' collection. Wait, they might not be in the 'employees' collection yet!
// Let's just create an array of 5 users to test if they appear on the ZKTeco device. Or better, read the mockData file!

const tsFile = fs.readFileSync(path.resolve(__dirname, 'src/lib/mockData.ts'), 'utf8');
// Very hacky but works for a scratch script to extract the JSON array
const jsonStr = tsFile.substring(tsFile.indexOf('['), tsFile.lastIndexOf(']') + 1).replace(/'/g, '"');
let mockEmployees = [];
try {
  // It's not pure JSON because of unquoted keys or trailing commas maybe, wait, mockData is well formed JS array.
  mockEmployees = eval(tsFile.replace('export const mockEmployees =', ''));
} catch (e) {
  console.error("Error evaluating mockData", e);
}

async function runSync() {
  const devicesSnapshot = await db.collection('devices')
    .where('status', 'in', ['aprobado', 'active'])
    .get();

  if (devicesSnapshot.empty) {
    console.log("No active devices found to sync to.");
    process.exit(0);
  }

  const batch = db.batch();
  let count = 0;

  devicesSnapshot.docs.forEach(deviceDoc => {
    const deviceId = deviceDoc.id;
    console.log(`Queueing ${mockEmployees.length} users for device ${deviceId}...`);

    mockEmployees.forEach((emp) => {
      // ADMS command: DATA UPDATE USER PIN=xxx Name=xxx
      // We will also use Pri=0 to make them normal users.
      // Name in ZKTeco has a max length, but we can pass it as is. Usually ~24 chars.
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
  console.log(`Successfully queued ${count} commands to devices!`);
}

runSync().then(() => process.exit(0)).catch(console.error);
