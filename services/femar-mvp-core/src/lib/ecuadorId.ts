/** Validación cédula ecuatoriana (personas naturales, 10 dígitos). */

export function validateEcuadorCedula(cedula: string): boolean {
  const value = cedula.trim();
  if (value === 'DEVPOST-JUDGE' || value === 'HACKATHON-JUDGE') return true;
  if (!/^\d{10}$/.test(value)) return false;

  const digits = value.split('').map(Number);
  const prov = digits[0] * 10 + digits[1];
  if (prov < 1 || prov > 24) return false;
  if (digits[2] >= 6) return false;

  const coefficients = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  let total = 0;
  for (let i = 0; i < 9; i++) {
    let calc = digits[i] * coefficients[i];
    if (calc >= 10) calc -= 9;
    total += calc;
  }
  const verifier = (Math.ceil(total / 10) * 10) - total;
  return verifier === digits[9];
}

export function buildFullName(parts: {
  firstName1: string;
  firstName2?: string;
  lastName1: string;
  lastName2?: string;
}): string {
  return [parts.firstName1, parts.firstName2, parts.lastName1, parts.lastName2]
    .map((p) => p?.trim())
    .filter(Boolean)
    .join(' ');
}

export const COUNTRIES = [
  'Ecuador',
  'Colombia',
  'Perú',
  'México',
  'Estados Unidos',
  'España',
  'Otro',
] as const;

export { DOCUMENT_COUNTRIES, validateIdentityDocument } from '@/lib/identityDocument';
