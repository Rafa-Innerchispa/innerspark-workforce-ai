import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const { cedula, name, password, companyId } = await req.json();

    if (!cedula || !name || !password || !companyId) {
      return NextResponse.json({ success: false, message: 'Todos los campos son obligatorios' }, { status: 400 });
    }

    const docRef = db.collection('users').doc(cedula);
    const doc = await docRef.get();

    if (doc.exists) {
      return NextResponse.json({ success: false, message: 'La cédula ya está registrada' }, { status: 409 });
    }

    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');

    await docRef.set({
      cedula,
      name,
      password: hashedPassword,
      companyId,
      role: 'employee', // Default role, admin can upgrade
      status: 'PENDING',
      createdAt: new Date().toISOString()
    });

    return NextResponse.json({ success: true, message: 'Registro exitoso, en espera de aprobación.' });

  } catch (error) {
    console.error('Error in registration:', error);
    return NextResponse.json({ success: false, message: 'Error interno del servidor' }, { status: 500 });
  }
}
