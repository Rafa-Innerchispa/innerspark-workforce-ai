/**
 * One-off: remove stale partial Google users blocking re-registration.
 * Run from femar-mvp-core with the same env as femar-mvp-core.service:
 *   npx ts-node --transpile-only scripts/cleanup-partial-google-users.ts [--apply]
 *   npx ts-node --transpile-only scripts/cleanup-partial-google-users.ts --email=user@example.com [--apply]
 *
 * Without --apply, prints candidates only (dry run).
 */
import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  initializeApp({ credential: applicationDefault() });
}
const db = getFirestore();

const APPLY = process.argv.includes('--apply');
const EMAIL_FILTER = process.argv.find((a) => a.startsWith('--email='))?.split('=')[1]?.toLowerCase();

function isPartialGoogleUser(data: Record<string, unknown>): boolean {
  if (data.authProvider !== 'google') return false;
  if (data.status === 'APPROVED' || data.status === 'REJECTED') return false;
  // PENDING without document = incomplete onboarding, safe to delete
  if (data.status === 'PENDING' && (data.idNumber || data.cedula)) return false;
  return !data.idNumber && !data.cedula;
}

async function run() {
  const snap = await db.collection('users').get();
  const candidates = snap.docs.filter((doc) => {
    const data = doc.data();
    const email = String(data.email || '').toLowerCase();
    if (EMAIL_FILTER && email !== EMAIL_FILTER) return false;
    if (EMAIL_FILTER) return isPartialGoogleUser(data);
    if (!email.includes('innerchispa')) return false;
    return isPartialGoogleUser(data);
  });

  console.log(`Found ${candidates.length} partial Google user(s)${APPLY ? ' — deleting' : ' — dry run'}`);
  for (const doc of candidates) {
    const data = doc.data();
    console.log(JSON.stringify({ id: doc.id, email: data.email, status: data.status || null }));
    if (APPLY) await doc.ref.delete();
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
