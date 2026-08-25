export type AnalyticsEmployee = {
  id: string;
  name?: string;
  department?: string;
  monthlyCost?: number;
  baseSalary?: number;
  scheduleStart?: string;
};

export type AttendanceEvent = {
  userId: string;
  timestamp: string;
  type?: 'IN' | 'OUT' | string;
};

export type AttendanceDay = {
  employeeId: string;
  date: string;
  firstIn?: string;
  lastOut?: string;
  lateMinutes?: number;
  incomplete: boolean;
};

function dayKey(iso: string) {
  return iso.slice(0, 10);
}

function minutesOfDay(iso: string) {
  const date = new Date(iso);
  return date.getUTCHours() * 60 + date.getUTCMinutes();
}

function parseHHMM(value?: string) {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return null;
  const [h, m] = value.split(':').map(Number);
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}

export function buildAttendanceDays(employees: AnalyticsEmployee[], events: AttendanceEvent[]) {
  const employeeMap = new Map(employees.map(employee => [employee.id, employee]));
  const grouped = new Map<string, AttendanceEvent[]>();

  for (const event of events) {
    if (!employeeMap.has(event.userId) || Number.isNaN(Date.parse(event.timestamp))) continue;
    const key = `${event.userId}:${dayKey(event.timestamp)}`;
    const group = grouped.get(key) || [];
    group.push(event);
    grouped.set(key, group);
  }

  const days: AttendanceDay[] = [];
  for (const [key, group] of grouped.entries()) {
    group.sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
    const [employeeId, date] = key.split(':');
    const employee = employeeMap.get(employeeId)!;
    const explicitIns = group.filter(item => item.type === 'IN');
    const explicitOuts = group.filter(item => item.type === 'OUT');
    const first = (explicitIns[0] || group[0])?.timestamp;
    const last = (explicitOuts[explicitOuts.length - 1] || (group.length > 1 ? group[group.length - 1] : undefined))?.timestamp;
    const scheduleMinutes = parseHHMM(employee.scheduleStart);
    const lateMinutes = first && scheduleMinutes !== null
      ? Math.max(0, minutesOfDay(first) - scheduleMinutes)
      : undefined;

    days.push({ employeeId, date, firstIn: first, lastOut: last, lateMinutes, incomplete: !first || !last });
  }
  return days;
}

export function summarizeWorkforce(employees: AnalyticsEmployee[], events: AttendanceEvent[]) {
  const days = buildAttendanceDays(employees, events);
  const late = days.filter(day => typeof day.lateMinutes === 'number' && day.lateMinutes > 0);
  const incomplete = days.filter(day => day.incomplete);
  const configuredMonthlyCost = employees.reduce((sum, employee) => {
    const value = Number(employee.monthlyCost ?? employee.baseSalary ?? 0);
    return sum + (Number.isFinite(value) && value > 0 ? value : 0);
  }, 0);
  const byDepartment = employees.reduce<Record<string, { employees: number; configuredMonthlyCost: number }>>((acc, employee) => {
    const key = employee.department || 'Sin departamento';
    const current = acc[key] || { employees: 0, configuredMonthlyCost: 0 };
    const value = Number(employee.monthlyCost ?? employee.baseSalary ?? 0);
    current.employees += 1;
    current.configuredMonthlyCost += Number.isFinite(value) && value > 0 ? value : 0;
    acc[key] = current;
    return acc;
  }, {});

  return {
    employees: employees.length,
    attendanceDays: days.length,
    lateArrivals: late.length,
    totalLateMinutes: late.reduce((sum, day) => sum + (day.lateMinutes || 0), 0),
    incompletePunchDays: incomplete.length,
    configuredMonthlyCost,
    configuredAnnualCost: configuredMonthlyCost * 12,
    byDepartment,
    days,
    calculationNotes: [
      'Atrasos sólo se calculan cuando el empleado tiene scheduleStart explícito.',
      'Costo usa monthlyCost o baseSalary configurado; no aplica fórmulas legales ni descuentos implícitos.',
      'Ausencias requieren calendario/turno esperado y no se infieren a partir de falta de eventos.',
    ],
  };
}

export type DeterministicIntent =
  | 'employees'
  | 'late_arrivals'
  | 'incomplete_punches'
  | 'monthly_cost'
  | 'annual_cost'
  | 'department_cost';

export function resolveDeterministicIntent(prompt: string): DeterministicIntent | null {
  const text = prompt.toLowerCase();
  if (/emplead|employee|headcount/.test(text) && /cu[aá]nt|total|how many|count/.test(text)) return 'employees';
  if (/atras|late|tard/.test(text)) return 'late_arrivals';
  if (/incomplet|missing checkout|missing check|marcaci[oó]n falt/.test(text)) return 'incomplete_punches';
  if (/departamento|department/.test(text) && /costo|cost|n[oó]mina|payroll/.test(text)) return 'department_cost';
  if (/anual|annual/.test(text) && /costo|cost|n[oó]mina|payroll/.test(text)) return 'annual_cost';
  if (/mensual|monthly|mes/.test(text) && /costo|cost|n[oó]mina|payroll/.test(text)) return 'monthly_cost';
  return null;
}

export function answerDeterministicIntent(intent: DeterministicIntent, summary: ReturnType<typeof summarizeWorkforce>) {
  switch (intent) {
    case 'employees':
      return { intent, value: summary.employees, unit: 'employees' };
    case 'late_arrivals':
      return { intent, value: summary.lateArrivals, totalLateMinutes: summary.totalLateMinutes, unit: 'events' };
    case 'incomplete_punches':
      return { intent, value: summary.incompletePunchDays, unit: 'days' };
    case 'monthly_cost':
      return { intent, value: summary.configuredMonthlyCost, unit: 'currency_configured', caveat: summary.calculationNotes[1] };
    case 'annual_cost':
      return { intent, value: summary.configuredAnnualCost, unit: 'currency_configured', caveat: summary.calculationNotes[1] };
    case 'department_cost':
      return { intent, value: summary.byDepartment, unit: 'currency_configured', caveat: summary.calculationNotes[1] };
  }
}
