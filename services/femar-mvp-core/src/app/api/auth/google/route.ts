import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  buildGoogleAuthUrl,
  googleOAuthConfigured,
  newOAuthState,
  resolveOAuthOrigin,
} from '@/lib/googleAuth';
import { buildSessionCookieOptions } from '@/lib/sessionCookies';

export async function GET(req: Request) {
  if (!googleOAuthConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'google_oauth_not_configured' },
      { status: 503 }
    );
  }

  const url = new URL(req.url);
  const origin = resolveOAuthOrigin(url, null, req.headers);
  const state = newOAuthState();
  const redirect = buildGoogleAuthUrl(origin, state);

  const response = NextResponse.redirect(redirect);
  const oauthOpts = buildSessionCookieOptions(req, 600);
  response.cookies.set('google_oauth_state', state, oauthOpts);
  response.cookies.set('google_oauth_origin', origin, oauthOpts);
  return response;
}
