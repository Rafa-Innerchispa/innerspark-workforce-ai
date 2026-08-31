import { hashPassword, validatePasswordStrength, verifyPassword } from '@/lib/passwordHash';

describe('passwordHash', () => {
  it('hashes and verifies scrypt passwords', () => {
    const hashed = hashPassword('demo12345');
    expect(hashed).toContain(':');
    expect(verifyPassword('demo12345', hashed)).toBe(true);
    expect(verifyPassword('wrong', hashed)).toBe(false);
  });

  it('validates minimum length', () => {
    expect(validatePasswordStrength('short')).toMatch(/8/);
    expect(validatePasswordStrength('longenough')).toBeNull();
  });
});
