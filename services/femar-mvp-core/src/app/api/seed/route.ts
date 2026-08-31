import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { requireSuperAdmin } from '@/lib/sessionAuth';

export async function GET() {
  const user = await requireSuperAdmin();
  if (user instanceof NextResponse) return user;

  const batch = db.batch();

  const clients = [
    // FEMAR test clients
    { id: '1111111111', name: 'Laura Isabel Salazar Sánchez', role: 'employee', companyId: 'femar', status: 'APPROVED' },
    { id: '1111111112', name: 'Diego Andrés Sánchez Paz', role: 'employee', companyId: 'femar', status: 'APPROVED' },
    { id: '1111111113', name: 'Carlos Manuel Gómez', role: 'employee', companyId: 'femar', status: 'APPROVED' },
    { id: '1111111114', name: 'Maria Fernanda López', role: 'employee', companyId: 'femar', status: 'APPROVED' },
    
    // PC Doctor (Héctor, Mejías, Nicolás, Rafa)
    { id: '0910000001', name: 'Héctor', role: 'employee', companyId: 'pcdoctor', status: 'APPROVED' },
    { id: '0910000002', name: 'Mejías', role: 'employee', companyId: 'pcdoctor', status: 'APPROVED' },
    { id: '0910000003', name: 'Nicolás', role: 'employee', companyId: 'pcdoctor', status: 'APPROVED' },
    { id: '0914832423', name: 'Rafael Lopez', role: 'superadmin', companyId: 'pcdoctor', status: 'APPROVED' },
    
    // IA Pro
    { id: '0950626317', name: 'Sistema Principal IA', role: 'admin', companyId: 'iapro', status: 'APPROVED' },
  ];

  for (const c of clients) {
    const ref = db.collection('users').doc(c.id);
    batch.set(ref, {
      ...c,
      cedula: c.id,
      createdAt: new Date().toISOString()
    }, { merge: true });
  }

  await batch.commit();
  return NextResponse.json({ success: true, message: 'Seeded exact clients for PC Doctor and Femar' });
}
