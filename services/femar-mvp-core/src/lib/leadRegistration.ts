import { buildFullName } from '@/lib/ecuadorId';
import {
  userDocumentId,
  validateIdentityDocument,
  type IdType,
} from '@/lib/identityDocument';
import {
  buildCompanyRequest,
  pendingCompanyId,
  type CompanyRequestType,
} from '@/lib/registrationHelpers';
import { hashPassword, validatePasswordStrength } from '@/lib/passwordHash';
import {
  validateBirthDate,
  validateCompanyName,
  validateCorporateEmail,
  validateEmail,
  validatePersonName,
  validatePhone,
  validateAddress,
} from '@/lib/leadFormValidation';

export type LeadRegistrationPayload = {
  /** @deprecated use idNumber — kept for backward compat in clients */
  cedula?: string;
  idNumber?: string;
  documentCountry: string;
  idType: IdType;
  firstName1: string;
  firstName2?: string;
  lastName1: string;
  lastName2?: string;
  birthDate: string;
  email?: string;
  /** Google-verified email (read-only in Google onboarding) */
  googleEmail?: string;
  /** Optional corporate email, distinct from Google login email */
  corporateEmail?: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  password: string;
  passwordConfirm?: string;
  companyRequestType: CompanyRequestType;
  companyName?: string;
  newCompanyName?: string;
};

export function resolveIdNumber(payload: LeadRegistrationPayload): string {
  return String(payload.idNumber || payload.cedula || '').trim();
}

export function resolvePrimaryEmail(payload: LeadRegistrationPayload): string {
  const google = String(payload.googleEmail || '').trim().toLowerCase();
  const email = String(payload.email || '').trim().toLowerCase();
  const corporate = String(payload.corporateEmail || '').trim().toLowerCase();
  return google || email || corporate;
}

export function validateLeadRegistration(payload: LeadRegistrationPayload): string | null {
  const nameChecks = [
    validatePersonName(payload.firstName1 || '', 'Primer nombre'),
    validatePersonName(payload.lastName1 || '', 'Primer apellido'),
    validatePersonName(payload.lastName2 || '', 'Segundo apellido'),
    validatePersonName(payload.firstName2 || '', 'Segundo nombre', false),
  ];
  for (const err of nameChecks) {
    if (err) return err;
  }

  const documentCountry = payload.documentCountry || payload.country || 'Ecuador';
  const idType = payload.idType || 'cedula';
  const idNumber = resolveIdNumber(payload);

  const idCheck = validateIdentityDocument(documentCountry, idType, idNumber);
  if (!idCheck.ok) return idCheck.message;

  const birthErr = validateBirthDate(payload.birthDate);
  if (birthErr) return birthErr;

  const phoneErr = validatePhone(payload.phone || '');
  if (phoneErr) return phoneErr;

  const addressErr = validateAddress(payload.address || '', 'Dirección');
  if (addressErr) return addressErr;
  const cityErr = validateAddress(payload.city || '', 'Ciudad');
  if (cityErr) return cityErr;
  if (!payload.country?.trim()) return 'País de residencia es obligatorio';

  const primaryEmail = resolvePrimaryEmail(payload);
  if (!primaryEmail) {
    const emailErr = validateEmail(payload.email || '', true);
    if (emailErr) return emailErr;
  } else if (payload.email && !payload.googleEmail) {
    const emailErr = validateEmail(payload.email, true);
    if (emailErr) return emailErr;
  }

  const corporateErr = validateCorporateEmail(payload.corporateEmail || '');
  if (corporateErr) return corporateErr;

  const pwdError = validatePasswordStrength(payload.password);
  if (pwdError) return pwdError;
  if (payload.passwordConfirm && payload.password !== payload.passwordConfirm) {
    return 'Las contraseñas no coinciden';
  }

  const requestType = payload.companyRequestType || 'join_existing';
  const displayName =
    requestType === 'new_tenant'
      ? String(payload.newCompanyName || payload.companyName || '').trim()
      : String(payload.companyName || '').trim();
  const companyErr = validateCompanyName(displayName);
  if (companyErr) return companyErr;

  return null;
}

export function leadUserDocument(
  payload: LeadRegistrationPayload,
  extras: Record<string, unknown> = {}
) {
  const requestType = payload.companyRequestType || 'join_existing';
  const displayName =
    requestType === 'new_tenant'
      ? String(payload.newCompanyName || payload.companyName || '').trim()
      : String(payload.companyName || '').trim();
  const companyRequest = buildCompanyRequest(requestType, displayName);
  const companyId = pendingCompanyId(companyRequest);
  const name = buildFullName({
    firstName1: payload.firstName1,
    firstName2: payload.firstName2,
    lastName1: payload.lastName1,
    lastName2: payload.lastName2,
  });

  const documentCountry = payload.documentCountry || payload.country || 'Ecuador';
  const idType = payload.idType || 'cedula';
  const idNumber = resolveIdNumber(payload);
  const docId = userDocumentId(documentCountry, idType, idNumber);

  const googleEmail = payload.googleEmail
    ? String(payload.googleEmail).toLowerCase().trim()
    : '';
  const corporateEmail = payload.corporateEmail
    ? String(payload.corporateEmail).toLowerCase().trim()
    : '';
  const loginEmail = resolvePrimaryEmail(payload);

  return {
    id: docId,
    cedula: idNumber,
    idNumber,
    idType,
    documentCountry,
    name,
    firstName1: payload.firstName1.trim(),
    firstName2: payload.firstName2?.trim() || '',
    lastName1: payload.lastName1.trim(),
    lastName2: payload.lastName2?.trim() || '',
    birthDate: payload.birthDate,
    email: loginEmail,
    googleEmail: googleEmail || undefined,
    corporateEmail: corporateEmail || undefined,
    phone: payload.phone.trim(),
    address: payload.address.trim(),
    city: payload.city.trim(),
    country: payload.country.trim(),
    companyId,
    companyRequest,
    role: 'employee',
    status: 'PENDING',
    password: hashPassword(payload.password),
    leadCapturedAt: new Date().toISOString(),
    ...extras,
  };
}
