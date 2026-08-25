export const LEAVE_TYPES = [
  'VACATION',
  'MEDICAL',
  'PERSONAL',
  'BEREAVEMENT',
  'MATERNITY',
  'PATERNITY',
  'STUDY',
  'CALAMITY',
  'PAID_OTHER',
  'UNPAID',
  'OTHER',
] as const;

export type LeaveType = typeof LEAVE_TYPES[number];
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type PayTreatment = 'paid' | 'unpaid' | 'policy_defined';

export function isLeaveType(value: string): value is LeaveType {
  return (LEAVE_TYPES as readonly string[]).includes(value);
}

export function assertLeaveRange(startDate: string, endDate: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) throw new Error('leave_date_invalid');
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) throw new Error('leave_range_invalid');
  const days = Math.floor((end - start) / 86400000) + 1;
  if (days > 366) throw new Error('leave_range_too_large');
  return days;
}

export function defaultPayTreatment(type: LeaveType): PayTreatment {
  if (type === 'UNPAID') return 'unpaid';
  return 'policy_defined';
}
