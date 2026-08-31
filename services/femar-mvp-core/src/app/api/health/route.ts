import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';

export async function GET() {
  try {
    await db.collection('health_check').limit(1).get();

    return NextResponse.json(
      {
        status: 'ok',
        alive: true,
        services: {
          firestore: 'connected',
          gcs: 'not_configured',
        },
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        status: 'error',
        alive: true,
        services: {
          firestore: 'disconnected',
          gcs: 'not_configured',
        },
        error_message: message,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  }
}
