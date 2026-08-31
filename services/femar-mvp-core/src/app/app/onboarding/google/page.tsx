'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, UserCircle2 } from 'lucide-react';
import LangToggle from '@/components/LangToggle';
import { useInnerOSLang } from '@/contexts/InnerOSLangContext';
import {
  emptyLeadForm,
  LeadRegistrationFields,
  splitGoogleName,
  validateLeadForm,
  type LeadFormState,
} from '@/components/LeadRegistrationForm';
import { validateIdentityDocument } from '@/lib/identityDocument';

type Profile = { email: string; name: string; picture?: string };

export default function GoogleOnboardingPage() {
  const router = useRouter();
  const { lang, copy } = useInnerOSLang();
  const t = copy.onboarding;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [form, setForm] = useState<LeadFormState>(emptyLeadForm());
  const [fieldErrors, setFieldErrors] = useState<ReturnType<typeof validateLeadForm>>({});

  useEffect(() => {
    fetch('/api/auth/google/onboarding')
      .then(async (res) => {
        if (!res.ok) throw new Error('expired');
        const data = await res.json();
        setProfile(data.profile);
        const split = splitGoogleName(data.profile.name || '');
        setForm((prev) => ({
          ...prev,
          ...split,
          email: data.profile.email || prev.email,
          googleEmail: data.profile.email || prev.googleEmail,
        }));
      })
      .catch(() => router.replace('/app/login?error=google_onboarding_expired'))
      .finally(() => setLoadingProfile(false));
  }, [router]);

  const handleFieldBlur = (field: keyof LeadFormState) => {
    const allErrors = validateLeadForm(form, lang, true);
    setFieldErrors((prev) => ({ ...prev, [field]: allErrors[field] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');

    const formErrors = validateLeadForm(form, lang, true);
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
      const res = await fetch('/api/auth/google/onboarding', {
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

  if (loadingProfile) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-zinc-950 text-zinc-400">
        {copy.common.loading}
      </div>
    );
  }

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center bg-zinc-950 p-4 py-10 text-white">
      <LangToggle className="absolute right-4 top-4" />

      <div className="glass-card w-full max-w-2xl rounded-3xl border border-zinc-800 p-8">
        <div className="mb-6 flex items-center gap-4">
          {profile?.picture ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.picture} alt="" className="h-14 w-14 rounded-full border border-zinc-700" />
          ) : (
            <UserCircle2 className="h-14 w-14 text-blue-400" />
          )}
          <div>
            <h1 className="text-2xl font-bold">{t.title}</h1>
            <p className="text-sm text-zinc-400">{profile?.email}</p>
          </div>
        </div>
        <p className="mb-6 text-sm text-zinc-400">{t.subtitle}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <LeadRegistrationFields
            lang={lang}
            form={form}
            setForm={setForm}
            emailReadOnly
            errors={fieldErrors}
            onFieldBlur={handleFieldBlur}
          />

          {status === 'error' && (
            <div className="flex gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          <p className="text-xs text-zinc-500">{t.note}</p>

          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full rounded-xl bg-blue-600 py-3 font-medium hover:bg-blue-500 disabled:opacity-50"
          >
            {status === 'loading' ? t.loading : t.submit}
          </button>
        </form>
      </div>
    </div>
  );
}
