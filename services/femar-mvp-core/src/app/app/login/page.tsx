'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle, KeyRound, LogIn } from 'lucide-react';
import AriaOrchestrator from '@/components/AriaOrchestrator';
import InnerOSMark from '@/components/InnerOSMark';
import LangToggle from '@/components/LangToggle';
import { useInnerOSLang } from '@/contexts/InnerOSLangContext';
import { INNEROS_BRAND } from '@/lib/innerosCopy';
import {
  JUDGE_CONSOLE_PATH,
  JUDGE_DEMO_PASSWORD,
  JUDGE_LOGIN_ACCOUNTS,
  JUDGE_PORTAL_URL,
  isJudgeDemoLoginId,
} from '@/lib/judgeCredentials';
import Image from 'next/image';

const HERO = '/inneros/login-hero.png';

export default function InnerOSLoginPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center bg-zinc-950">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        </div>
      }
    >
      <InnerOSLoginPageContent />
    </React.Suspense>
  );
}

function InnerOSLoginPageContent() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [redirectUri, setRedirectUri] = useState<string | null>(null);
  const { login, user, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const judgeMode = searchParams.get('judge') === '1';
  const { lang, copy } = useInnerOSLang();
  const loginCopy = copy.login;

  useEffect(() => {
    if (judgeMode) {
      setUsername('HACKATHON-JUDGE');
      setPassword(JUDGE_DEMO_PASSWORD);
    }
  }, [judgeMode]);

  useEffect(() => {
    fetch('/api/auth/status')
      .then((r) => r.json())
      .then((d) => {
        setGoogleEnabled(Boolean(d.google_oauth));
        setRedirectUri(d.redirect_uri_for_this_host || null);
      })
      .catch(() => setGoogleEnabled(false));
  }, []);

  useEffect(() => {
    if (!isLoading && user) {
      const cid = String(user.companyId || '').toLowerCase();
      if (cid === 'hackathon' || judgeMode || isJudgeDemoLoginId(user.id)) {
        router.push(JUDGE_CONSOLE_PATH);
      } else {
        router.push('/app/modules');
      }
    }
  }, [user, isLoading, router, judgeMode]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get('error');
    if (err === 'google_failed') setError(loginCopy.googleFailed);
    if (err === 'google_not_configured') setError(loginCopy.googleRedirectHint);
    if (err === 'google_state') setError(loginCopy.googleState);
    if (err === 'google_pending') setError(loginCopy.googlePending);
    if (err === 'account_rejected') setError(loginCopy.accountRejected);
    if (err === 'google_onboarding_expired') setError(loginCopy.onboardingExpired);
  }, [
    lang,
    loginCopy.googleFailed,
    loginCopy.googleState,
    loginCopy.googlePending,
    loginCopy.googleRedirectHint,
    loginCopy.accountRejected,
    loginCopy.onboardingExpired,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError(loginCopy.required);
      return;
    }
    const ok = await login(username.trim(), password);
    if (!ok) {
      setError(loginCopy.invalid);
      return;
    }
    if (judgeMode || isJudgeDemoLoginId(username.trim())) {
      router.push(JUDGE_CONSOLE_PATH);
    } else {
      router.push('/app/modules');
    }
  };

  if (isLoading || user) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col overflow-hidden bg-zinc-950 lg:flex-row">
      <LangToggle className="absolute right-4 top-4 z-50" />

      <Image
        src={HERO}
        alt=""
        fill
        priority
        className="object-cover"
        sizes="100vw"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-950/92 via-zinc-950/80 to-blue-950/50" />

      <div className="relative z-20 hidden w-[min(100%,340px)] shrink-0 lg:flex lg:flex-col">
        <AriaOrchestrator lang={lang} mode="guest" panel />
      </div>

      <div className="relative hidden min-w-0 flex-1 lg:block">
        <div className="relative z-10 flex h-full flex-col justify-center p-12 xl:p-16">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-blue-400/90">
            {INNEROS_BRAND.name}
          </p>
          <h1 className="max-w-lg text-4xl font-bold leading-tight text-white xl:text-5xl">
            {loginCopy.headline}
            <span className="mt-1 block bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              {loginCopy.headlineAccent}
            </span>
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-zinc-300">{loginCopy.subline}</p>
        </div>
      </div>

      <div className="relative z-10 flex w-full flex-1 flex-col items-center justify-center p-6 lg:w-[min(100%,440px)] lg:shrink-0 lg:border-l lg:border-zinc-800/80 lg:bg-zinc-950/85 lg:backdrop-blur-xl">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex">
              <InnerOSMark size="lg" href="/app/modules" />
            </div>
            <h2 className="text-2xl font-bold text-white">{INNEROS_BRAND.name}</h2>
            <p className="mt-1 text-sm text-zinc-500 lg:hidden">{loginCopy.subline}</p>
          </div>

          {error && (
            <div className="mb-4 flex gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="mb-5 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-3 text-left">
            <div className="flex items-center gap-2 text-sm font-semibold text-violet-100">
              <KeyRound className="h-4 w-4" />
              Hackathon judges — password login
            </div>
            <p className="mt-2 text-xs text-zinc-400">
              Do not use Google. Use username + password, then open Judge Console.
            </p>
            <dl className="mt-3 space-y-1.5 font-mono text-[11px] text-zinc-300">
              <div>
                <dt className="inline text-zinc-500">URL: </dt>
                <dd className="inline break-all text-emerald-300">{JUDGE_PORTAL_URL}</dd>
              </div>
              <div>
                <dt className="inline text-zinc-500">User: </dt>
                <dd className="inline text-white">{JUDGE_LOGIN_ACCOUNTS.map((a) => a.username).join(' · ')}</dd>
              </div>
              <div>
                <dt className="inline text-zinc-500">Pass: </dt>
                <dd className="inline text-amber-200">{JUDGE_DEMO_PASSWORD}</dd>
              </div>
              <div>
                <dt className="inline text-zinc-500">Console: </dt>
                <dd className="inline text-violet-300">{JUDGE_CONSOLE_PATH}</dd>
              </div>
            </dl>
            {!judgeMode ? (
              <a href="/app/login?judge=1" className="mt-2 inline-block text-[11px] text-violet-300 hover:text-violet-200">
                Prefill judge credentials →
              </a>
            ) : null}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="user" className="mb-2 block text-sm font-medium text-zinc-300">
                {loginCopy.username}
              </label>
              <input
                id="user"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900/60 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoComplete="username"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-zinc-300">
                {loginCopy.password}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900/60 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 py-3 font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:from-blue-500 hover:to-purple-500"
            >
              <LogIn className="h-5 w-5" />
              {loginCopy.signIn}
            </button>
          </form>

          {googleEnabled ? (
            <a
              href="/api/auth/google"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-600 bg-zinc-900/60 py-3 font-medium text-white transition hover:bg-zinc-800"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              {loginCopy.google}
            </a>
          ) : null}

          <p className="mt-4 text-center text-xs text-zinc-500">{loginCopy.loginHint}</p>

          <p className="mt-3 text-center text-sm text-zinc-400">
            {loginCopy.registerPrompt}{' '}
            <a href="/app/register" className="font-medium text-blue-400 hover:text-blue-300">
              {loginCopy.registerLink}
            </a>
          </p>

          {redirectUri && googleEnabled ? (
            <p className="mt-3 text-center text-[10px] leading-relaxed text-zinc-600 lg:text-left">
              OAuth callback: {redirectUri}
            </p>
          ) : null}

          <div className="mt-8 lg:hidden">
            <AriaOrchestrator lang={lang} mode="guest" />
          </div>

          <p className="mt-8 text-center text-xs text-zinc-600">{loginCopy.footer}</p>
        </div>
      </div>
    </div>
  );
}
