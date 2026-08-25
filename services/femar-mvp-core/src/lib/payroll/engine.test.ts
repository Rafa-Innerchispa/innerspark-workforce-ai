import { calculatePayroll, validatePayrollRules, type PayrollRules } from './engine';

const rules: PayrollRules = {
  version: 1,
  overtimeHourlyMultiplier: 1.5,
  lateMinuteDeductionRate: 0.1,
  earlyDepartureMinuteDeductionRate: 0.1,
  employeeContributionRate: 0.05,
  employerContributionRate: 0.08,
  currency: 'USD',
};

describe('Payroll engine', () => {
  it('calculates deterministic earnings, deductions and employer cost', () => {
    const result = calculatePayroll({
      employeeId: '0102030405',
      name: 'Empleado Uno',
      department: 'Operaciones',
      baseSalary: 1200,
      lateMinutes: 20,
      overtimeMinutes: 120,
      earlyDepartureMinutes: 10,
      fixedAdjustments: [{ id: 'bonus-1', label: 'Bono aprobado', amount: 50, kind: 'earning' }],
    }, rules);

    expect(result.grossEarnings).toBe(1265);
    expect(result.deductions).toBe(66.25);
    expect(result.netPay).toBe(1198.75);
    expect(result.employerCost).toBe(1366.2);
    expect(result.lines.some(line => line.code === 'OVERTIME')).toBe(true);
    expect(result.lines.some(line => line.code === 'ADJ:bonus-1')).toBe(true);
  });

  it('keeps output deterministic for identical inputs', () => {
    const facts = {
      employeeId: '2', name: 'Dos', department: 'RRHH', baseSalary: 800,
      lateMinutes: 0, overtimeMinutes: 60, earlyDepartureMinutes: 0,
    };
    expect(calculatePayroll(facts, rules)).toEqual(calculatePayroll(facts, rules));
  });

  it('rejects invalid rule versions and negative rates', () => {
    expect(() => validatePayrollRules({ ...rules, version: 0 })).toThrow('rules_version_invalid');
    expect(() => validatePayrollRules({ ...rules, lateMinuteDeductionRate: -1 })).toThrow('rules_rate_invalid');
  });
});
