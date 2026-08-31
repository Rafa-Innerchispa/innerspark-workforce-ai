import {
  sanitizePhoneInput,
  validateBirthDate,
  validateCorporateEmail,
  validateEmail,
  validatePersonName,
  validatePhone,
} from '@/lib/leadFormValidation';

describe('leadFormValidation', () => {
  it('sanitizes phone to digits only', () => {
    expect(sanitizePhoneInput('abc+593 99 123 4567')).toBe('593991234567');
  });

  it('rejects invalid corporate email', () => {
    expect(validateCorporateEmail('not-an-email', 'es')).toMatch(/inválido/);
    expect(validateCorporateEmail('', 'es')).toBeNull();
  });

  it('validates person names', () => {
    expect(validatePersonName('José', 'Nombre', true, 'es')).toBeNull();
    expect(validatePersonName('123', 'Nombre', true, 'es')).toMatch(/letras/);
  });

  it('validates phone length', () => {
    expect(validatePhone('1234567', 'es')).toMatch(/8 dígitos/);
    expect(validatePhone('593991234567', 'es')).toBeNull();
  });

  it('validates birth date age', () => {
    expect(validateBirthDate('', 'es')).toMatch(/obligatoria/);
    const young = new Date();
    young.setFullYear(young.getFullYear() - 10);
    expect(validateBirthDate(young.toISOString().slice(0, 10), 'es')).toMatch(/16 años/);
  });

  it('validates email format', () => {
    expect(validateEmail('user@example.com', true, 'es')).toBeNull();
    expect(validateEmail('bad', true, 'es')).toMatch(/inválido/);
  });

  it('validates english messages when lang is en', () => {
    expect(validateEmail('bad', true, 'en')).toMatch(/Invalid email/);
    expect(validatePhone('1234567', 'en')).toMatch(/at least 8 digits/);
  });
});
