const admin = require('firebase-admin');
const serviceAccount = require('./femar-firebase-adminsdk.json');
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();
async function checkCmds() {
  const logs = await db.collection('device_commands').orderBy('createdAt', 'desc').limit(5).get();
  console.log("Latest commands:");
  logs.forEach(doc => {
    const data = doc.data();
    console.log(`- Status: ${data.status}, Cmd: ${data.command}, ReturnCode: ${data.returnCode}`);
  });
}
checkCmds();
