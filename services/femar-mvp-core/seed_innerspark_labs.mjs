import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import crypto from 'crypto';
import fs from 'fs';

// This script should be run locally to populate the DB with secure hashed passwords.
// DO NOT COMMIT the service account JSON or passwords to GitHub.

// Initialize Firebase Admin (assuming you have serviceAccountKey.json locally)
const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

// Helper to hash password with scrypt + salt
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hashedBuffer = crypto.scryptSync(password, salt, 64);
  return `${salt}:${hashedBuffer.toString('hex')}`;
}

async function seed() {
  console.log('Seeding Secure Users...');

  const temporalPassword = process.env.TEMPORAL_PASSWORD;
  if (!temporalPassword) {
     console.error('ERROR: You must provide TEMPORAL_PASSWORD environment variable.');
     process.exit(1);
  }

  const users = [
    {
      id: 'HECTOR-ID', // Replace with real ID in your local run
      cedula: 'HECTOR-ID', 
      name: 'Héctor José Mejias Rosales',
      role: 'employee',
      companyId: 'pcdoctor',
      status: 'APPROVED',
      mustChangePassword: true,
      documentType: 'PASSPORT'
    },
    {
      id: 'NICOLAS-ID', // Replace with real ID in your local run
      cedula: 'NICOLAS-ID',
      name: 'Nicolás Carlos Antonio Sanhueza Wagner',
      role: 'employee',
      companyId: 'pcdoctor',
      status: 'APPROVED',
      mustChangePassword: true,
      documentType: 'CHL_RUN'
    },
    {
      id: 'DEVPOST-JUDGE',
      cedula: 'DEVPOST-JUDGE',
      name: 'XPRIZE Judge Admin',
      role: 'admin',
      companyId: 'innerspark-labs',
      status: 'APPROVED',
      mustChangePassword: false,
      documentType: 'OTHER'
    }
  ];

  for (const user of users) {
    const userRef = db.collection('users').doc(user.cedula);
    await userRef.set({
      ...user,
      password: hashPassword(temporalPassword)
    });
    console.log(`Created user: ${user.name}`);
  }

  // Seed 50 Sandbox Users for InnerSpark Labs
  console.log('Seeding 50 Sandbox Users for InnerSpark Labs...');
  for (let i = 1; i <= 50; i++) {
    const empId = `EMP-XP-${String(i).padStart(3, '0')}`;
    await db.collection('users').doc(empId).set({
      id: empId,
      cedula: empId,
      name: `Sandbox Employee ${i}`,
      role: 'employee',
      companyId: 'innerspark-labs',
      status: 'APPROVED',
      password: hashPassword(temporalPassword),
      mustChangePassword: false,
      documentType: 'OTHER'
    });
  }
  
  console.log('Done!');
}

seed().catch(console.error);
