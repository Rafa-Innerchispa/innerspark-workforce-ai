import { assertAdjustment } from './adjustment';

describe('Payroll adjustments', () => {
  it('accepts valid earning adjustments', () => {
    expect(() => assertAdjustment({ label: 'Bono', amount: 50, kind: 'earning', period: '2026-08' })).not.toThrow();
  });

  it('rejects invalid amount, kind and period', () => {
    expect(() => assertAdjustment({ label: 'X', amount: 0, kind: 'earning', period: '2026-08' })).toThrow('adjustment_amount_invalid');
    expect(() => assertAdjustment({ label: 'X', amount: 5, kind: 'other', period: '2026-08' })).toThrow('adjustment_kind_invalid');
    expect(() => assertAdjustment({ label: 'X', amount: 5, kind: 'earning', period: '2026-13' })).toThrow('adjustment_period_invalid');
  });
});
