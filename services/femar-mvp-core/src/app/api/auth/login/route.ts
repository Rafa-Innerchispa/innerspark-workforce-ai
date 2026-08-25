import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { createServerSession, SESSION_COOKIE } from '@/lib/auth/server';

function verifyPassword(stored: string, password: string) {
  if (!stored) return { ok: false, legacy: false };
  if (stored.includes(':')) {
    const [salt, key] = stored.split(':');
    const derived = crypto.scryptSync(password, salt, 64);
    const actual = Buffer.from(key, 'hex');
    if (actual.length !== derived.length) return { ok: false, legacy: false };
    return { ok: crypto.timingSafeEqual(actual, derived), legacy: false };
  }
  const legacyHash = crypto.createHash('sha256').update(password).digest('hex');
  return { ok: crypto.timingSafeEqual(Buffer.from(legacyHash), Buffer.from(stored)), legacy: true };
}

function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString('hex');
  const key = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${key}`;
}

export async function POST(req: Request) {
  try {
    const { cedula, password } = await req.json();
    if (!cedula || !password) {
      return NextResponse.json({ success: false, message: 'Cédula y contraseña son obligatorias' }, { status: 400 });
    }

    const docRef = db.collection('users').doc(String(cedula));
    const doc = await docRef.get();
    if (!doc.exists) {
      return NextResponse.json({ success: false, message: 'Usuario o contraseña incorrectos' }, { status: 401 });
    }

    const user = doc.data() || {};
    const verification = verifyPassword(String(user.password || ''), String(password));
    if (!verification.ok) {
      return NextResponse.json({ success: false, message: 'Usuario o contraseña incorrectos' }, { status: 401 });
    }

    if (user.status !== 'APPROVED') {
      const message = user.status === 'REJECTED'
        ? 'Tu solicitud de cuenta ha sido rechazada'
        : 'Tu cuenta está pendiente de aprobación';
      return NextResponse.json({ success: false, message }, { status: 403 });
    }

    if (verification.legacy) {
      await docRef.update({ password: hashPassword(String(password)), passwordMigratedAt: new Date().toISOString() });
    }

    const session = await createServerSession(user);
    const { password: _password, ...safeUser } = user;
    const response = NextResponse.json({
      success: true,
      user: { ...safeUser, role: session.role, companyId: session.tenantId },
      session: { expiresAt: session.expiresAt },
    });

    response.cookies.set(SESSION_COOKIE, session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: new Date(session.expiresAt),
    });
    return response;
  } catch (error) {
    console.error('Error logging in:', error);
    return NextResponse.json({ success: false, message: 'Error interno del servidor' }, { status: 500 });
  }
}
