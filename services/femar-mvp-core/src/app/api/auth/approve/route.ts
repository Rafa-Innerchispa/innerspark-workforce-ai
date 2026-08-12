import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';

export async function POST(req: Request) {
  try {
    const { cedula, action, role } = await req.json();

    if (!cedula || !action) {
      return NextResponse.json({ success: false, message: 'Faltan parámetros' }, { status: 400 });
    }

    const docRef = db.collection('users').doc(cedula);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json({ success: false, message: 'Usuario no encontrado' }, { status: 404 });
    }

    if (action === 'APPROVE') {
      await docRef.update({
        status: 'APPROVED',
        role: role || 'employee', // Can be 'employee' or 'admin'
        updatedAt: new Date().toISOString()
      });
    } else if (action === 'REJECT') {
      await docRef.update({
        status: 'REJECTED',
        updatedAt: new Date().toISOString()
      });
    }

    return NextResponse.json({ success: true, message: `Usuario ${action === 'APPROVE' ? 'aprobado' : 'rechazado'}` });

  } catch (error) {
    console.error('Error in approval:', error);
    return NextResponse.json({ success: false, message: 'Error interno' }, { status: 500 });
  }
}
