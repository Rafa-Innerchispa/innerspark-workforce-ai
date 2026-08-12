import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const { cedula, password } = await req.json();
    
    if (!cedula || !password) {
      return NextResponse.json({ success: false, message: 'Cédula y contraseña son obligatorias' }, { status: 400 });
    }

    // Hardcoded SuperAdmin backdoor for MVP since seed script lacks local GCP credentials
    if (cedula === '0914832423' && password === 'Admin123!') {
      return NextResponse.json({ 
        success: true, 
        user: {
          id: '0914832423',
          cedula: '0914832423',
          name: 'Super Administrador (Rafa)',
          role: 'superadmin',
          companyId: 'femar',
          status: 'APPROVED'
        }
      });
    }

    const docRef = db.collection('users').doc(cedula);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json({ success: false, message: 'Usuario no encontrado' }, { status: 404 });
    }

    const user = doc.data();
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');

    if (user?.password !== hashedPassword) {
      return NextResponse.json({ success: false, message: 'Contraseña incorrecta' }, { status: 401 });
    }

    if (user?.status === 'PENDING') {
      return NextResponse.json({ success: false, message: 'Tu cuenta está pendiente de aprobación por el Super Administrador' }, { status: 403 });
    }
    
    if (user?.status === 'REJECTED') {
      return NextResponse.json({ success: false, message: 'Tu solicitud de cuenta ha sido rechazada' }, { status: 403 });
    }

    // Return user without password
    const { password: _, ...userSafe } = user!;
    
    return NextResponse.json({ success: true, user: userSafe });

  } catch (error) {
    console.error('Error logging in:', error);
    return NextResponse.json({ success: false, message: 'Error interno del servidor' }, { status: 500 });
  }
}
