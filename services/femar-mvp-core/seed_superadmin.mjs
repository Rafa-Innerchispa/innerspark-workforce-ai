import crypto from 'crypto';
import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

if (!getApps().length) {
  initializeApp({
    credential: applicationDefault()
  });
}

const db = getFirestore();

async function seed() {
  const password = crypto.createHash('sha256').update('Admin123!').digest('hex');
  
  await db.collection('users').doc('0914832423').set({
    cedula: '0914832423',
    name: 'Super Administrador',
    password: password,
    role: 'superadmin',
    status: 'APPROVED',
    createdAt: FieldValue.serverTimestamp()
  });
  
  console.log("SuperAdmin seeded successfully!");
}

seed();
