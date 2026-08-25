import type { CanonicalRole } from '@/lib/auth/server';

export type PayrollPeriodStatus = 'draft' | 'prepared' | 'closed' | 'reopened';

export function assertValidPeriod(period: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) throw new Error('period_invalid');
}

export function canPreparePeriod(role: CanonicalRole) {
  return ['master_admin', 'tenant_admin', 'hr', 'payroll_approver'].includes(role);
}

export function canClosePeriod(role: CanonicalRole) {
  return ['master_admin', 'tenant_admin', 'payroll_approver'].includes(role);
}

export function canReopenPeriod(role: CanonicalRole) {
  return ['master_admin', 'tenant_admin', 'payroll_approver'].includes(role);
}

export function assertMakerChecker(preparedBy: string, closingUserId: string, role: CanonicalRole, overrideReason?: string) {
  if (preparedBy !== closingUserId) return;
  if (role === 'master_admin' && overrideReason?.trim()) return;
  throw new Error('maker_checker_required');
}
