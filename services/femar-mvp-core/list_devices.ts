import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  initializeApp({
    credential: applicationDefault()
  });
}
const db = getFirestore();

async function run() {
  const snapshot = await db.collection('devices').get();
  snapshot.forEach(doc => {
    console.log(doc.id, doc.data());
  });
}

run();
