import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';

export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'Device ID is required' }, { status: 400 });
    }

    const deviceRef = db.collection('devices').doc(id);
    await deviceRef.update({
      status: 'ignorado',
      updatedAt: new Date().toISOString()
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error ignoring device:', error);
    return NextResponse.json({ error: 'Failed to ignore device' }, { status: 500 });
  }
}
