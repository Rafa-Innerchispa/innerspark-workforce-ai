import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { authErrorResponse, requireSession } from '@/lib/auth/server';

type NoveltyRecord = {
  id: string;
  user_id?: string;
  type?: string;
  minutes?: number;
};

export async function GET(req: NextRequest) {
  try {
    const principal = await requireSession(req);
    const employeeSnapshot = await db.collection('employees').where('companyId', '==', principal.tenantId).get();
    const employees = employeeSnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Array<Record<string, unknown>>;
    const employeeIds = new Set(employees.map(e => String(e.id)));

    const noveltySnapshot = await db.collection('novelties').orderBy('timestamp', 'desc').limit(2000).get();
    const novelties = noveltySnapshot.docs
      .map(d => ({ id: d.id, ...d.data() }) as NoveltyRecord)
      .filter(n => employeeIds.has(String(n.user_id)));

    const rows = employees.map(emp => {
      const employeeId = String(emp.id);
      const own = novelties.filter(n => String(n.user_id) === employeeId);
      return {
        employeeId,
        name: String(emp.name || employeeId),
        department: String(emp.department || 'Sin departamento'),
        baseSalary: Number(emp.baseSalary || emp.salary || 0),
        lateEvents: own.filter(n => n.type === 'LATE_ARRIVAL').length,
        lateMinutes: own.filter(n => n.type === 'LATE_ARRIVAL').reduce((a, n) => a + Number(n.minutes || 0), 0),
        overtimeMinutes: own.filter(n => n.type === 'OVERTIME').reduce((a, n) => a + Number(n.minutes || 0), 0),
        earlyDepartureMinutes: own.filter(n => n.type === 'EARLY_DEPARTURE').reduce((a, n) => a + Number(n.minutes || 0), 0),
        sourceEvents: own.length
      };
    });

    return NextResponse.json({
      rows,
      rules: {
        monetaryAdjustmentsConfigured: false,
        note: 'Attendance facts are real. Monetary overtime/deduction rules are outside the basic Workforce payroll scope.'
      }
    });
  } catch (error) {
    const auth = authErrorResponse(error);
    if (auth) return NextResponse.json(auth.body, { status: auth.status });
    console.error('Prepayroll summary error:', error);
    return NextResponse.json({ error: 'Failed to load prepayroll summary' }, { status: 500 });
  }
}
