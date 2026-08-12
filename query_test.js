const admin = require('firebase-admin');
const serviceAccount = require('./services/femar-mvp-core/femar-firebase-adminsdk.json');
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();
async function testQuery() {
  try {
    const commandsRef = db.collection('device_commands')
      .where('deviceId', '==', 'NYU7251901633')
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'asc')
      .limit(10);
    await commandsRef.get();
    console.log("Success!");
  } catch(e) {
    console.error(e.message);
  }
}
testQuery();
