import { assertLeaveRange, defaultPayTreatment, isLeaveType } from './policy';

describe('Leave policy primitives', () => {
  it('validates supported leave types', () => {
    expect(isLeaveType('VACATION')).toBe(true);
    expect(isLeaveType('RANDOM')).toBe(false);
  });

  it('calculates inclusive leave days', () => {
    expect(assertLeaveRange('2026-08-10', '2026-08-12')).toBe(3);
  });

  it('rejects inverted ranges', () => {
    expect(() => assertLeaveRange('2026-08-12', '2026-08-10')).toThrow('leave_range_invalid');
  });

  it('does not assume paid treatment unless explicitly configured', () => {
    expect(defaultPayTreatment('VACATION')).toBe('policy_defined');
    expect(defaultPayTreatment('UNPAID')).toBe('unpaid');
  });
});
