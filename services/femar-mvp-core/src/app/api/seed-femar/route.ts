import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { requireSuperAdmin } from '@/lib/sessionAuth';

export async function GET() {
  const user = await requireSuperAdmin();
  if (user instanceof NextResponse) return user;

  const batch = db.batch();
  let count = 0;

  const names = ["Andres", "Carlos", "Maria", "Laura", "Jose", "Diego", "Ana", "Lucia", "Jorge", "Luis"];
  const surnames = ["Gomez", "Perez", "Lopez", "Sanchez", "Garcia", "Rodriguez", "Martinez", "Hernandez", "Diaz", "Torres"];
  const departments = ["Ventas", "Soporte", "Desarrollo", "RRHH", "Logística"];

  for (let i = 1; i <= 50; i++) {
    const id = `FEM-EMP-${String(i).padStart(3, '0')}`;
    const name = `${names[i % names.length]} ${surnames[(i * 3) % surnames.length]}`;
    
    const employee = {
      id,
      name,
      cedula: `09${String(i).padStart(8, '0')}`,
      companyId: 'femar',
      role: 'employee',
      department: departments[i % departments.length],
      status: 'Activo',
      createdAt: new Date().toISOString(),
      baseSalary: 1200 + (i * 10),
    };

    const ref = db.collection('employees').doc(id);
    batch.set(ref, employee, { merge: true });
    count++;
  }

  await batch.commit();
  return NextResponse.json({ success: true, message: `Seeded ${count} employees for femar` });
}
