import { validateEcuadorCedula } from '@/lib/ecuadorId';
import { innerosCopy, type InnerOSLang } from '@/lib/innerosCopy';

export const DOCUMENT_COUNTRIES = [
  'Ecuador',
  'Colombia',
  'Perú',
  'México',
  'Estados Unidos',
  'España',
  'Otro',
] as const;

export type DocumentCountry = (typeof DOCUMENT_COUNTRIES)[number];

export type IdType =
  | 'cedula'
  | 'passport'
  | 'national_id'
  | 'foreign_id'
  | 'tax_id'
  | 'dni'
  | 'curp'
  | 'nie'
  | 'driver_license'
  | 'other';

export type IdTypeOption = { value: IdType; labelEs: string; labelEn: string };

const GENERIC_TYPES: IdTypeOption[] = [
  { value: 'passport', labelEs: 'Pasaporte', labelEn: 'Passport' },
  { value: 'national_id', labelEs: 'Documento nacional', labelEn: 'National ID' },
  { value: 'foreign_id', labelEs: 'Documento extranjero', labelEn: 'Foreign ID' },
  { value: 'tax_id', labelEs: 'Identificación fiscal', labelEn: 'Tax ID' },
  { value: 'other', labelEs: 'Otro documento', labelEn: 'Other document' },
];

const ID_TYPES_BY_COUNTRY: Record<DocumentCountry, IdTypeOption[]> = {
  Ecuador: [
    { value: 'cedula', labelEs: 'Cédula ecuatoriana', labelEn: 'Ecuadorian ID card' },
    { value: 'passport', labelEs: 'Pasaporte', labelEn: 'Passport' },
    { value: 'foreign_id', labelEs: 'Cédula extranjera / otro', labelEn: 'Foreign ID / other' },
  ],
  Colombia: [
    { value: 'cedula', labelEs: 'Cédula de ciudadanía', labelEn: 'Citizenship ID' },
    { value: 'foreign_id', labelEs: 'Cédula de extranjería', labelEn: 'Foreigner ID' },
    { value: 'passport', labelEs: 'Pasaporte', labelEn: 'Passport' },
  ],
  'Perú': [
    { value: 'dni', labelEs: 'DNI', labelEn: 'DNI' },
    { value: 'passport', labelEs: 'Pasaporte', labelEn: 'Passport' },
    { value: 'foreign_id', labelEs: 'Carné de extranjería', labelEn: 'Foreign resident card' },
  ],
  'México': [
    { value: 'curp', labelEs: 'CURP', labelEn: 'CURP' },
    { value: 'passport', labelEs: 'Pasaporte', labelEn: 'Passport' },
    { value: 'national_id', labelEs: 'INE / identificación oficial', labelEn: 'INE / official ID' },
  ],
  'Estados Unidos': [
    { value: 'passport', labelEs: 'Pasaporte', labelEn: 'Passport' },
    { value: 'national_id', labelEs: 'State ID / identificación estatal', labelEn: 'State ID' },
    { value: 'driver_license', labelEs: 'Licencia de conducir', labelEn: "Driver's license" },
  ],
  España: [
    { value: 'dni', labelEs: 'DNI', labelEn: 'DNI' },
    { value: 'nie', labelEs: 'NIE', labelEn: 'NIE' },
    { value: 'passport', labelEs: 'Pasaporte', labelEn: 'Passport' },
  ],
  Otro: GENERIC_TYPES,
};

export function idTypesForCountry(country: string): IdTypeOption[] {
  const key = DOCUMENT_COUNTRIES.find((c) => c === country) || 'Otro';
  return ID_TYPES_BY_COUNTRY[key];
}

export function defaultIdTypeForCountry(country: string): IdType {
  return idTypesForCountry(country)[0]?.value || 'passport';
}

function normalizeId(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, '');
}

function isAlphanumericId(value: string, min: number, max: number): boolean {
  const v = normalizeId(value);
  if (v.length < min || v.length > max) return false;
  return /^[A-Z0-9-]+$/.test(v);
}

function validatePassport(value: string): boolean {
  return isAlphanumericId(value, 6, 20);
}

function validateGenericNationalId(value: string): boolean {
  return isAlphanumericId(value, 5, 20);
}

function validateColombiaCedula(value: string): boolean {
  return /^\d{6,10}$/.test(value.replace(/\D/g, ''));
}

function validatePeruDni(value: string): boolean {
  return /^\d{8}$/.test(value.replace(/\D/g, ''));
}

