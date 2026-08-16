import { db } from './src/lib/firebase.js';
import { mockEmployees } from './src/lib/mockData.js';

async function seed() {
  const batch = db.batch();
  for (const emp of mockEmployees) {
    const ref = db.collection('employees').doc(emp.id);
    batch.set(ref, emp);
  }
  await batch.commit();
  console.log("Seeded", mockEmployees.length, "employees");
}

seed().catch(console.error);
