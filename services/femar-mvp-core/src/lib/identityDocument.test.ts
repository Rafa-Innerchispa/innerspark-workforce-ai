import {
  defaultIdTypeForCountry,
  idTypesForCountry,
  userDocumentId,
  validateIdentityDocument,
} from '@/lib/identityDocument';

describe('identityDocument', () => {
  it('offers cédula first for Ecuador', () => {
    expect(defaultIdTypeForCountry('Ecuador')).toBe('cedula');
    expect(idTypesForCountry('Ecuador')[0].value).toBe('cedula');
  });

  it('validates Ecuador cédula via modulo 10', () => {
    expect(validateIdentityDocument('Ecuador', 'cedula', '0914832423').ok).toBe(true);
    expect(validateIdentityDocument('Ecuador', 'cedula', '123').ok).toBe(false);
  });

  it('validates passport internationally', () => {
    expect(validateIdentityDocument('Estados Unidos', 'passport', 'AB1234567').ok).toBe(true);
    expect(validateIdentityDocument('Otro', 'passport', 'X').ok).toBe(false);
  });

  it('validates Peru DNI', () => {
    expect(validateIdentityDocument('Perú', 'dni', '12345678').ok).toBe(true);
    expect(validateIdentityDocument('Perú', 'dni', '123').ok).toBe(false);
  });

  it('builds prefixed doc id for non-Ecuador cédula', () => {
    expect(userDocumentId('Estados Unidos', 'passport', 'AB1234567')).toBe('US-passport-AB1234567');
    expect(userDocumentId('Ecuador', 'cedula', '0914832423')).toBe('0914832423');
  });
});
