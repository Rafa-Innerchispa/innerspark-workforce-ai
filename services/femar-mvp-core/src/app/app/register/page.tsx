'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, Building2, UserPlus } from 'lucide-react';
import LangToggle from '@/components/LangToggle';
import { useInnerOSLang } from '@/contexts/InnerOSLangContext';
import { INNEROS_BRAND } from '@/lib/innerosCopy';
import Image from 'next/image';
import {
  emptyLeadForm,
  LeadRegistrationFields,
  validateLeadForm,
  type LeadFormState,
} from '@/components/LeadRegistrationForm';
import { validateIdentityDocument } from '@/lib/identityDocument';

export default function InnerOSRegisterPage() {
  const router = useRouter();
  const { lang, copy } = useInnerOSLang();
  const t = copy.register;
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [form, setForm] = useState<LeadFormState>(emptyLeadForm());
  const [fieldErrors, setFieldErrors] = useState<ReturnType<typeof validateLeadForm>>({});

  const handleFieldBlur = (field: keyof LeadFormState) => {
    const allErrors = validateLeadForm(form, lang, false);
    setFieldErrors((prev) => ({ ...prev, [field]: allErrors[field] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');

    const formErrors = validateLeadForm(form, lang, false);
    setFieldErrors(formErrors);
    const firstError = Object.values(formErrors).find(Boolean);
    if (firstError) {
      setStatus('error');
      setMessage(firstError);
      return;
    }

    const idCheck = validateIdentityDocument(form.documentCountry, form.idType, form.idNumber, lang);
    if (!idCheck.ok) {
      setStatus('error');
      setMessage(idCheck.message);
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus('error');
        setMessage(data.message || copy.common.genericError);
        return;
      }
      router.push('/app/pending-approval?submitted=1');
    } catch {
      setStatus('error');
      setMessage(copy.common.connectionError);
    } finally {
      setStatus((s) => (s === 'loading' ? 'idle' : s));
    }
  };

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center bg-zinc-950 p-4 py-10 text-white">
      <LangToggle className="absolute right-4 top-4" />

      <div className="glass-card w-full max-w-2xl rounded-3xl border border-zinc-800 p-8">
        <div className="mb-6 flex items-center gap-3">
          <Image src={INNEROS_BRAND.logoPath} alt="" width={40} height={40} />
          <div>
            <h1 className="text-2xl font-bold">{t.title}</h1>
            <p className="text-sm text-zinc-400">{t.subtitle}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <LeadRegistrationFields
            lang={lang}
            form={form}
            setForm={setForm}
            errors={fieldErrors}
            onFieldBlur={handleFieldBlur}
          />

          <p className="flex gap-2 text-xs text-zinc-500">
            <Building2 className="h-4 w-4 shrink-0" />
            {t.note}
          </p>

          {status === 'error' && (
            <div className="flex gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={status === 'loading'}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-medium hover:bg-blue-500 disabled:opacity-50"
          >
            <UserPlus className="h-5 w-5" />
            {status === 'loading' ? t.loading : t.submit}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-500">
          {t.hasAccount}{' '}
          <Link href="/app/login" className="text-blue-400 hover:text-blue-300">
            {t.login}
          </Link>
        </p>
      </div>
    </div>
  );
}
