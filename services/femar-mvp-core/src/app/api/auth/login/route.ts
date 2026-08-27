import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { createSession } from '@/lib/serverAuth';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const { cedula, password } = await req.json();

    if (!cedula || !password) {
      return NextResponse.json(
        { success: false, message: 'Cédula y contraseña son obligatorias' },
        { status: 400 }
      );
    }

    // Demo identities are seeded only when the user does not exist yet. Passwords are never hardcoded.
    const mockDemos: Record<string, any> = {
      '0914832423': { id: '0914832423', cedula: '0914832423', name: 'Super Administrador (Rafa)', role: 'superadmin', companyId: 'femar', status: 'APPROVED' },
      '0950626317': { id: '0950626317', cedula: '0950626317', name: 'Andrés Ramos', role: 'admin', companyId: 'iapro', status: 'APPROVED' },
      '1111111111': { id: '1111111111', cedula: '1111111111', name: 'Admin FEMAR', role: 'admin', companyId: 'femar', status: 'APPROVED' },
      '2222222222': { id: '2222222222', cedula: '2222222222', name: 'Admin PC Doctor', role: 'admin', companyId: 'pcdoctor', status: 'APPROVED' },
      'DEVPOST-JUDGE': { id: 'DEVPOST-JUDGE', cedula: 'DEVPOST-JUDGE', name: 'XPRIZE Judge Admin', role: 'admin', companyId: 'innerspark_labs', status: 'APPROVED' },
    };

    const docRef = db.collection('users').doc(cedula);
    let doc = await docRef.get();

    if (!doc.exists && mockDemos[cedula]) {
      const newAdmin = mockDemos[cedula];
      const salt = crypto.randomBytes(16).toString('hex');
      const hashedBuffer = crypto.scryptSync(password, salt, 64);
      const newPassword = `${salt}:${hashedBuffer.toString('hex')}`;

      await docRef.set({
        ...newAdmin,
        password: newPassword,
        createdAt: new Date().toISOString(),
      });
      doc = await docRef.get();
    }

    if (!doc.exists) {
      return NextResponse.json({ success: false, message: 'Usuario no encontrado' }, { status: 404 });
    }

    const user = doc.data();

    let isMatch = false;
    if (user?.password?.includes(':')) {
      const [salt, key] = user.password.split(':');
      const hashedBuffer = crypto.scryptSync(password, salt, 64);
      const candidate = hashedBuffer.toString('hex');
      if (key.length === candidate.length) {
        isMatch = crypto.timingSafeEqual(Buffer.from(key, 'hex'), Buffer.from(candidate, 'hex'));
      }
    } else {
      const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
      isMatch = user?.password === hashedPassword;
    }

    if (!isMatch) {
      return NextResponse.json({ success: false, message: 'Contraseña incorrecta' }, { status: 401 });
    }

    if (user?.status === 'PENDING') {
      return NextResponse.json(
        { success: false, message: 'Tu cuenta está pendiente de aprobación por el Super Administrador' },
        { status: 403 }
      );
    }

    if (user?.status === 'REJECTED') {
      return NextResponse.json(
        { success: false, message: 'Tu solicitud de cuenta ha sido rechazada' },
        { status: 403 }
      );
    }

    const { password: _, ...userSafe } = user!;
    const { token, maxAgeSeconds } = await createSession(userSafe.id || cedula);

    const response = NextResponse.json({ success: true, user: userSafe });
    response.cookies.set('session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: maxAgeSeconds,
    });
    return response;
  } catch (error) {
    console.error('Error logging in:', error);
    return NextResponse.json({ success: false, message: 'Error interno del servidor' }, { status: 500 });
  }
}
