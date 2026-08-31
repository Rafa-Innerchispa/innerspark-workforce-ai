'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Globe, LayoutGrid, LogOut, Menu, User, X } from 'lucide-react';
import InnerOSMark from '@/components/InnerOSMark';
import { INNEROS_BRAND, t, type InnerOSLang } from '@/lib/innerosCopy';

type InnerOSShellProps = {
  tenantName: string;
  userName: string;
  lang: InnerOSLang;
  onToggleLang: () => void;
  onLogout: () => void;
  ariaSlot?: React.ReactNode;
  children: React.ReactNode;
};

export default function InnerOSShell({
  tenantName,
  userName,
  lang,
  onToggleLang,
  onLogout,
  ariaSlot,
  children,
}: InnerOSShellProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const isModules = pathname === '/app/modules';
  const isDesk = pathname === '/app/desk';
  const copy = t(lang);

  const languageToggle = (
    <button
      type="button"
      onClick={onToggleLang}
      className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900/70 px-2.5 py-1.5 text-xs text-zinc-300 transition hover:border-zinc-600 hover:text-white"
      aria-label={copy.common.switchLanguage}
    >
      <Globe className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{copy.shell.language}</span>
      <span className="font-bold uppercase text-blue-400">{lang}</span>
    </button>
  );

  const navLinks = (
    <>
      <Link
        href="/app/modules"
        onClick={() => setMenuOpen(false)}
        className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
          isModules
            ? 'border border-blue-500/30 bg-blue-600/20 text-blue-400'
            : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
        }`}
      >
        <LayoutGrid className="h-4 w-4" />
        {copy.modules.title}
      </Link>
      {isDesk ? (
        <div className="mt-2 flex items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs font-medium text-amber-300">
          ISKCON Desk
        </div>
      ) : null}
    </>
  );

  return (
    <div className="flex min-h-[100dvh] w-full flex-col bg-zinc-950 md:flex-row">
      {/* Top bar — mobile */}
      <header className="sticky top-0 z-50 flex shrink-0 items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-950/95 px-4 py-3 backdrop-blur md:hidden">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="rounded-lg p-2 text-zinc-300"
          aria-label={copy.shell.closeMenu}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
          <InnerOSMark size="sm" href="/app/modules" accent={isDesk ? 'amber' : 'blue'} />
          <span className="text-sm font-semibold text-blue-400">InnerOS</span>
        </div>
        {languageToggle}
      </header>

      {menuOpen ? (
        <div className="border-b border-zinc-800 bg-zinc-950 px-4 py-3 md:hidden">
          {navLinks}
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              onLogout();
            }}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10"
          >
            <LogOut className="h-4 w-4" />
            {copy.shell.signOut}
          </button>
        </div>
      ) : null}

      {/* Main content — arriba en móvil, derecha en desktop */}
      <main className="order-1 min-h-0 w-full flex-1 overflow-y-auto md:order-2">{children}</main>

      {/* Panel ARIA + nav — abajo en móvil, izquierda en desktop */}
      <aside className="order-2 flex h-[44dvh] min-h-[280px] w-full shrink-0 flex-col border-t border-zinc-800 bg-zinc-950/95 md:order-1 md:h-[100dvh] md:w-[min(100%,340px)] md:border-r md:border-t-0">
        <div className="hidden shrink-0 border-b border-zinc-800 p-4 md:block">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <InnerOSMark size="md" href="/app/modules" accent={isDesk ? 'amber' : 'blue'} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{INNEROS_BRAND.name}</p>
                <p className="truncate text-xs text-zinc-500">{tenantName}</p>
              </div>
            </div>
            {languageToggle}
          </div>
        </div>

        <nav className="hidden shrink-0 px-3 py-2 md:block">{navLinks}</nav>

        {ariaSlot ? <div className="flex min-h-0 flex-1 flex-col">{ariaSlot}</div> : null}

        <div className="hidden shrink-0 space-y-2 border-t border-zinc-800 p-3 md:block">
          <div className="flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-center">
            <User className="h-4 w-4 shrink-0 text-zinc-500" />
            <p className="truncate text-xs font-medium text-zinc-300">{userName}</p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
          >
            <LogOut className="h-4 w-4" />
            {copy.shell.signOut}
          </button>
        </div>
      </aside>
    </div>
  );
}
