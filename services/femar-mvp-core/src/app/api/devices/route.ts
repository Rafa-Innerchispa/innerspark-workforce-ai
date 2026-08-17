import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';

export async function GET() {
  try {
    const devicesRef = db.collection('devices');
    const snapshot = await devicesRef.get();
    
    const pending: any[] = [];
    const active: any[] = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const status = String(data.status || '').toLowerCase();
      const device = { id: doc.id, ...data };
      if (['pendiente', 'pending'].includes(status)) {
        pending.push(device);
      } else if (['activo', 'active', 'aprobado', 'approved'].includes(status)) {
        active.push(device);
      }
    });

    return NextResponse.json({ pending, active });
  } catch (error) {
    console.error('Error fetching devices:', error);
    return NextResponse.json({ error: 'Failed to fetch devices' }, { status: 500 });
  }
}
