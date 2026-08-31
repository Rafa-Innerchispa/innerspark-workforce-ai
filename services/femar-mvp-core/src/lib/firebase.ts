import { initializeApp, getApps, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

function resolveFirebaseCredential() {
  const inlineKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim();
  if (inlineKey) {
    return cert(JSON.parse(inlineKey));
  }
  // Uses GOOGLE_APPLICATION_CREDENTIALS or gcloud ADC when set in the runtime environment.
  return applicationDefault();
}

if (!getApps().length) {
  initializeApp({ credential: resolveFirebaseCredential() });
}

export const db = getFirestore();
export const storage = getStorage();
