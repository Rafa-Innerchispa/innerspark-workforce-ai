import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { hashSessionToken, SESSION_COOKIE } from '@/lib/auth/server';

function readCookie(header: string | null, name: string) {
  if (!header) return null;
  for (const part of header.split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) return decodeURIComponent(value.join('='));
  }
  return null;
}

export async function POST(req: Request) {
  const token = readCookie(req.headers.get('cookie'), SESSION_COOKIE);
  if (token) {
    const ref = db.collection('auth_sessions').doc(hashSessionToken(token));
    const snap = await ref.get();
    if (snap.exists) {
      await ref.update({ revokedAt: new Date().toISOString() }).catch(() => undefined);
    }
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE, '', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', expires: new Date(0) });
  return response;
}
