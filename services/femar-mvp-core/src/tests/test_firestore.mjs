import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

// Set credentials file path
process.env.GOOGLE_APPLICATION_CREDENTIALS = '/home/rlopez/.config/gcloud/legacy_credentials/innerspark-workforce-ai@innerspark-workforce-ai.iam.gserviceaccount.com/adc.json';
process.env.GCLOUD_PROJECT = 'innerspark-workforce-ai';

console.log('Testing Firestore initialization using GOOGLE_OAUTH_ACCESS_TOKEN...');
try {
  initializeApp({
    credential: applicationDefault()
  });
  console.log('App initialized.');
  
  const db = getFirestore();
  console.log('Firestore client created. Attempting read...');
  
  const snap = await db.collection('users').limit(1).get();
  console.log('Firestore read successful! Documents count:', snap.size);
} catch (e) {
  console.error('Firestore test failed:', e);
}
