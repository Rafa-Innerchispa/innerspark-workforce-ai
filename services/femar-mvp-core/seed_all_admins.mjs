import crypto from 'crypto';
import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

if (!getApps().length) {
  initializeApp({
    credential: applicationDefault()
  });
}

const db = getFirestore();

function hashPasswordScrypt(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hashedBuffer = crypto.scryptSync(password, salt, 64);
  return `${salt}:${hashedBuffer.toString('hex')}`;
}

async function seed() {
  const passwordText = 'Admin123!';
  // We use legacy sha256 because that's what login accepts as fallback if not scrypt, 
  // wait, login accepts both! Let's just use scrypt!
  const password = hashPasswordScrypt(passwordText);
  
  const admins = [
    { cedula: '0914832423', name: 'Super Administrador (Rafa)', role: 'superadmin', companyId: 'femar' },
    { cedula: '0950626317', name: 'Andrés Ramos', role: 'admin', companyId: 'iapro' },
    { cedula: '1111111111', name: 'Admin FEMAR', role: 'admin', companyId: 'femar' },
    { cedula: '2222222222', name: 'Admin PC Doctor', role: 'admin', companyId: 'pcdoctor' },
    { cedula: 'DEVPOST-JUDGE', name: 'XPRIZE Judge Admin', role: 'admin', companyId: 'innerspark_labs' } // Changed to innerspark_labs
  ];

  for (const admin of admins) {
    await db.collection('users').doc(admin.cedula).set({
      id: admin.cedula,
      cedula: admin.cedula,
      name: admin.name,
      password: password,
      role: admin.role,
      companyId: admin.companyId,
      status: 'APPROVED',
      createdAt: FieldValue.serverTimestamp()
    }, { merge: true });
    console.log(`Seeded ${admin.name} - ${admin.cedula}`);
  }
  
  // Seed the 50 sandbox users for Judges
  console.log('Seeding 50 Sandbox Users for innerspark_labs...');
  const batch = db.batch();
  for (let i = 1; i <= 50; i++) {
    const empId = `EMP-XP-${String(i).padStart(3, '0')}`;
    const ref = db.collection('users').doc(empId);
    batch.set(ref, {
      id: empId,
      cedula: empId,
      name: `Sandbox Employee ${i}`,
      role: 'employee',
      companyId: 'innerspark_labs',
      status: 'APPROVED',
      password: hashPasswordScrypt(passwordText),
      mustChangePassword: false,
      documentType: 'OTHER'
    }, { merge: true });
  }
  await batch.commit();
  console.log("50 sandbox users seeded successfully!");
}

seed().catch(console.error);
