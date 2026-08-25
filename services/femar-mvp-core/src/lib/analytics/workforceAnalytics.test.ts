import { answerDeterministicIntent, buildAttendanceDays, resolveDeterministicIntent, summarizeWorkforce } from './workforceAnalytics';

const employees = [
  { id: '1', name: 'Ana', department: 'Operaciones', baseSalary: 600, scheduleStart: '08:00' },
  { id: '2', name: 'Luis', department: 'Operaciones', monthlyCost: 900, scheduleStart: '09:00' },
  { id: '3', name: 'Marta', department: 'Administración', baseSalary: 1000 },
];

const events = [
  { userId: '1', timestamp: '2026-08-24T08:15:00.000Z', type: 'IN' },
  { userId: '1', timestamp: '2026-08-24T17:00:00.000Z', type: 'OUT' },
  { userId: '2', timestamp: '2026-08-24T08:55:00.000Z', type: 'IN' },
];

describe('shared Workforce analytics engine', () => {
  test('derives attendance only from explicit events and schedules', () => {
    const days = buildAttendanceDays(employees, events);
    const ana = days.find(day => day.employeeId === '1');
    const luis = days.find(day => day.employeeId === '2');
    expect(ana?.lateMinutes).toBe(15);
    expect(ana?.incomplete).toBe(false);
    expect(luis?.lateMinutes).toBe(0);
    expect(luis?.incomplete).toBe(true);
  });

  test('costs use configured values without hidden legal formulas', () => {
    const summary = summarizeWorkforce(employees, events);
    expect(summary.configuredMonthlyCost).toBe(2500);
    expect(summary.configuredAnnualCost).toBe(30000);
    expect(summary.byDepartment.Operaciones.configuredMonthlyCost).toBe(1500);
  });

  test('does not invent absences when expected schedule calendar is unavailable', () => {
    const summary = summarizeWorkforce(employees, events);
    expect(summary.calculationNotes.join(' ')).toMatch(/Ausencias requieren calendario/);
  });

  test('routes common ARIA questions deterministically', () => {
    expect(resolveDeterministicIntent('¿Cuántos empleados tengo?')).toBe('employees');
    expect(resolveDeterministicIntent('Muéstrame los atrasos')).toBe('late_arrivals');
    expect(resolveDeterministicIntent('Costo anual de nómina')).toBe('annual_cost');
    expect(resolveDeterministicIntent('Explícame cómo motivar al equipo')).toBeNull();
  });

  test('manual reporting and ARIA intent share exactly the same result object', () => {
    const summary = summarizeWorkforce(employees, events);
    const manual = answerDeterministicIntent('late_arrivals', summary);
    const aria = answerDeterministicIntent(resolveDeterministicIntent('¿Cuántos atrasos hubo?')!, summary);
    expect(aria).toEqual(manual);
  });
});
