import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { normalizeNationalDocument } from '@/lib/documentValidation';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const { cedula, password } = await req.json();
    
    if (!cedula || !password) {
      return NextResponse.json({ success: false, message: 'Cédula y contraseña son obligatorias' }, { status: 400 });
    }

    const userId = normalizeNationalDocument(cedula);
    const docRef = db.collection('users').doc(userId);
    let doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json({ success: false, message: 'Usuario no encontrado' }, { status: 404 });
    }

    const user = doc.data();
    
    let isMatch = false;
    if (user?.password?.includes(':')) {
       // New security format: scrypt with salt
       const [salt, key] = user.password.split(':');
       const hashedBuffer = crypto.scryptSync(password, salt, 64);
       isMatch = key === hashedBuffer.toString('hex');
    } else {
       // Legacy format: raw sha256
       const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
       isMatch = user?.password === hashedPassword;
    }

    if (!isMatch) {
      return NextResponse.json({ success: false, message: 'Contraseña incorrecta' }, { status: 401 });
    }

    if (user?.status === 'PENDING') {
      return NextResponse.json({ success: false, message: 'Tu cuenta está pendiente de aprobación por el Super Administrador' }, { status: 403 });
    }
    
    if (user?.status === 'REJECTED') {
      return NextResponse.json({ success: false, message: 'Tu solicitud de cuenta ha sido rechazada' }, { status: 403 });
    }

    // Return user without password
    const { password: _, ...userWithoutPassword } = user!;
    const userSafe = { id: doc.id, ...userWithoutPassword };
    
    const response = NextResponse.json({ success: true, user: userSafe });
    response.cookies.set('session_token', doc.id, { 
       httpOnly: true, 
       secure: process.env.NODE_ENV === 'production',
       sameSite: 'lax', 
       path: '/' 
    });
    return response;

  } catch (error) {
    console.error('Error logging in:', error);
    return NextResponse.json({ success: false, message: 'Error interno del servidor' }, { status: 500 });
  }
}
