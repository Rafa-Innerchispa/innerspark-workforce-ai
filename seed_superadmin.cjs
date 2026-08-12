const crypto = require('crypto');
const admin = require('firebase-admin');
const serviceAccount = require('./services/femar-mvp-core/femar-firebase-adminsdk.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function seed() {
  const password = crypto.createHash('sha256').update('Admin123!').digest('hex');
  
  await db.collection('users').doc('0914832423').set({
    cedula: '0914832423',
    name: 'Super Administrador',
    password: password,
    role: 'superadmin',
    status: 'APPROVED',
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
  
  console.log("SuperAdmin seeded successfully!");
}

seed();
