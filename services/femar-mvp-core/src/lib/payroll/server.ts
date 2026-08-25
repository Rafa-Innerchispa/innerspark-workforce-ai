import { db } from '@/lib/firebase';
import { calculatePayroll, type PayrollRules } from './engine';

export async function loadPayrollPreview(tenantId: string, period?: string) {
  const employeeSnapshot = await db.collection('employees').where('companyId', '==', tenantId).get();
  const employees = employeeSnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Array<Record<string, unknown>>;
  const employeeIds = new Set(employees.map(e => String(e.id)));

  const noveltySnapshot = await db.collection('novelties').orderBy('timestamp', 'desc').limit(5000).get();
  const novelties = noveltySnapshot.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(n => {
      const belongsToEmployee = employeeIds.has(String(n.user_id));
      const belongsToTenant = !n.companyId || String(n.companyId) === tenantId;
      const belongsToPeriod = !period || String(n.timestamp || '').slice(0, 7) === period;
      return belongsToEmployee && belongsToTenant && belongsToPeriod;
    });

  const rulesSnap = await db.collection('payroll_rules').doc(tenantId).get();
  const rules = rulesSnap.exists ? rulesSnap.data() as PayrollRules : null;

  const rows = employees.map(emp => {
    const employeeId = String(emp.id);
    const own = novelties.filter(n => String(n.user_id) === employeeId);
    const facts = {
      employeeId,
      name: String(emp.name || employeeId),
      department: String(emp.department || 'Sin departamento'),
      baseSalary: Number(emp.baseSalary || emp.salary || 0),
      lateEvents: own.filter(n => n.type === 'LATE_ARRIVAL').length,
      lateMinutes: own.filter(n => n.type === 'LATE_ARRIVAL').reduce((a,n) => a + Number(n.minutes || 0), 0),
      overtimeMinutes: own.filter(n => n.type === 'OVERTIME').reduce((a,n) => a + Number(n.minutes || 0), 0),
      earlyDepartureMinutes: own.filter(n => n.type === 'EARLY_DEPARTURE').reduce((a,n) => a + Number(n.minutes || 0), 0),
      sourceEvents: own.length,
    };

    const payroll = rules ? calculatePayroll({
      employeeId: facts.employeeId,
      name: facts.name,
      department: facts.department,
      baseSalary: facts.baseSalary,
      lateMinutes: facts.lateMinutes,
      overtimeMinutes: facts.overtimeMinutes,
      earlyDepartureMinutes: facts.earlyDepartureMinutes,
    }, rules) : null;

    return { ...facts, payroll };
  });

  const totals = rows.reduce((acc, row) => {
    if (!row.payroll) return acc;
    acc.grossEarnings += row.payroll.grossEarnings;
    acc.deductions += row.payroll.deductions;
    acc.netPay += row.payroll.netPay;
    acc.employerCost += row.payroll.employerCost;
    return acc;
  }, { grossEarnings: 0, deductions: 0, netPay: 0, employerCost: 0 });

  return {
    tenantId,
    period: period || null,
    rows,
    totals,
    rules: {
      monetaryAdjustmentsConfigured: Boolean(rules),
      version: rules?.version || null,
      currency: rules?.currency || null,
      note: rules
        ? 'Payroll preview calculated with the tenant versioned rules shown in rules.version.'
        : 'Attendance facts are real. Configure tenant payroll rules before monetary amounts are calculated.',
    },
  };
}
