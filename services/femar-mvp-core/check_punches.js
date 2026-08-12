const admin = require('firebase-admin');
const serviceAccount = require('./femar-firebase-adminsdk.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkPunches() {
  const logs = await db.collection('adms_logs')
    .where('user_id', '==', '1')
    .orderBy('timestamp', 'desc')
    .limit(5)
    .get();

  console.log("Punches for user 1:");
  logs.forEach(doc => {
    const data = doc.data();
    console.log(`- Time: ${data.timestamp}, State: ${data.state}, SN: ${data.serial_number}`);
  });
}

checkPunches();
