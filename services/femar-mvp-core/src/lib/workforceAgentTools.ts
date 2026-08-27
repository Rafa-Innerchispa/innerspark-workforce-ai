import { db } from './firebase';
import { generateDeterministicPayroll } from './reportUtils';

function startOfGuayaquilDayIso(now: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guayaquil',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  return `${year}-${month}-${day}T00:00:00-05:00`;
}

function startOfGuayaquilMonthIso(now: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guayaquil',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  return `${year}-${month}-01T00:00:00-05:00`;
}

export function configuredGeminiModel() {
  const model = process.env.WORKFORCE_GEMINI_MODEL?.trim() || process.env.GEMINI_MODEL?.trim();
  if (!model) {
    throw new Error('GEMINI_MODEL_NOT_CONFIGURED');
  }
  return model;
}

export async function getEmployeesSummary(companyId: string) {
  const snapshot = await db.collection('employees').where('companyId', '==', companyId).get();
  return {
    total_employees: snapshot.size,
    employees: snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: data.id || doc.id,
        name: data.name,
        role: data.role || data.position || null,
        department: data.department || null,
        status: data.status || null,
      };
    }),
  };
}

export async function calculatePayrollSummary(companyId: string, now = new Date()) {
  const empSnapshot = await db.collection('employees').where('companyId', '==', companyId).get();
  const employees = empSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  const employeeIds = new Set(employees.map((employee: any) => employee.id));

  const logsSnapshot = await db.collection('realtime_logs')
    .where('timestamp', '>=', startOfGuayaquilMonthIso(now))
    .get();
  const companyLogs = logsSnapshot.docs
    .map((doc) => doc.data())
    .filter((log) => employeeIds.has(log.user_id));

  const payroll = generateDeterministicPayroll(employees, companyLogs)
    .filter((row: any) => employeeIds.has(row.id));

  return {
    period_start: startOfGuayaquilMonthIso(now),
    total_employees_processed: payroll.length,
    total_base_salaries: payroll.reduce((sum: number, item: any) => sum + item.base, 0),
    total_iess_deductions: payroll.reduce((sum: number, item: any) => sum + item.iess, 0),
    total_fines: payroll.reduce((sum: number, item: any) => sum + item.penalty, 0),
    total_net_transfer: payroll.reduce((sum: number, item: any) => sum + item.net, 0),
  };
}

export async function getAnomaliesSummary(companyId: string, now = new Date()) {
  const employeesSnapshot = await db.collection('employees').where('companyId', '==', companyId).get();
  const employees = employeesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as any));
  const employeeIds = new Set(employees.map((employee) => employee.id));
  const employeeNames = new Map(employees.map((employee) => [employee.id, employee.name || employee.id]));
  const dayStart = startOfGuayaquilDayIso(now);

  const [noveltiesSnapshot, logsSnapshot] = await Promise.all([
    db.collection('novelties').where('timestamp', '>=', dayStart).get(),
    db.collection('realtime_logs').where('timestamp', '>=', dayStart).get(),
  ]);

  const novelties = noveltiesSnapshot.docs
    .map((doc) => doc.data())
    .filter((item) => employeeIds.has(item.user_id));

  const companyLogs = logsSnapshot.docs
    .map((doc) => doc.data())
    .filter((log) => employeeIds.has(log.user_id));

  const punchCounts = new Map<string, number>();
  companyLogs.forEach((log) => {
    punchCounts.set(log.user_id, (punchCounts.get(log.user_id) || 0) + 1);
  });

  const lateArrivals = novelties
    .filter((item) => item.type === 'LATE_ARRIVAL')
    .map((item) => ({
      employee_id: item.user_id,
      employee_name: employeeNames.get(item.user_id),
      minutes: item.minutes || 0,
      timestamp: item.timestamp,
    }));

  const earlyDepartures = novelties
    .filter((item) => item.type === 'EARLY_DEPARTURE')
    .map((item) => ({
      employee_id: item.user_id,
      employee_name: employeeNames.get(item.user_id),
      minutes: item.minutes || 0,
      timestamp: item.timestamp,
    }));

  const overtime = novelties
    .filter((item) => item.type === 'OVERTIME')
    .map((item) => ({
      employee_id: item.user_id,
      employee_name: employeeNames.get(item.user_id),
      minutes: item.minutes || 0,
      timestamp: item.timestamp,
    }));

  const missingCheckouts = employees
    .filter((employee) => punchCounts.get(employee.id) === 1)
    .map((employee) => ({
      employee_id: employee.id,
      employee_name: employee.name || employee.id,
      punches_today: 1,
    }));

  return {
    date_start: dayStart,
    late_arrivals: lateArrivals,
    early_departures: earlyDepartures,
    overtime,
    missing_checkouts: missingCheckouts,
    employees_without_schedule: novelties
      .filter((item) => item.schedule_status === 'not_configured')
      .map((item) => item.user_id)
      .filter((value, index, items) => items.indexOf(value) === index),
  };
}
