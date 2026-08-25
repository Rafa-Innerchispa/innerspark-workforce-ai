export type AdjustmentKind = 'earning' | 'deduction';
export type AdjustmentStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export function assertAdjustment(input: { label?: string; amount?: number; kind?: string; period?: string }) {
  if (!input.label?.trim()) throw new Error('adjustment_label_required');
  if (!Number.isFinite(input.amount) || Number(input.amount) <= 0) throw new Error('adjustment_amount_invalid');
  if (input.kind !== 'earning' && input.kind !== 'deduction') throw new Error('adjustment_kind_invalid');
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(input.period || ''))) throw new Error('adjustment_period_invalid');
  return true;
}
