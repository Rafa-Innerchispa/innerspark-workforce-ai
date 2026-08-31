import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { db } from '@/lib/firebase';
import {
  absoluteAppRedirect,
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
import { applySessionCookies, buildSessionCookieOptions } from '@/lib/sessionCookies';

function postLoginPath(origin: string): string {
  try {
    const host = new URL(origin).hostname.toLowerCase();
    if (host.includes('iskcon.') || host.includes('iskconguayaquil')) {
      return '/app/desk';
    }
  } catch {
    // ignore
  }
  return '/app/modules';
}

function loginResponse(
  userId: string,
  companyId: string,
  origin: string,
  req: Request,
  clearOAuthCookies = true
): NextResponse {
  const response = NextResponse.redirect(absoluteAppRedirect(origin, postLoginPath(origin)).href);
  applySessionCookies(response, req, userId, companyId);
  if (clearOAuthCookies) {
    response.cookies.set('google_oauth_state', '', { maxAge: 0, path: '/' });
    response.cookies.set('google_oauth_origin', '', { maxAge: 0, path: '/' });
    response.cookies.set(googleOnboardingCookieName(), '', { maxAge: 0, path: '/' });
  }
  return response;
}

function redirectTo(origin: string, path: string, init?: ResponseInit): NextResponse {
  return NextResponse.redirect(absoluteAppRedirect(origin, path).href, init);
}

function logCallback(event: string, data: Record<string, unknown> = {}) {
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      component: 'google_oauth_callback',
      event,
      ...data,
    })
  );
}

function onboardingResponse(
  origin: string,
  profile: { sub: string; email: string; name: string; picture?: string },
  req: Request
): NextResponse {
  const response = redirectTo(origin, '/app/onboarding/google');
  const opts = buildSessionCookieOptions(req, 15 * 60);
  response.cookies.set(
    googleOnboardingCookieName(),
    encodeGoogleOnboardingProfile({
      sub: profile.sub,
      email: profile.email,
      name: profile.name,
      picture: profile.picture,
    }),
    opts
  );
  response.cookies.set('google_oauth_state', '', { maxAge: 0, path: '/' });
  response.cookies.set('google_oauth_origin', '', { maxAge: 0, path: '/' });
  return response;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const cookieStore = await cookies();
  const origin = resolveOAuthOrigin(url, cookieStore.get('google_oauth_origin')?.value, req.headers);
  const secureCookies = origin.startsWith('https://');

  if (!googleOAuthConfigured()) {
    logCallback('oauth_not_configured', { origin });
    return redirectTo(origin, '/app/login?error=google_not_configured');
  }

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const savedState = cookieStore.get('google_oauth_state')?.value;

  if (!code || !state || !savedState || state !== savedState) {
    logCallback('state_mismatch', {
      origin,
      hasCode: Boolean(code),
      hasState: Boolean(state),
      hasSavedState: Boolean(savedState),
      stateMatches: Boolean(state && savedState && state === savedState),
    });
    return redirectTo(origin, '/app/login?error=google_state');
  }

  const host = new URL(origin).host;
  logCallback('exchange_start', { origin, host });

  try {
    const token = await exchangeGoogleCode(code, origin);
    const profile = await fetchGoogleProfile(token.access_token);
    const email = (profile.email || profile.sub).toLowerCase();
    logCallback('profile_fetched', { origin, emailDomain: email.split('@')[1] || 'unknown' });

    const userDoc = await db.collection('users').where('email', '==', email).limit(1).get();
    const existing = userDoc.docs[0];
    let userData: FirebaseFirestore.DocumentData | undefined = existing?.data();
    let userId: string | undefined = existing?.id;

    // Drop stale partial Google stubs so onboarding can restart cleanly.
    const isPartialGoogleUser =
      existing &&
      userData &&
      userData.authProvider === 'google' &&
      !userData.idNumber &&
      !userData.cedula;

    if (isPartialGoogleUser) {
      logCallback('partial_google_cleanup', {
        origin,
        userId,
        status: userData?.status || null,
        email,
      });
      await existing!.ref.delete();
      userData = undefined;
      userId = undefined;
    }

    if (userData && userId) {
      logCallback('existing_user', { origin, userId, status: userData.status || 'approved' });
      if (userData.status === 'REJECTED') {
        return redirectTo(origin, '/app/login?error=account_rejected');
      }
      if (userData.status === 'PENDING') {
        const response = redirectTo(origin, '/app/pending-approval?info=pending');
        response.cookies.set('google_oauth_state', '', { maxAge: 0, path: '/' });
        response.cookies.set('google_oauth_origin', '', { maxAge: 0, path: '/' });
        return response;
      }
      return loginResponse(userId, userData.companyId || mapGoogleEmailToCompany(email, host), origin, req);
    }

    if (isAutoApprovedEmail(email)) {
      logCallback('auto_approve', { origin, emailDomain: email.split('@')[1] || 'unknown' });
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
      return loginResponse(newUserId, companyId, origin, req);
    }

    logCallback('onboarding_redirect', { origin });
    const response = onboardingResponse(
      origin,
      {
        sub: profile.sub,
        email,
        name: profile.name || email.split('@')[0],
        picture: profile.picture,
      },
      req
    );
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logCallback('failed', { origin, error: message });
    console.error('Google OAuth callback failed', err);
    return redirectTo(origin, '/app/login?error=google_failed');
  }
}
