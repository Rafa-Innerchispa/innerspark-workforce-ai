import { NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

function getFirebaseAdmin() {
  if (getApps().length === 0) {
    let credential;
    try {
      if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        credential = cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY));
      } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
         // Firebase admin automatically uses it
      }
      initializeApp({ credential });
    } catch (e) {
      console.warn("Failed to initialize Firebase admin in health check:", e);
      initializeApp(); // Try default
    }
  }
}

export async function GET() {
  try {
    getFirebaseAdmin();
    const db = getFirestore();
    
    // Quick check to see if Firestore is accessible
    // We just list collections or try a dummy read
    await db.collection('health_check').limit(1).get();
    
    return NextResponse.json({
      status: 'ok',
      alive: true,
      services: {
        firestore: 'connected',
        gcs: 'not_configured'
      },
      timestamp: new Date().toISOString()
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      alive: true,
      services: {
        firestore: 'disconnected',
        gcs: 'not_configured'
      },
      error_message: error.message || 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
