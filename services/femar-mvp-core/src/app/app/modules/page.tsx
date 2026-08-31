'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useInnerOSLang } from '@/contexts/InnerOSLangContext';
import {
  Users,
  FileText,
  UserCheck,
  KeyRound,
  Rocket,
  Lock,
  Activity,
  ArrowRight,
  Settings,
  Heart,
} from 'lucide-react';
import type { EcosystemModule } from '@/lib/ecosystemModules';
import AriaOrchestrator from '@/components/AriaOrchestrator';
import InnerOSShell from '@/components/InnerOSShell';
import InnerOSPageBackdrop from '@/components/InnerOSPageBackdrop';
import { resolveBrandFromCompany } from '@/lib/entityBranding';
import { moduleDescription } from '@/lib/innerosCopy';

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  users: Users,
  quote: FileText,
  visitor: UserCheck,
  key: KeyRound,
  founder: Rocket,
  admin: Settings,
  iskcon: Heart,
};

export default function InnerOSModulesPage() {
  const { user, activeCompanyId, logout, isLoading } = useAuth();
  const router = useRouter();
  const { lang, toggleLang, copy } = useInnerOSLang();
  const [modules, setModules] = useState<EcosystemModule[]>([]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/app/login');
      return;
    }
    if (!isLoading && user && String(user.companyId || '').toLowerCase() === 'hackathon') {
      router.replace('/app/judge');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    fetch('/api/ecosystem/modules')
      .then((r) => r.json())
      .then((d) => setModules(d.modules || []))
      .catch(() => setModules([]));
  }, []);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  const modulesCopy = copy.modules;
  const brand = resolveBrandFromCompany(activeCompanyId || user.companyId);

  const showJudgeConsole =
    user.role === 'superadmin' ||
    ['hackathon', 'pcdoctor', 'ent_pcdoctor'].includes(String(user.companyId || '').toLowerCase());

  const statusLabel = (m: EcosystemModule) => {
    if (m.status === 'LIVE') return null;
    if (m.status === 'BETA') return modulesCopy.beta;
    return modulesCopy.soon;
  };

  return (
    <InnerOSShell
      tenantName={brand.displayName}
      userName={user.name}
      lang={lang}
      onToggleLang={toggleLang}
      onLogout={() => {
        logout();
        router.push('/app/login');
      }}
      ariaSlot={<AriaOrchestrator lang={lang} mode="authenticated" panel userId={user.id} moduleId="portal" />}
    >
      <InnerOSPageBackdrop tone="blue">
        <div className="w-full px-4 py-6 text-center md:px-8 md:py-8">
          <h1 className="text-xl font-bold text-white sm:text-2xl md:text-3xl">{modulesCopy.title}</h1>
          <p className="mx-auto mt-2 max-w-2xl text-xs text-zinc-400 sm:text-sm">{modulesCopy.subtitle}</p>
        </div>

        <div className="inneros-hub-grid">
          {showJudgeConsole ? (
            <button
              type="button"
              className="inneros-hub-card border-violet-500/20 hover:border-violet-500/40"
              onClick={() => router.push('/app/judge')}
            >
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10 sm:mb-3">
                <Activity className="h-4 w-4 text-violet-400 sm:h-5 sm:w-5" />
              </div>
              <h3 className="mb-1 line-clamp-2 text-sm font-semibold text-white sm:text-base">Judge Console</h3>
              <p className="mb-3 line-clamp-3 text-xs leading-relaxed text-zinc-400 sm:text-sm">
                {lang === 'es'
                  ? 'Live Trace, KPIs y workflows del hackathon — telemetría real MCP.'
                  : 'Hackathon Live Trace, KPIs and workflows — real MCP telemetry.'}
              </p>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-violet-400 sm:text-sm">
                {modulesCopy.open} <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </button>
          ) : null}
          {modules.map((mod) => {
            const Icon = ICONS[mod.icon] || Users;
            const disabled = mod.status === 'NOT_READY' || !mod.entryUrl;
            const badge = statusLabel(mod);
            const description = moduleDescription(mod.id, lang, mod.description);

            const inner = (
              <>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 sm:mb-3">
                  <Icon className="h-4 w-4 text-blue-400 sm:h-5 sm:w-5" />
                </div>
                <h3 className="mb-1 line-clamp-2 text-sm font-semibold text-white sm:text-base">{mod.name}</h3>
                <p className="mb-3 line-clamp-3 text-xs leading-relaxed text-zinc-400 sm:text-sm">{description}</p>
                {badge ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-400">
                    <Lock className="h-3 w-3" /> {badge}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-400 sm:text-sm">
                    {modulesCopy.open} <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                )}
              </>
            );

            if (disabled) {
              return (
                <div key={mod.id} className="inneros-hub-card opacity-55">
                  {inner}
                </div>
              );
            }

            return (
              <button
                key={mod.id}
                type="button"
                className="inneros-hub-card hover:border-blue-500/40"
                onClick={async () => {
                  const res = await fetch(`/api/ecosystem/modules/${mod.id}/access`);
                  if (!res.ok) {
                    alert(modulesCopy.accessDenied);
                    return;
                  }
                  const data = await res.json();
                  const target = data.launchUrl || data.entryUrl;
                  if (target) window.open(target, '_blank', 'noopener,noreferrer');
                }}
              >
                {inner}
              </button>
            );
          })}
        </div>
      </InnerOSPageBackdrop>
    </InnerOSShell>
  );
}
