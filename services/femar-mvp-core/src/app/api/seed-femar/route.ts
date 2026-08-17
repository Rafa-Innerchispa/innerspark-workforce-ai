import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';

const employees = [
  {
    id: 'FEMAR-001',
    cedula: 'FEMAR-001',
    firstName: 'Laura',
    secondName: 'Isabel',
    firstLastName: 'Salazar',
    secondLastName: 'Sanchez',
    name: 'Laura Isabel Salazar Sanchez',
    role: 'Jefa de Operaciones',
    department: 'Operaciones',
    phone: '0991001001',
    email: 'laura.salazar.demo@femar.example',
    address: 'Av. Francisco de Orellana, Guayaquil',
    dob: '1987-04-18',
    status: 'Activo',
    baseSalary: 1850,
    photo: 'https://i.pravatar.cc/150?img=47',
  },
  {
    id: 'FEMAR-002',
    cedula: 'FEMAR-002',
    firstName: 'Diego',
    secondName: 'Andres',
    firstLastName: 'Sanchez',
    secondLastName: 'Paz',
    name: 'Diego Andres Sanchez Paz',
    role: 'Supervisor de Planta',
    department: 'Produccion',
    phone: '0991001002',
    email: 'diego.sanchez.demo@femar.example',
    address: 'Via Daule km 8.5, Guayaquil',
    dob: '1990-09-27',
    status: 'Activo',
    baseSalary: 1420,
    photo: 'https://i.pravatar.cc/150?img=12',
  },
  {
    id: 'FEMAR-003',
    cedula: 'FEMAR-003',
    firstName: 'Carlos',
    secondName: 'Manuel',
    firstLastName: 'Gomez',
    secondLastName: 'Vera',
    name: 'Carlos Manuel Gomez Vera',
    role: 'Analista de RRHH',
    department: 'Recursos Humanos',
    phone: '0991001003',
    email: 'carlos.gomez.demo@femar.example',
    address: 'Kennedy Norte, Guayaquil',
    dob: '1993-02-11',
    status: 'Activo',
    baseSalary: 1180,
    photo: 'https://i.pravatar.cc/150?img=33',
  },
  {
    id: 'FEMAR-004',
    cedula: 'FEMAR-004',
    firstName: 'Maria',
    secondName: 'Fernanda',
    firstLastName: 'Lopez',
    secondLastName: 'Mora',
    name: 'Maria Fernanda Lopez Mora',
    role: 'Ejecutiva Comercial',
    department: 'Ventas',
    phone: '0991001004',
    email: 'maria.lopez.demo@femar.example',
    address: 'Samborondon, Guayas',
    dob: '1995-12-03',
    status: 'Activo',
    baseSalary: 980,
    photo: 'https://i.pravatar.cc/150?img=25',
  },
];

async function commitChunks(writes: Array<(batch: FirebaseFirestore.WriteBatch) => void>) {
  let committed = 0;
  for (let index = 0; index < writes.length; index += 400) {
    const batch = db.batch();
    writes.slice(index, index + 400).forEach(write => write(batch));
    await batch.commit();
    committed += Math.min(400, writes.length - index);
  }
  return committed;
}

function makeAttendanceWrites() {
  const writes: Array<(batch: FirebaseFirestore.WriteBatch) => void> = [];
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - 730);
  start.setUTCHours(0, 0, 0, 0);

  for (let day = 0; day < 730; day++) {
    const current = new Date(start);
    current.setUTCDate(start.getUTCDate() + day);
    const weekday = current.getUTCDay();
    if (weekday === 0 || weekday === 6) continue;

    employees.forEach((employee, employeeIndex) => {
      const pattern = (day + employeeIndex) % 20;
      if (pattern === 7) return;

      const checkIn = new Date(current);
      checkIn.setUTCHours(pattern === 3 ? 9 : 8, pattern === 3 ? 27 : 55 + (employeeIndex % 3), 0, 0);
      const checkOut = new Date(current);
      checkOut.setUTCHours(pattern === 11 ? 16 : pattern === 5 ? 18 : 17, pattern === 5 ? 45 : 30, 0, 0);

      const dateKey = current.toISOString().slice(0, 10);
      const inId = `seed-femar-${employee.id}-${dateKey}-in`;
      writes.push(batch => batch.set(db.collection('adms_logs').doc(inId), {
        user_id: employee.id,
        serial_number: 'FEMAR-DEMO-ZK-01',
        timestamp: checkIn.toISOString(),
        state: '0',
        source: 'ZKTECO',
        companyId: 'femar',
        demoSeed: true,
        updatedAt: new Date().toISOString(),
      }, { merge: true }));

      if (pattern !== 13) {
        const outId = `seed-femar-${employee.id}-${dateKey}-out`;
        writes.push(batch => batch.set(db.collection('adms_logs').doc(outId), {
          user_id: employee.id,
          serial_number: 'FEMAR-DEMO-ZK-01',
          timestamp: checkOut.toISOString(),
          state: '1',
          source: 'ZKTECO',
          companyId: 'femar',
          demoSeed: true,
          updatedAt: new Date().toISOString(),
        }, { merge: true }));
      }

      if (pattern === 9 || pattern === 15) {
        const mobileId = `seed-femar-mobile-${employee.id}-${dateKey}`;
        writes.push(batch => batch.set(db.collection('mobile_logs').doc(mobileId), {
          user_id: employee.id,
          location: { lat: -2.170998, lng: -79.922359 },
          photo_url: employee.photo,
          timestamp: checkIn.toISOString(),
          source: 'MOBILE',
          companyId: 'femar',
          demoSeed: true,
          updatedAt: new Date().toISOString(),
        }, { merge: true }));
      }
    });
  }

  return writes;
}

export async function GET(req: NextRequest) {
  const confirm = req.nextUrl.searchParams.get('confirm');
  if (confirm !== 'femar-demo-seed') {
    return NextResponse.json({
      success: false,
      message: 'Add ?confirm=femar-demo-seed to run the non-destructive FEMAR demo seed.'
    }, { status: 400 });
  }

  const employeeWrites = employees.map(employee => (batch: FirebaseFirestore.WriteBatch) => {
    batch.set(db.collection('employees').doc(employee.id), {
      ...employee,
      companyId: 'femar',
      demoSeed: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  });

  const attendanceWrites = makeAttendanceWrites();
  const employeeCount = await commitChunks(employeeWrites);
  const attendanceCount = await commitChunks(attendanceWrites);

  return NextResponse.json({
    success: true,
    companyId: 'femar',
    employees: employeeCount,
    attendanceEvents: attendanceCount,
    yearsSeeded: 2,
  });
}
