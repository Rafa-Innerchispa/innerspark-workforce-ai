import { validateEcuadorCedula, buildFullName } from '@/lib/ecuadorId';

describe('ecuadorId', () => {
  it('validates known Ecuador cedula pattern', () => {
    expect(validateEcuadorCedula('0914832423')).toBe(true);
    expect(validateEcuadorCedula('123')).toBe(false);
  });

  it('builds full name from four parts', () => {
    expect(
      buildFullName({
        firstName1: 'Rafael',
        firstName2: 'Andrés',
        lastName1: 'López',
        lastName2: 'Gye',
      })
    ).toBe('Rafael Andrés López Gye');
  });
});
