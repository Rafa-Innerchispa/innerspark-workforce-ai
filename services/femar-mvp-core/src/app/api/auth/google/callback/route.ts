import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { db } from '@/lib/firebase';
import {
  exchangeGoogleCode,
  fetchGoogleProfile,
  googleOAuthConfigured,
  mapGoogleEmailToCompany,
  resolveOAuthOrigin,
} from '@/lib/googleAuth';
import { ISKCON_DEMO_USERS, resolveAllowedModuleIds } from '@/lib/entityEntitlements';
import { isAutoApprovedEmail } from '@/lib/authPolicy';
import {
  encodeGoogleOnboardingProfile,
  googleOnboardingCookieName,
} from '@/lib/googleOnboardingCookie';

function loginResponse(
  userId: string,
  companyId: string,
  url: URL,
  clearOAuthCookies = true,
  publicOrigin?: string
): NextResponse {
  const response = NextResponse.redirect('/app/modules');
  const secureCookies = (publicOrigin || `${url.protocol}//${url.host}`).startsWith('https://');
  response.cookies.set('session_token', userId, {
    httpOnly: true,
    secure: secureCookies,
    sameSite: 'lax',
    path: '/',
  });
  response.cookies.set('inneros_entity', companyId, { path: '/', maxAge: 86400 * 30 });
  if (clearOAuthCookies) {
    response.cookies.set('google_oauth_state', '', { maxAge: 0, path: '/' });
    response.cookies.set('google_oauth_origin', '', { maxAge: 0, path: '/' });
    response.cookies.set(googleOnboardingCookieName(), '', { maxAge: 0, path: '/' });
  }
  return response;
}

export async function GET(req: Request) {
  if (!googleOAuthConfigured()) {
    return NextResponse.redirect('/app/login?error=google_not_configured');
  }

  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookieStore = await cookies();
  const savedState = cookieStore.get('google_oauth_state')?.value;

  if (!code || !state || !savedState || state !== savedState) {
    return NextResponse.redirect('/app/login?error=google_state');
  }

  const origin = resolveOAuthOrigin(url, cookieStore.get('google_oauth_origin')?.value, req.headers);
  const host = new URL(origin).host;
  const secureCookies = origin.startsWith('https://');

  try {
    const token = await exchangeGoogleCode(code, origin);
    const profile = await fetchGoogleProfile(token.access_token);
    const email = (profile.email || profile.sub).toLowerCase();

    const userDoc = await db.collection('users').where('email', '==', email).limit(1).get();
    const existing = userDoc.docs[0];
    const userData = existing?.data();
    const userId = existing?.id;

    if (userData && userId) {
      if (userData.status === 'REJECTED') {
        return NextResponse.redirect('/app/login?error=account_rejected');
      }
      if (userData.status === 'PENDING') {
        const response = NextResponse.redirect('/app/pending-approval');
        response.cookies.set('google_oauth_state', '', { maxAge: 0, path: '/' });
        response.cookies.set('google_oauth_origin', '', { maxAge: 0, path: '/' });
        return response;
      }
      return loginResponse(userId, userData.companyId || mapGoogleEmailToCompany(email, host), url, true, origin);
    }

    if (isAutoApprovedEmail(email)) {
      const companyId = mapGoogleEmailToCompany(email, host);
      const newUserId = `google_${profile.sub}`;
      const iskconPreset = Object.values(ISKCON_DEMO_USERS).find(
        (u) => email.includes('iskcon') || companyId === 'iskcon'
      );
      const modules = resolveAllowedModuleIds(companyId, 'superadmin', iskconPreset?.modules);
      await db.collection('users').doc(newUserId).set({
        id: newUserId,
        cedula: newUserId,
        email,
        name: profile.name || email.split('@')[0],
        role: 'superadmin',
        companyId,
        status: 'APPROVED',
        modules,
        authProvider: 'google',
        picture: profile.picture,
        createdAt: new Date().toISOString(),
        password: `${crypto.randomBytes(8).toString('hex')}:${crypto.randomBytes(32).toString('hex')}`,
      });
      return loginResponse(newUserId, companyId, url, true, origin);
    }

    const response = NextResponse.redirect('/app/onboarding/google');
    response.cookies.set(
      googleOnboardingCookieName(),
      encodeGoogleOnboardingProfile({
        sub: profile.sub,
        email,
        name: profile.name || email.split('@')[0],
        picture: profile.picture,
      }),
      {
        httpOnly: true,
        secure: secureCookies,
        sameSite: 'lax',
        path: '/',
        maxAge: 15 * 60,
      }
    );
    response.cookies.set('google_oauth_state', '', { maxAge: 0, path: '/' });
    response.cookies.set('google_oauth_origin', '', { maxAge: 0, path: '/' });
    return response;
  } catch (err) {
    console.error('Google OAuth callback failed', err);
    return NextResponse.redirect('/app/login?error=google_failed');
  }
}
