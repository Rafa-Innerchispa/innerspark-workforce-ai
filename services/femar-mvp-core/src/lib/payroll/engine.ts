export type PayrollRules = {
  version: number;
  overtimeHourlyMultiplier: number;
  lateMinuteDeductionRate: number;
  earlyDepartureMinuteDeductionRate: number;
  employeeContributionRate: number;
  employerContributionRate?: number;
  currency: string;
};

export type PayrollFacts = {
  employeeId: string;
  name: string;
  department: string;
  baseSalary: number;
  lateMinutes: number;
  overtimeMinutes: number;
  earlyDepartureMinutes: number;
  fixedAdjustments?: Array<{ id: string; label: string; amount: number; kind: 'earning' | 'deduction' }>;
};

export type PayrollLine = {
  code: string;
  label: string;
  kind: 'earning' | 'deduction' | 'employer_cost';
  amount: number;
  source: string;
};

export type PayrollResult = {
  employeeId: string;
  name: string;
  department: string;
  baseSalary: number;
  grossEarnings: number;
  deductions: number;
  netPay: number;
  employerCost: number;
  lines: PayrollLine[];
  rulesVersion: number;
  currency: string;
};

function money(value: number) {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

function clampRate(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, value);
}

export function validatePayrollRules(input: PayrollRules) {
  const fields = [
    input.overtimeHourlyMultiplier,
    input.lateMinuteDeductionRate,
    input.earlyDepartureMinuteDeductionRate,
    input.employeeContributionRate,
    input.employerContributionRate ?? 0,
  ];
  if (!Number.isInteger(input.version) || input.version < 1) throw new Error('rules_version_invalid');
  if (!input.currency?.trim()) throw new Error('currency_required');
  if (fields.some(value => !Number.isFinite(value) || value < 0)) throw new Error('rules_rate_invalid');
  return true;
}

export function calculatePayroll(facts: PayrollFacts, rules: PayrollRules): PayrollResult {
  validatePayrollRules(rules);

  const baseSalary = money(Math.max(0, facts.baseSalary || 0));
  const baseHourlyRate = baseSalary > 0 ? baseSalary / 240 : 0;
  const overtimeHours = Math.max(0, facts.overtimeMinutes || 0) / 60;
  const overtimeAmount = money(baseHourlyRate * overtimeHours * clampRate(rules.overtimeHourlyMultiplier));
  const lateDeduction = money(Math.max(0, facts.lateMinutes || 0) * clampRate(rules.lateMinuteDeductionRate));
  const earlyDeduction = money(Math.max(0, facts.earlyDepartureMinutes || 0) * clampRate(rules.earlyDepartureMinuteDeductionRate));

  const lines: PayrollLine[] = [
    { code: 'BASE', label: 'Sueldo base configurado', kind: 'earning', amount: baseSalary, source: 'employee.baseSalary' },
  ];
  if (overtimeAmount > 0) lines.push({ code: 'OVERTIME', label: 'Horas extra según regla configurada', kind: 'earning', amount: overtimeAmount, source: 'attendance.overtimeMinutes' });
  if (lateDeduction > 0) lines.push({ code: 'LATE', label: 'Ajuste por atraso según regla configurada', kind: 'deduction', amount: lateDeduction, source: 'attendance.lateMinutes' });
  if (earlyDeduction > 0) lines.push({ code: 'EARLY', label: 'Ajuste por salida temprana según regla configurada', kind: 'deduction', amount: earlyDeduction, source: 'attendance.earlyDepartureMinutes' });

  for (const adjustment of facts.fixedAdjustments || []) {
    const amount = money(Math.abs(adjustment.amount));
    if (!amount) continue;
    lines.push({ code: `ADJ:${adjustment.id}`, label: adjustment.label, kind: adjustment.kind, amount, source: 'manual_adjustment' });
  }

  const earningsBeforeContribution = money(lines.filter(line => line.kind === 'earning').reduce((sum, line) => sum + line.amount, 0));
  const employeeContribution = money(earningsBeforeContribution * clampRate(rules.employeeContributionRate));
  if (employeeContribution > 0) lines.push({ code: 'EMP_CONTRIB', label: 'Aporte empleado configurado', kind: 'deduction', amount: employeeContribution, source: `payroll_rules.v${rules.version}` });

  const employerContribution = money(earningsBeforeContribution * clampRate(rules.employerContributionRate ?? 0));
  if (employerContribution > 0) lines.push({ code: 'ER_CONTRIB', label: 'Aporte patronal configurado', kind: 'employer_cost', amount: employerContribution, source: `payroll_rules.v${rules.version}` });

  const grossEarnings = money(lines.filter(line => line.kind === 'earning').reduce((sum, line) => sum + line.amount, 0));
  const deductions = money(lines.filter(line => line.kind === 'deduction').reduce((sum, line) => sum + line.amount, 0));
  const netPay = money(Math.max(0, grossEarnings - deductions));
  const employerCost = money(grossEarnings + employerContribution);

  return {
    employeeId: facts.employeeId,
    name: facts.name,
    department: facts.department,
    baseSalary,
    grossEarnings,
    deductions,
    netPay,
    employerCost,
    lines,
    rulesVersion: rules.version,
    currency: rules.currency,
  };
}
