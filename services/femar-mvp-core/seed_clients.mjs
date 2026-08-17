import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

if (!getApps().length) {
  initializeApp({
    credential: applicationDefault()
  });
}

const db = getFirestore();

async function seed() {
  console.log('Seeding FEMAR and PC Doctor clients/employees...');
  const batch = db.batch();

  const clients = [
    { id: 'FEMAR-001', name: 'Laura Isabel Salazar Sánchez', role: 'employee', companyId: 'femar', status: 'APPROVED' },
    { id: 'FEMAR-002', name: 'Diego Andrés Sánchez Paz', role: 'employee', companyId: 'femar', status: 'APPROVED' },
    { id: 'FEMAR-003', name: 'Carlos Manuel Gómez', role: 'employee', companyId: 'femar', status: 'APPROVED' },
    { id: 'FEMAR-004', name: 'Maria Fernanda López', role: 'employee', companyId: 'femar', status: 'APPROVED' },
    
    { id: 'PCDOC-001', name: 'Andrés Pérez', role: 'employee', companyId: 'pcdoctor', status: 'APPROVED' },
    { id: 'PCDOC-002', name: 'Juan Carlos Soto', role: 'employee', companyId: 'pcdoctor', status: 'APPROVED' },
    
    { id: 'IAPRO-001', name: 'Sistema Principal IA', role: 'employee', companyId: 'iapro', status: 'APPROVED' },
  ];

  for (const c of clients) {
    const ref = db.collection('users').doc(c.id);
    batch.set(ref, {
      ...c,
      cedula: c.id,
      createdAt: FieldValue.serverTimestamp()
    }, { merge: true });
  }

  await batch.commit();
  console.log('Seeded successfully!');
}

seed().catch(console.error);
