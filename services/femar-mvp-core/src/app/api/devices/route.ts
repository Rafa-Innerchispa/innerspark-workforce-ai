import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { requireModuleAccess } from '@/lib/sessionAuth';

export async function GET() {
  try {
    const user = await requireModuleAccess('workforce-ai');
    if (user instanceof NextResponse) return user;

    const devicesRef = db.collection('devices');
    const snapshot = await devicesRef.get();
    
    const pending: any[] = [];
    const active: any[] = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.status === 'pendiente') {
        pending.push(data);
      } else if (data.status === 'activo') {
        active.push(data);
      }
    });

    return NextResponse.json({ pending, active });
  } catch (error) {
    console.error('Error fetching devices:', error);
    return NextResponse.json({ error: 'Failed to fetch devices' }, { status: 500 });
  }
}
