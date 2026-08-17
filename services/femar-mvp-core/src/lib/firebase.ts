import dns from 'dns';
import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import fs from 'fs';

// Set DNS resolution preference to IPv4 first to avoid IPv6 connection timeouts/hangs locally
try {
  dns.setDefaultResultOrder('ipv4first');
} catch (err) {
  console.warn('Could not set DNS result order:', err);
}

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  const localAdcPath = '/home/rlopez/.config/gcloud/legacy_credentials/innerspark-workforce-ai@innerspark-workforce-ai.iam.gserviceaccount.com/adc.json';
  
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(localAdcPath)) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = localAdcPath;
    console.log('Set GOOGLE_APPLICATION_CREDENTIALS to local legacy credentials file.');
  }

  try {
    initializeApp({
      credential: applicationDefault()
    });
    console.log('Firebase initialized successfully.');
  } catch (e) {
    console.error('Failed to initialize Firebase Admin:', e);
    throw e;
  }
}

export const db = getFirestore();
export const storage = getStorage();
