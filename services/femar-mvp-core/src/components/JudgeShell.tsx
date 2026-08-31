'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Copy, HelpCircle, LogOut, Scale, X } from 'lucide-react';
import InnerOSMark from '@/components/InnerOSMark';
import {
  JUDGE_CONSOLE_PATH,
  JUDGE_DEMO_PASSWORD,
  JUDGE_LOGIN_ACCOUNTS,
  JUDGE_PORTAL_URL,
} from '@/lib/judgeCredentials';

type JudgeShellProps = {
  userName: string;
  onLogout: () => void;
  ariaSlot?: React.ReactNode;
  traceSlot?: React.ReactNode;
  children: React.ReactNode;
};

/** Minimal English-only shell for hackathon judges — no tenant modules nav. */
export default function JudgeShell({ userName, onLogout, ariaSlot, traceSlot, children }: JudgeShellProps) {
  const [helpOpen, setHelpOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyCredentials = async () => {
    const text = [
      'InnerOS Judge Demo — password login only (do not use Google)',
      `URL: ${JUDGE_PORTAL_URL}`,
      `Username: ${JUDGE_LOGIN_ACCOUNTS.map((a) => a.username).join(' or ')}`,
      `Password: ${JUDGE_DEMO_PASSWORD}`,
      `Console: ${JUDGE_PORTAL_URL.replace('/app/login', JUDGE_CONSOLE_PATH)}`,
    ].join('\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-zinc-950">
      <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <InnerOSMark size="sm" href={undefined} accent="blue" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 shrink-0 text-violet-400" />
                <p className="truncate text-sm font-semibold text-white">InnerOS ARIA · Judge Console</p>
              </div>
              <p className="truncate text-xs text-zinc-500">English demo · real MCP telemetry · no simulated PASS</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden max-w-[160px] truncate text-xs text-zinc-400 sm:inline">{userName}</span>
            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-violet-500/40 bg-violet-500/10 px-2.5 py-1.5 text-[10px] text-violet-100 hover:bg-violet-500/20"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              Help
            </button>
            <Link
              href="/app/login?judge=1"
              className="rounded-lg border border-zinc-700 px-2.5 py-1.5 text-[10px] text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
            >
              Login
            </Link>
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-2.5 py-1.5 text-xs text-red-300 hover:bg-red-500/10"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      {helpOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm" role="dialog" aria-label="Judge help">
          <button type="button" className="flex-1" aria-label="Close help" onClick={() => setHelpOpen(false)} />
          <aside className="flex h-full w-full max-w-md flex-col border-l border-zinc-800 bg-zinc-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold text-white">Judge access &amp; commands</h2>
                <p className="text-[10px] text-zinc-500">Password login only — no Google OAuth for recording</p>
              </div>
              <button type="button" onClick={() => setHelpOpen(false)} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-900">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto p-4 text-xs">
              <div className="grid gap-2">
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                  <div className="text-[10px] uppercase tracking-wide text-zinc-500">Login URL</div>
                  <div className="mt-1 break-all font-mono text-emerald-300">{JUDGE_PORTAL_URL}</div>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                  <div className="text-[10px] uppercase tracking-wide text-zinc-500">Username</div>
                  <div className="mt-1 space-y-1 font-mono text-white">
                    {JUDGE_LOGIN_ACCOUNTS.map((a) => (
                      <div key={a.username}>{a.username}</div>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                  <div className="text-[10px] uppercase tracking-wide text-zinc-500">Password</div>
                  <div className="mt-1 font-mono text-sm text-amber-200">{JUDGE_DEMO_PASSWORD}</div>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                  <div className="text-[10px] uppercase tracking-wide text-zinc-500">Console path</div>
                  <div className="mt-1 font-mono text-violet-300">{JUDGE_CONSOLE_PATH}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={copyCredentials}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-violet-500/40 bg-violet-500/10 px-3 py-2 text-violet-100 hover:bg-violet-500/20"
              >
                <Copy className="h-3.5 w-3.5" />
                {copied ? 'Copied for Devpost' : 'Copy credentials block'}
              </button>
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 text-zinc-400">
                <p className="font-semibold text-zinc-200">ARIA commands</p>
                <ul className="mt-2 list-inside list-disc space-y-1">
                  <li>what can you do here?</li>
                  <li>run test 1 … run test 7</li>
                  <li>run all seven tests</li>
                  <li>a2a status · agent cards</li>
                </ul>
              </div>
            </div>
          </aside>
        </div>
      ) : null}

      {ariaSlot || traceSlot ? (
        <div className="border-b border-zinc-800 bg-zinc-950/90">
          <div className="mx-auto grid max-w-7xl gap-4 px-4 py-3 md:px-8 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] lg:items-stretch">
            {ariaSlot ? <div className="h-[44dvh] min-h-[360px] max-h-[480px] overflow-hidden">{ariaSlot}</div> : null}
            {traceSlot ? <div className="h-[44dvh] min-h-[360px] max-h-[480px] overflow-hidden">{traceSlot}</div> : null}
          </div>
        </div>
      ) : null}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 md:px-8">{children}</main>
    </div>
  );
}
