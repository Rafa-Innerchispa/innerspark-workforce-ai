import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  // Uses Application Default Credentials (GCP)
  initializeApp({
    credential: applicationDefault()
  });
}

export const db = getFirestore();
export const storage = getStorage();
