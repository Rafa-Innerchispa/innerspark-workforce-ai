import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/firebase';
import { notifyAdminPendingUser } from '@/lib/authPolicy';
import {
  leadUserDocument,
  resolveIdNumber,
  validateLeadRegistration,
  type LeadRegistrationPayload,
} from '@/lib/leadRegistration';
import {
  decodeGoogleOnboardingProfile,
  encodeGoogleOnboardingProfile,
  googleOnboardingCookieName,
} from '@/lib/googleOnboardingCookie';
import { resolveOAuthOrigin } from '@/lib/googleAuth';

export async function GET() {
  const cookieStore = await cookies();
  const profile = decodeGoogleOnboardingProfile(cookieStore.get(googleOnboardingCookieName())?.value);
  if (!profile) {
    return NextResponse.json({ success: false, message: 'Sesión de Google expirada' }, { status: 401 });
  }
  return NextResponse.json({
    success: true,
    profile: {
      email: profile.email,
      name: profile.name,
      picture: profile.picture,
    },
  });
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const profile = decodeGoogleOnboardingProfile(cookieStore.get(googleOnboardingCookieName())?.value);
    if (!profile) {
      return NextResponse.json({ success: false, message: 'Sesión de Google expirada. Vuelve a usar Google.' }, { status: 401 });
    }

    const body = (await req.json()) as LeadRegistrationPayload;
    const payload: LeadRegistrationPayload = {
      ...body,
      googleEmail: profile.email,
      email: profile.email,
      idNumber: resolveIdNumber(body),
      cedula: resolveIdNumber(body),
    };

    const validationError = validateLeadRegistration(payload);
    if (validationError) {
      return NextResponse.json({ success: false, message: validationError }, { status: 400 });
    }

    const userDoc = leadUserDocument(payload, {
      authProvider: 'google',
      authMethods: ['google', 'password'],
      googleSub: profile.sub,
      picture: profile.picture || '',
      createdAt: new Date().toISOString(),
    });

    const docRef = db.collection('users').doc(userDoc.id);
    const existing = await docRef.get();
    if (existing.exists) {
      return NextResponse.json({ success: false, message: 'Este documento ya está registrado' }, { status: 409 });
    }

    const emailSnap = await db.collection('users').where('email', '==', profile.email).limit(1).get();
    if (!emailSnap.empty) {
      const existingData = emailSnap.docs[0].data();
      const isPartial =
        existingData.authProvider === 'google' && !existingData.idNumber && !existingData.cedula;
      if (isPartial) {
        await emailSnap.docs[0].ref.delete();
      } else if (existingData.status === 'PENDING') {
        return NextResponse.json(
          { success: false, message: 'Tu solicitud ya está pendiente de aprobación. Revisa tu correo o contacta al administrador.' },
          { status: 409 }
        );
      } else {
        return NextResponse.json(
          { success: false, message: 'Este correo de Google ya tiene una solicitud registrada' },
          { status: 409 }
        );
      }
    }

    const url = new URL(req.url);
    const origin = resolveOAuthOrigin(url, cookieStore.get('google_oauth_origin')?.value, req.headers);

    await docRef.set(userDoc);

    const notifyEmail = userDoc.corporateEmail || userDoc.email;
    await notifyAdminPendingUser({
      name: userDoc.name,
      cedula: userDoc.idNumber,
      idNumber: userDoc.idNumber,
      idType: userDoc.idType,
      documentCountry: userDoc.documentCountry,
      email: notifyEmail,
      phone: userDoc.phone,
      address: `${userDoc.address}, ${userDoc.city}, ${userDoc.country}`,
      companyId: userDoc.companyId,
      companyRequest: userDoc.companyRequest,
      authProvider: 'google',
      origin,
      birthDate: userDoc.birthDate,
    });

    const response = NextResponse.json({
      success: true,
      message: 'Solicitud enviada. El administrador revisará tu acceso.',
    });
    response.cookies.set(googleOnboardingCookieName(), '', { maxAge: 0, path: '/' });
    return response;
  } catch (error) {
    console.error('Google onboarding failed', error);
    return NextResponse.json({ success: false, message: 'Error interno' }, { status: 500 });
  }
}

export function issueGoogleOnboardingCookie(
  profile: Omit<import('@/lib/googleOnboardingCookie').GoogleOnboardingProfile, 'exp'>
): string {
  return encodeGoogleOnboardingProfile(profile);
}
