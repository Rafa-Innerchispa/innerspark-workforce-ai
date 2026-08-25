import { assertMakerChecker, assertValidPeriod, canClosePeriod, canPreparePeriod } from './period';

describe('Payroll period controls', () => {
  it('validates YYYY-MM periods', () => {
    expect(() => assertValidPeriod('2026-08')).not.toThrow();
    expect(() => assertValidPeriod('2026-13')).toThrow('period_invalid');
  });

  it('allows HR to prepare but not close', () => {
    expect(canPreparePeriod('hr')).toBe(true);
    expect(canClosePeriod('hr')).toBe(false);
  });

  it('enforces maker-checker for the same actor', () => {
    expect(() => assertMakerChecker('u1', 'u1', 'payroll_approver')).toThrow('maker_checker_required');
    expect(() => assertMakerChecker('u1', 'u2', 'payroll_approver')).not.toThrow();
  });

  it('allows master override only with a reason', () => {
    expect(() => assertMakerChecker('u1', 'u1', 'master_admin')).toThrow('maker_checker_required');
    expect(() => assertMakerChecker('u1', 'u1', 'master_admin', 'Emergency close')).not.toThrow();
  });
});
