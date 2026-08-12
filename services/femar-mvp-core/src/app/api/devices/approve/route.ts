import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';

export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'Missing device ID' }, { status: 400 });

    const deviceRef = db.collection('devices').doc(id);
    await deviceRef.update({
      status: 'activo',
      approved_at: new Date().toISOString()
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error approving device:', error);
    return NextResponse.json({ error: 'Failed to approve device' }, { status: 500 });
  }
}
