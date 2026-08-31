import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { HACKATHON_DEMO_USERS, ISKCON_DEMO_USERS } from '@/lib/entityEntitlements';
import { isJudgeDemoLoginId, JUDGE_DEMO_PASSWORD } from '@/lib/judgeCredentials';
import { hashPassword, verifyPassword } from '@/lib/passwordHash';
import { applySessionCookies } from '@/lib/sessionCookies';

async function resolveUserDocument(loginId: string) {
  const trimmed = loginId.trim();
  const docRef = db.collection('users').doc(trimmed);
  let doc = await docRef.get();

  if (!doc.exists && trimmed.includes('@')) {
    const snap = await db.collection('users').where('email', '==', trimmed.toLowerCase()).limit(1).get();
    if (!snap.empty) doc = snap.docs[0];
  }

  if (!doc.exists) {
    for (const field of ['idNumber', 'cedula'] as const) {
      const snap = await db.collection('users').where(field, '==', trimmed).limit(1).get();
      if (!snap.empty) {
        doc = snap.docs[0];
        break;
      }
    }
  }

  return doc;
}

export async function POST(req: Request) {
  try {
    const { cedula, password } = await req.json();
    
    if (!cedula || !password) {
      return NextResponse.json({ success: false, message: 'Usuario/cédula y contraseña son obligatorios' }, { status: 400 });
    }

    const mockDemos: Record<string, any> = {
      '0914832423': { id: '0914832423', cedula: '0914832423', name: 'Super Administrador (Rafa)', role: 'superadmin', companyId: 'pcdoctor', status: 'APPROVED', modules: ['workforce-ai', 'smart-quoter', 'quoteops', 'visitors', 'iskcon-desk', 'founderos', 'inneros-admin', 'a2a-gateway'] },
      '0950626317': { id: '0950626317', cedula: '0950626317', name: 'Andrés Ramos', role: 'admin', companyId: 'iapro', status: 'APPROVED', modules: ['workforce-ai'] },
      '1111111111': { id: '1111111111', cedula: '1111111111', name: 'Admin FEMAR', role: 'admin', companyId: 'femar', status: 'APPROVED', modules: ['workforce-ai'] },
      '2222222222': { id: '2222222222', cedula: '2222222222', name: 'Admin PC Doctor', role: 'admin', companyId: 'pcdoctor', status: 'APPROVED', modules: ['workforce-ai', 'smart-quoter', 'quoteops', 'visitors', 'iskcon-desk', 'founderos', 'inneros-admin'] },
      ...Object.fromEntries(
        Object.entries(HACKATHON_DEMO_USERS).map(([k, v]) => [
          k,
          { id: k, cedula: k, name: v.name, role: v.role, companyId: v.companyId, status: 'APPROVED', modules: ['workforce-ai', 'smart-quoter', 'quoteops', 'visitors', 'iskcon-desk', 'founderos'] },
        ])
      ),
      ...Object.fromEntries(
        Object.entries(ISKCON_DEMO_USERS).map(([k, v]) => [
          k,
          { id: k, cedula: k, name: v.name, role: v.role, companyId: v.companyId, status: 'APPROVED', modules: v.modules },
        ])
      ),
    };

    const loginKey = String(cedula).trim();
    const loginKeyUpper = loginKey.toUpperCase();
    const judgeDemo = isJudgeDemoLoginId(loginKey);
    if (judgeDemo && password === JUDGE_DEMO_PASSWORD) {
      const response = NextResponse.json({
        success: true,
        user: {
          id: loginKeyUpper,
          cedula: loginKeyUpper,
          name: 'Hackathon Judge',
          role: 'superadmin',
          companyId: 'hackathon',
          status: 'APPROVED',
          modules: ['inneros-admin', 'a2a-gateway', 'iskcon-desk'],
        },
      });
      applySessionCookies(response, req, loginKeyUpper, 'hackathon');
      return response;
    }
    const docRef = db.collection('users').doc(judgeDemo ? loginKeyUpper : loginKey);
    let doc = await docRef.get();

    // Auto-seed hardcoded admins for MVP if they don't exist
    if (!doc.exists && (mockDemos[loginKeyUpper] || mockDemos[loginKey])) {
      const seedKey = mockDemos[loginKeyUpper] ? loginKeyUpper : loginKey;
      const newAdmin = mockDemos[seedKey];
      const seedPassword = judgeDemo ? JUDGE_DEMO_PASSWORD : password;
      await docRef.set({
        ...newAdmin,
        id: seedKey,
        cedula: seedKey,
        password: hashPassword(seedPassword),
        authMethods: ['password'],
        createdAt: new Date().toISOString(),
      });
      doc = await docRef.get();
    }

    if (!doc.exists) {
      doc = await resolveUserDocument(loginKey);
    }

    if (!doc.exists) {
      return NextResponse.json({ success: false, message: 'Usuario no encontrado' }, { status: 404 });
    }

    const user = doc.data();
    let isMatch = verifyPassword(password, user?.password);

    // Canonical judge password — reset hash if an old first-login password was stored
    if (!isMatch && judgeDemo && password === JUDGE_DEMO_PASSWORD) {
      await docRef.update({ password: hashPassword(JUDGE_DEMO_PASSWORD), authMethods: ['password'] });
      isMatch = true;
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
    const { password: _, ...userSafe } = user!;
    const sessionId = doc.id;
    
    const response = NextResponse.json({ success: true, user: { ...userSafe, id: sessionId } });
    applySessionCookies(response, req, sessionId, user?.companyId);
    return response;

  } catch (error) {
    console.error('Error logging in:', error);
    return NextResponse.json({ success: false, message: 'Error interno del servidor' }, { status: 500 });
  }
}
