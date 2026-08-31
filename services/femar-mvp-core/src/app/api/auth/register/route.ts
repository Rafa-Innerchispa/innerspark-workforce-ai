import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { notifyAdminPendingUser } from '@/lib/authPolicy';
import {
  leadUserDocument,
  resolveIdNumber,
  validateLeadRegistration,
  type LeadRegistrationPayload,
} from '@/lib/leadRegistration';
import { resolveOAuthOrigin } from '@/lib/googleAuth';

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as LeadRegistrationPayload;
    const payload: LeadRegistrationPayload = {
      ...body,
      idNumber: resolveIdNumber(body),
      cedula: resolveIdNumber(body),
    };

    const validationError = validateLeadRegistration(payload);
    if (validationError) {
      return NextResponse.json({ success: false, message: validationError }, { status: 400 });
    }

    const userDoc = leadUserDocument(payload, {
      authProvider: 'password',
      authMethods: ['password'],
      createdAt: new Date().toISOString(),
    });

    const docRef = db.collection('users').doc(userDoc.id);
    const doc = await docRef.get();
    if (doc.exists) {
      return NextResponse.json({ success: false, message: 'Este documento ya está registrado' }, { status: 409 });
    }

    if (payload.email) {
      const emailSnap = await db
        .collection('users')
        .where('email', '==', String(payload.email).toLowerCase())
        .limit(1)
        .get();
      if (!emailSnap.empty) {
        return NextResponse.json({ success: false, message: 'Este correo ya está registrado' }, { status: 409 });
      }
    }

    const url = new URL(req.url);
    const origin = resolveOAuthOrigin(url, null, req.headers);

    await docRef.set(userDoc);

    await notifyAdminPendingUser({
      name: userDoc.name,
      cedula: userDoc.idNumber,
      idNumber: userDoc.idNumber,
      idType: userDoc.idType,
      documentCountry: userDoc.documentCountry,
      email: userDoc.email,
      phone: userDoc.phone,
      address: `${userDoc.address}, ${userDoc.city}, ${userDoc.country}`,
      companyId: userDoc.companyId,
      companyRequest: userDoc.companyRequest,
      authProvider: 'password',
      origin,
      birthDate: userDoc.birthDate,
    });

    return NextResponse.json({
      success: true,
      message: 'Registro enviado. Un administrador debe aprobar tu acceso antes de ingresar.',
    });
  } catch (error) {
    console.error('Error in registration:', error);
    return NextResponse.json({ success: false, message: 'Error interno del servidor' }, { status: 500 });
  }
}
