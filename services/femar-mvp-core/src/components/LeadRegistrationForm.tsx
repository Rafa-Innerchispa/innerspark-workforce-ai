'use client';

import React, { useMemo, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import {
  defaultIdTypeForCountry,
  DOCUMENT_COUNTRIES,
  idNumberLabel,
  idNumberPlaceholder,
  idTypesForCountry,
  sanitizeIdInput,
  type IdType,
} from '@/lib/identityDocument';
import {
  sanitizePhoneInput,
  validateAddress,
  validateBirthDate,
  validateCompanyName,
  validateCorporateEmail,
  validateEmail,
  validatePersonName,
  validatePhone,
} from '@/lib/leadFormValidation';
import { innerosCopy, type InnerOSLang } from '@/lib/innerosCopy';

export type LeadFormState = {
  documentCountry: string;
  idType: IdType;
  idNumber: string;
  /** @deprecated alias — synced with idNumber */
  cedula: string;
  firstName1: string;
  firstName2: string;
  lastName1: string;
  lastName2: string;
  birthDate: string;
  email: string;
  /** Google-verified email (read-only in Google onboarding) */
  googleEmail?: string;
  /** Optional corporate email, distinct from Google login email */
  corporateEmail?: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  password: string;
  passwordConfirm: string;
  companyRequestType: 'join_existing' | 'new_tenant';
  companyName: string;
  newCompanyName: string;
};

type FieldErrors = Partial<Record<keyof LeadFormState | 'passwordMatch', string>>;

type Props = {
  lang: InnerOSLang;
  form: LeadFormState;
  setForm: React.Dispatch<React.SetStateAction<LeadFormState>>;
  emailReadOnly?: boolean;
  errors?: FieldErrors;
  onFieldBlur?: (field: keyof LeadFormState) => void;
};

export function validateLeadForm(form: LeadFormState, lang: InnerOSLang, emailReadOnly = false): FieldErrors {
  const errors: FieldErrors = {};
  const labels = innerosCopy[lang].validation.labels;
  const validation = innerosCopy[lang].validation;

  const firstName1Err = validatePersonName(form.firstName1, labels.firstName1, true, lang);
  if (firstName1Err) errors.firstName1 = firstName1Err;

  const firstName2Err = validatePersonName(form.firstName2, labels.firstName2, false, lang);
  if (firstName2Err) errors.firstName2 = firstName2Err;

  const lastName1Err = validatePersonName(form.lastName1, labels.lastName1, true, lang);
  if (lastName1Err) errors.lastName1 = lastName1Err;

  const lastName2Err = validatePersonName(form.lastName2, labels.lastName2, true, lang);
  if (lastName2Err) errors.lastName2 = lastName2Err;

  const birthErr = validateBirthDate(form.birthDate, lang);
  if (birthErr) errors.birthDate = birthErr;

  if (!emailReadOnly) {
    const emailErr = validateEmail(form.email, true, lang);
    if (emailErr) errors.email = emailErr;
  }

  const corporateErr = validateCorporateEmail(form.corporateEmail || '', lang);
  if (corporateErr) errors.corporateEmail = corporateErr;

  const phoneErr = validatePhone(form.phone, lang);
  if (phoneErr) errors.phone = phoneErr;

  const addressErr = validateAddress(form.address, labels.address, lang);
  if (addressErr) errors.address = addressErr;

  const cityErr = validateAddress(form.city, labels.city, lang);
  if (cityErr) errors.city = cityErr;

  if (!form.password) errors.password = validation.passwordRequired;
  if (!form.passwordConfirm) errors.passwordConfirm = validation.passwordConfirmRequired;
  if (form.password && form.passwordConfirm && form.password !== form.passwordConfirm) {
    errors.passwordMatch = validation.passwordMismatch;
  }

  const companyName =
    form.companyRequestType === 'new_tenant' ? form.newCompanyName : form.companyName;
  const companyErr = validateCompanyName(companyName, lang);
  if (companyErr) {
    if (form.companyRequestType === 'new_tenant') errors.newCompanyName = companyErr;
    else errors.companyName = companyErr;
  }

  return errors;
}

export function LeadRegistrationFields({ lang, form, setForm, emailReadOnly, errors = {}, onFieldBlur }: Props) {
  const t = innerosCopy[lang].registrationForm;
  const common = innerosCopy[lang].common;

  const idTypeOptions = useMemo(() => idTypesForCountry(form.documentCountry), [form.documentCountry]);

  const onDocumentCountryChange = (documentCountry: string) => {
    const idType = defaultIdTypeForCountry(documentCountry);
    setForm((prev) => ({
      ...prev,
      documentCountry,
      idType,
      idNumber: '',
      cedula: '',
      country: prev.country || documentCountry,
    }));
  };

  const onIdNumberChange = (raw: string) => {
    const idNumber = sanitizeIdInput(form.documentCountry, form.idType, raw);
    setForm((prev) => ({ ...prev, idNumber, cedula: idNumber }));
  };

  const onPhoneChange = (raw: string) => {
    setForm((prev) => ({ ...prev, phone: sanitizePhoneInput(raw) }));
  };

  const googleEmailValue = form.googleEmail || form.email;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-zinc-300 mb-1">{t.documentCountry}</label>
        <select
          value={form.documentCountry}
          onChange={(e) => onDocumentCountryChange(e.target.value)}
          className="w-full bg-zinc-900/50 border border-zinc-700 rounded-xl px-4 py-2.5"
          required
        >
          {DOCUMENT_COUNTRIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-zinc-300 mb-1">{t.idType}</label>
          <select
            value={form.idType}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                idType: e.target.value as IdType,
                idNumber: '',
                cedula: '',
              }))
            }
            className="w-full bg-zinc-900/50 border border-zinc-700 rounded-xl px-4 py-2.5"
            required
          >
            {idTypeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {lang === 'es' ? opt.labelEs : opt.labelEn}
              </option>
            ))}
          </select>
        </div>
        <Field
          label={idNumberLabel(form.documentCountry, form.idType, lang)}
          value={form.idNumber}
          onChange={onIdNumberChange}
          placeholder={idNumberPlaceholder(form.documentCountry, form.idType, lang)}
          required
          inputMode={form.documentCountry === 'Ecuador' && form.idType === 'cedula' ? 'numeric' : 'text'}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field
          label={t.firstName1}
          value={form.firstName1}
          onChange={(v) => setForm({ ...form, firstName1: v })}
          onBlur={() => onFieldBlur?.('firstName1')}
          error={errors.firstName1}
          required
        />
        <Field
          label={t.firstName2}
          value={form.firstName2}
          onChange={(v) => setForm({ ...form, firstName2: v })}
          onBlur={() => onFieldBlur?.('firstName2')}
          error={errors.firstName2}
        />
        <Field
          label={t.lastName1}
          value={form.lastName1}
          onChange={(v) => setForm({ ...form, lastName1: v })}
          onBlur={() => onFieldBlur?.('lastName1')}
          error={errors.lastName1}
          required
        />
        <Field
          label={t.lastName2}
          value={form.lastName2}
          onChange={(v) => setForm({ ...form, lastName2: v })}
          onBlur={() => onFieldBlur?.('lastName2')}
          error={errors.lastName2}
          required
        />
      </div>

      <Field
        label={t.birthDate}
        type="date"
        value={form.birthDate}
        onChange={(v) => setForm({ ...form, birthDate: v })}
        onBlur={() => onFieldBlur?.('birthDate')}
        error={errors.birthDate}
        required
      />

      {emailReadOnly ? (
        <>
          <Field
            label={t.googleEmail}
            value={googleEmailValue}
            onChange={() => {}}
            readOnly
            helperText={t.googleEmailHint}
          />
          <Field
            label={t.corporateEmail}
            type="email"
            value={form.corporateEmail || ''}
            onChange={(v) => setForm({ ...form, corporateEmail: v })}
            onBlur={() => onFieldBlur?.('corporateEmail')}
            error={errors.corporateEmail}
            helperText={t.corporateEmailHint}
            placeholder={common.corporateEmailPlaceholder}
          />
        </>
      ) : (
        <Field
          label={t.email}
          type="email"
          value={form.email}
          onChange={(v) => setForm({ ...form, email: v })}
          onBlur={() => onFieldBlur?.('email')}
          error={errors.email}
          required
        />
      )}

      <Field
        label={t.phone}
        value={form.phone}
        onChange={onPhoneChange}
        onBlur={() => onFieldBlur?.('phone')}
        error={errors.phone}
        inputMode="numeric"
        pattern="[0-9]*"
        required
      />
      <Field
        label={t.address}
        value={form.address}
        onChange={(v) => setForm({ ...form, address: v })}
        onBlur={() => onFieldBlur?.('address')}
        error={errors.address}
        required
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field
          label={t.city}
          value={form.city}
          onChange={(v) => setForm({ ...form, city: v })}
          onBlur={() => onFieldBlur?.('city')}
          error={errors.city}
          required
        />
        <div>
          <label className="block text-sm text-zinc-300 mb-1">{t.residenceCountry}</label>
          <select
            value={form.country}
            onChange={(e) => setForm({ ...form, country: e.target.value })}
            className="w-full bg-zinc-900/50 border border-zinc-700 rounded-xl px-4 py-2.5"
            required
          >
            {DOCUMENT_COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <PasswordField
        label={t.password}
        value={form.password}
        onChange={(v) => setForm({ ...form, password: v })}
        onBlur={() => onFieldBlur?.('password')}
        error={errors.password}
        showLabel={common.showPassword}
        hideLabel={common.hidePassword}
        required
      />
      <PasswordField
        label={t.passwordConfirm}
        value={form.passwordConfirm}
        onChange={(v) => setForm({ ...form, passwordConfirm: v })}
        onBlur={() => onFieldBlur?.('passwordConfirm')}
        error={errors.passwordConfirm || errors.passwordMatch}
        showLabel={common.showPassword}
        hideLabel={common.hidePassword}
        required
      />

      <div className="space-y-2 rounded-xl border border-zinc-800 p-4 text-sm">
        <label className="flex gap-2 cursor-pointer">
          <input type="radio" checked={form.companyRequestType === 'join_existing'} onChange={() => setForm({ ...form, companyRequestType: 'join_existing' })} />
          <span>{t.joinExisting}<span className="block text-xs text-zinc-500">{t.joinHint}</span></span>
        </label>
        <label className="flex gap-2 cursor-pointer">
          <input type="radio" checked={form.companyRequestType === 'new_tenant'} onChange={() => setForm({ ...form, companyRequestType: 'new_tenant' })} />
          <span>{t.newTenant}</span>
        </label>
      </div>

      {form.companyRequestType === 'new_tenant' ? (
        <Field
          label={t.companyName}
          value={form.newCompanyName}
          onChange={(v) => setForm({ ...form, newCompanyName: v })}
          onBlur={() => onFieldBlur?.('newCompanyName')}
          error={errors.newCompanyName}
          required
        />
      ) : (
        <Field
          label={t.companyName}
          value={form.companyName}
          onChange={(v) => setForm({ ...form, companyName: v })}
          onBlur={() => onFieldBlur?.('companyName')}
          error={errors.companyName}
          required
        />
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required,
  readOnly,
  inputMode,
  placeholder,
  pattern,
  error,
  helperText,
  onBlur,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  readOnly?: boolean;
  inputMode?: 'numeric' | 'text';
  placeholder?: string;
  pattern?: string;
  error?: string;
  helperText?: string;
  onBlur?: () => void;
}) {
  return (
    <div>
      <label className="block text-sm text-zinc-300 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        required={required}
        readOnly={readOnly}
        inputMode={inputMode}
        placeholder={placeholder}
        pattern={pattern}
        className={`w-full bg-zinc-900/50 border rounded-xl px-4 py-2.5 ${
          error ? 'border-red-500/60' : 'border-zinc-700'
        } ${readOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
      />
      {helperText && !error ? <p className="mt-1 text-xs text-zinc-500">{helperText}</p> : null}
      {error ? <p className="mt-1 text-xs text-red-400">{error}</p> : null}
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  required,
  error,
  onBlur,
  showLabel,
  hideLabel,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  error?: string;
  onBlur?: () => void;
  showLabel: string;
  hideLabel: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label className="block text-sm text-zinc-300 mb-1">{label}</label>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          required={required}
          autoComplete="new-password"
          className={`w-full bg-zinc-900/50 border rounded-xl px-4 py-2.5 pr-11 ${
            error ? 'border-red-500/60' : 'border-zinc-700'
          }`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
          aria-label={visible ? hideLabel : showLabel}
        >
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {error ? <p className="mt-1 text-xs text-red-400">{error}</p> : null}
    </div>
  );
}

export function emptyLeadForm(email = ''): LeadFormState {
  return {
    documentCountry: 'Ecuador',
    idType: 'cedula',
    idNumber: '',
    cedula: '',
    firstName1: '',
    firstName2: '',
    lastName1: '',
    lastName2: '',
    birthDate: '',
    email,
    googleEmail: '',
    corporateEmail: '',
    phone: '',
    address: '',
    city: '',
    country: 'Ecuador',
    password: '',
    passwordConfirm: '',
    companyRequestType: 'join_existing',
    companyName: '',
    newCompanyName: '',
  };
}

export function splitGoogleName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    firstName1: parts[0] || '',
    firstName2: parts.length > 3 ? parts[1] : '',
    lastName1: parts.length > 3 ? parts[2] : parts[1] || '',
    lastName2: parts.length > 3 ? parts[3] : parts[2] || '',
  };
}