function validateMexicoCurp(value: string): boolean {
  const v = normalizeId(value);
  return /^[A-Z]{4}\d{6}[A-Z]{6}[A-Z0-9]{2}$/.test(v) || isAlphanumericId(v, 18, 18);
}

function validateSpainDni(value: string): boolean {
  const v = normalizeId(value);
  return /^\d{8}[A-Z]$/.test(v);
}

function validateSpainNie(value: string): boolean {
  const v = normalizeId(value);
  return /^[XYZ]\d{7}[A-Z]$/.test(v);
}

export function validateIdentityDocument(
  country: string,
  idType: IdType,
  idNumber: string,
  lang: InnerOSLang = 'en',
): { ok: true } | { ok: false; message: string } {
  const identity = innerosCopy[lang].validation.identity;
  const value = idNumber.trim();
  if (!value) {
    return {
      ok: false,
      message: lang === 'es' ? 'El número de documento es obligatorio' : 'Document number is required',
    };
  }

  if (country === 'Ecuador' && idType === 'cedula') {
    if (!validateEcuadorCedula(value)) {
      return { ok: false, message: identity.ecCedula };
    }
    return { ok: true };
  }

  if (country === 'Colombia' && idType === 'cedula') {
    if (!validateColombiaCedula(value)) {
      return { ok: false, message: identity.coCedula };
    }
    return { ok: true };
  }

  if (country === 'Perú' && idType === 'dni') {
    if (!validatePeruDni(value)) {
      return { ok: false, message: identity.peDni };
    }
    return { ok: true };
  }

  if (country === 'México' && idType === 'curp') {
    if (!validateMexicoCurp(value)) {
      return { ok: false, message: identity.mxCurp };
    }
    return { ok: true };
  }

  if (country === 'España' && idType === 'dni') {
    if (!validateSpainDni(value)) {
      return { ok: false, message: identity.esDni };
    }
    return { ok: true };
  }

  if (country === 'España' && idType === 'nie') {
    if (!validateSpainNie(value)) {
      return { ok: false, message: identity.esNie };
    }
    return { ok: true };
  }

  if (idType === 'passport') {
    if (!validatePassport(value)) {
      return { ok: false, message: identity.passport };
    }
    return { ok: true };
  }

  if (idType === 'driver_license') {
    if (!isAlphanumericId(value, 5, 20)) {
      return { ok: false, message: identity.driverLicense };
    }
    return { ok: true };
  }

  if (!validateGenericNationalId(value)) {
    return { ok: false, message: identity.generic };
  }
  return { ok: true };
}

export function idNumberLabel(country: string, idType: IdType, lang: 'es' | 'en'): string {
  const options = idTypesForCountry(country);
  const match = options.find((o) => o.value === idType);
  const typeLabel = lang === 'es' ? match?.labelEs : match?.labelEn;
  return lang === 'es' ? `${typeLabel || 'Documento'} *` : `${typeLabel || 'Document'} *`;
}

export function idNumberPlaceholder(country: string, idType: IdType, lang: 'es' | 'en'): string {
  if (country === 'Ecuador' && idType === 'cedula') {
    return lang === 'es' ? 'Ej. 0914832423' : 'E.g. 0914832423';
  }
  if (idType === 'passport') {
    return lang === 'es' ? 'Ej. AB1234567' : 'E.g. AB1234567';
  }
  return lang === 'es' ? 'Número del documento' : 'Document number';
}

export function sanitizeIdInput(country: string, idType: IdType, raw: string): string {
  if (country === 'Ecuador' && idType === 'cedula') {
    return raw.replace(/\D/g, '').slice(0, 10);
  }
  if ((country === 'Perú' && idType === 'dni') || (country === 'Colombia' && idType === 'cedula')) {
    return raw.replace(/\D/g, '').slice(0, 10);
  }
  return raw.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 20);
}

export function countryCode(country: string): string {
  const map: Record<string, string> = {
    Ecuador: 'EC',
    Colombia: 'CO',
    'Perú': 'PE',
    'México': 'MX',
    'Estados Unidos': 'US',
    España: 'ES',
    Otro: 'XX',
  };
  return map[country] || 'XX';
}

/** Firestore doc id — Ecuador cédula sin prefijo; internacional con prefijo país-tipo. */
export function userDocumentId(documentCountry: string, idType: IdType, idNumber: string): string {
  const normalized = sanitizeIdInput(documentCountry, idType, idNumber);
  if (documentCountry === 'Ecuador' && idType === 'cedula') {
    return normalized;
  }
  return `${countryCode(documentCountry)}-${idType}-${normalized}`.slice(0, 128);
}
