import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  buildGoogleAuthUrl,
  googleOAuthConfigured,
  newOAuthState,
  resolveOAuthOrigin,
} from '@/lib/googleAuth';

export async function GET(req: Request) {
  if (!googleOAuthConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'google_oauth_not_configured' },
      { status: 503 }
    );
  }

  const url = new URL(req.url);
  const origin = resolveOAuthOrigin(url, null, req.headers);
  const secureCookies = origin.startsWith('https://');
  const state = newOAuthState();
  const redirect = buildGoogleAuthUrl(origin, state);

  const response = NextResponse.redirect(redirect);
  response.cookies.set('google_oauth_state', state, {
    httpOnly: true,
    secure: secureCookies,
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });
  response.cookies.set('google_oauth_origin', origin, {
    httpOnly: true,
    secure: secureCookies,
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });
  return response;
}
