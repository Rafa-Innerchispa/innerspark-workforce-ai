'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Clock3, Mail } from 'lucide-react';
import LangToggle from '@/components/LangToggle';
import { useInnerOSLang } from '@/contexts/InnerOSLangContext';

export default function PendingApprovalPage() {
  const { copy } = useInnerOSLang();
  const t = copy.pendingApproval;
  const [justSubmitted, setJustSubmitted] = useState(false);

  useEffect(() => {
    setJustSubmitted(new URLSearchParams(window.location.search).get('submitted') === '1');
  }, []);

  const pageCopy = justSubmitted
    ? {
        title: t.submittedTitle,
        body: t.submittedBody,
        email: t.submittedEmail,
        wait: t.submittedWait,
      }
    : {
        title: t.reviewTitle,
        body: t.reviewBody,
        email: t.reviewEmail,
        wait: t.reviewWait,
      };

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center bg-zinc-950 p-6 text-white">
      <LangToggle className="absolute right-4 top-4" />

      <div className="glass-card max-w-lg rounded-3xl border border-zinc-800 p-10 text-center">
        <div
          className={`mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border ${
            justSubmitted
              ? 'border-green-500/30 bg-green-500/10'
              : 'border-amber-500/30 bg-amber-500/10'
          }`}
        >
          {justSubmitted ? (
            <CheckCircle2 className="h-8 w-8 text-green-400" />
          ) : (
            <Clock3 className="h-8 w-8 text-amber-400" />
          )}
        </div>
        <h1 className="mb-3 text-2xl font-bold">{pageCopy.title}</h1>
        <p className="mb-4 text-zinc-300">{pageCopy.body}</p>
        <p className="mb-4 flex items-start justify-center gap-2 text-left text-sm text-zinc-400">
          <Mail className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{pageCopy.email}</span>
        </p>
        <p className="mb-8 text-xs text-zinc-500">{pageCopy.wait}</p>
        <Link
          href="/app/login"
          className="inline-block rounded-xl border border-zinc-700 bg-zinc-800 px-6 py-3 text-sm hover:bg-zinc-700"
        >
          {t.backToLogin}
        </Link>
      </div>
    </div>
  );
}
