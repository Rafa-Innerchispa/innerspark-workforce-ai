import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { validateNationalDocument } from '@/lib/documentValidation';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const { cedula, name, password, companyId, country = 'OTHER', documentType = 'employee_id' } = await req.json();

    if (!cedula || !name || !password || !companyId) {
      return NextResponse.json({ success: false, message: 'Todos los campos son obligatorios' }, { status: 400 });
    }

    const validation = validateNationalDocument({ value: cedula, country, documentType });
    if (!validation.ok) {
      return NextResponse.json({ success: false, message: validation.message || 'Documento inválido' }, { status: 400 });
    }

    const docRef = db.collection('users').doc(validation.normalized);
    const doc = await docRef.get();

    if (doc.exists) {
      return NextResponse.json({ success: false, message: 'La cédula ya está registrada' }, { status: 409 });
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const hashedBuffer = crypto.scryptSync(password, salt, 64);
    const hashedPassword = `${salt}:${hashedBuffer.toString('hex')}`;

    await docRef.set({
      id: validation.normalized,
      cedula: validation.normalized,
      documentId: validation.normalized,
      country,
      documentType,
      name,
      password: hashedPassword,
      companyId,
      role: 'employee', // Default role, admin can upgrade
      status: 'PENDING',
      createdAt: new Date().toISOString()
    });

    // Request email notification via Firebase Trigger Email extension
    try {
      await db.collection('mail').add({
        to: 'rafagye@gmail.com',
        message: {
          subject: 'Nuevo Usuario Pendiente de Aprobación - Workforce AI',
          html: `
            <h2>Nuevo registro en Workforce AI</h2>
            <p>El usuario <strong>${name}</strong> (Documento: ${validation.normalized}, Empresa: ${companyId}) ha solicitado acceso al sistema.</p>
            <p>Actualmente se encuentra en estado <strong>PENDING</strong>.</p>
            <br>
            <p><a href="http://workforce.pcdoctor.ai/" style="background:#2563eb;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Ingresar al Sistema para Aprobar</a></p>
          `
        }
      });
    } catch (e) {
      console.warn("Could not queue email notification", e);
    }

    return NextResponse.json({ success: true, message: 'Registro exitoso, en espera de aprobación.' });

  } catch (error) {
    console.error('Error in registration:', error);
    return NextResponse.json({ success: false, message: 'Error interno del servidor' }, { status: 500 });
  }
}
