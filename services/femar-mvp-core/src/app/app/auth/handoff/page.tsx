'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useInnerOSLang } from '@/contexts/InnerOSLangContext';

export default function HandoffPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { copy } = useInnerOSLang();
  const [error, setError] = useState('');

  useEffect(() => {
    const token = params.get('token');
    const redirect = params.get('redirect') || '/';

    if (!token) {
      setError(copy.common.genericError);
      return;
    }

    const query = new URLSearchParams({ token, redirect });
    fetch(`/api/auth/handoff/consume?${query.toString()}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || copy.common.genericError);
          return;
        }
        router.replace(data.redirect || redirect);
        router.refresh();
      })
      .catch(() => setError(copy.common.connectionError));
  }, [params, router, copy.common.genericError, copy.common.connectionError]);

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-zinc-950 text-zinc-300">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        <p>{error || copy.common.loading}</p>
        {error ? (
          <a href="/app/login" className="mt-4 inline-block text-sm text-blue-400 hover:text-blue-300">
            {copy.pendingApproval.backToLogin}
          </a>
        ) : null}
      </div>
    </div>
  );
}
