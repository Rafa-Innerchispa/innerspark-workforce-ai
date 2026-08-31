import { innerosCopy, type InnerOSLang } from '@/lib/innerosCopy';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_RE = /^[\p{L}\s'-]+$/u;

export function sanitizePhoneInput(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 15);
}

function validationCopy(lang: InnerOSLang) {
  return innerosCopy[lang].validation;
}

export function validatePersonName(
  value: string,
  label: string,
  required = true,
  lang: InnerOSLang = 'en',
): string | null {
  const copy = validationCopy(lang);
  const trimmed = value.trim();
  if (!trimmed) return required ? copy.fieldRequired(label) : null;
  if (trimmed.length < 2) return copy.fieldMinLength(label, 2);
  if (!NAME_RE.test(trimmed)) return copy.fieldLettersOnly(label);
  return null;
}

export function validateEmail(value: string, required = true, lang: InnerOSLang = 'en'): string | null {
  const copy = validationCopy(lang);
  const trimmed = value.trim();
  if (!trimmed) return required ? copy.emailRequired : null;
  if (!EMAIL_RE.test(trimmed)) return copy.emailInvalid;
  return null;
}

export function validateCorporateEmail(value: string, lang: InnerOSLang = 'en'): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return validateEmail(trimmed, true, lang);
}

export function validatePhone(value: string, lang: InnerOSLang = 'en'): string | null {
  const copy = validationCopy(lang);
  const digits = sanitizePhoneInput(value);
  if (!digits) return copy.phoneRequired;
  if (digits.length < 8) return copy.phoneMinDigits;
  if (digits.length > 15) return copy.phoneTooLong;
  return null;
}

export function validateBirthDate(value: string, lang: InnerOSLang = 'en'): string | null {
  const copy = validationCopy(lang);
  if (!value) return copy.birthDateRequired;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return copy.birthDateInvalid;
  const today = new Date();
  if (date > today) return copy.birthDateFuture;
  const ageMs = today.getTime() - date.getTime();
  const ageYears = ageMs / (365.25 * 24 * 60 * 60 * 1000);
  if (ageYears < 16) return copy.birthDateTooYoung;
  if (ageYears > 120) return copy.birthDateInvalid;
  return null;
}

export function validateAddress(value: string, label: string, lang: InnerOSLang = 'en'): string | null {
  const copy = validationCopy(lang);
  const trimmed = value.trim();
  if (!trimmed || trimmed.length < 3) return copy.addressRequired(label);
  return null;
}

export function validateCompanyName(value: string, lang: InnerOSLang = 'en'): string | null {
  const copy = validationCopy(lang);
  const trimmed = value.trim();
  if (!trimmed || trimmed.length < 2) return copy.companyNameRequired;
  return null;
}
