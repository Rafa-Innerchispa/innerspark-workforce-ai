const admin = require('firebase-admin');
const fs = require('fs');

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');
  if (!Object.keys(serviceAccount).length) {
    console.error('FIREBASE_SERVICE_ACCOUNT_KEY missing');
    process.exit(1);
  }
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function findAndres() {
  const snapshot = await db.collection('users').get();
  const users = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.name && data.name.toLowerCase().includes('andres')) {
      users.push(data);
    }
  });
  console.log(JSON.stringify(users, null, 2));
}

findAndres().catch(console.error);
