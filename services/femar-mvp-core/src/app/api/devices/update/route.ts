import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { requireModuleAccess } from '@/lib/sessionAuth';

export async function POST(req: NextRequest) {
  try {
    const user = await requireModuleAccess('workforce-ai');
    if (user instanceof NextResponse) return user;

    const { id, name, location, model } = await req.json();
    if (!id) return NextResponse.json({ error: 'Missing device ID' }, { status: 400 });

    const deviceRef = db.collection('devices').doc(id);
    await deviceRef.update({
      name: name || '',
      location: location || '',
      model: model || '',
      updated_at: new Date().toISOString()
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating device:', error);
    return NextResponse.json({ error: 'Failed to update device' }, { status: 500 });
  }
}
