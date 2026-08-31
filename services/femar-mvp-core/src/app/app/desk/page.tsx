'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useInnerOSLang } from '@/contexts/InnerOSLangContext';
import InnerOSShell from '@/components/InnerOSShell';
import InnerOSPageBackdrop from '@/components/InnerOSPageBackdrop';
import AriaOrchestrator from '@/components/AriaOrchestrator';
import PanihatiRegisterForm from '@/components/PanihatiRegisterForm';
import { resolveBrandFromCompany } from '@/lib/entityBranding';
import type { IskconHub, IskconSubAction } from '@/lib/iskconDeskHub';
import {
  Heart,
  Gift,
  Users,
  CalendarHeart,
  FileText,
  UtensilsCrossed,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  Lock,
  X,
  Sparkles,
} from 'lucide-react';

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  sponsors_list: Users,
  food_for_life: UtensilsCrossed,
  donations: Gift,
  festivals: CalendarHeart,
  yoga_education: BookOpen,
  contacts: Users,
  documents: FileText,
};

const STATUS_BADGE: Record<string, { en: string; es: string; className: string }> = {
  LIVE: { en: 'Live', es: 'Activo', className: 'text-emerald-400' },
  PARTIAL: { en: 'Partial', es: 'Parcial', className: 'text-amber-400' },
  NOT_READY: { en: 'Soon', es: 'Pronto', className: 'text-zinc-500' },
};

type ActionResult = {
  title: string;
  text: string;
  status: string;
  view?: string;
  hubId?: string;
  subActionId?: string;
  artifacts?: Array<{ name: string; mime: string; url: string }>;
};

export default function IskconDeskHubPage() {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();
  const { lang, toggleLang, copy } = useInnerOSLang();
  const [hubs, setHubs] = useState<IskconHub[]>([]);
  const [activeHub, setActiveHub] = useState<IskconHub | null>(null);
  const [running, setRunning] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<ActionResult | null>(null);

  useEffect(() => {
    if (!isLoading && !user) router.push('/app/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    fetch('/api/ecosystem/module-actions?moduleId=iskcon-desk')
      .then((r) => r.json())
      .then((d) => setHubs(d.hubs || []))
      .catch(() => setHubs([]));
  }, []);

  const runSubAction = async (hub: IskconHub, sub: IskconSubAction) => {
    setRunning(`${hub.id}:${sub.id}`);
    try {
      const res = await fetch('/api/ecosystem/module-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleId: 'iskcon-desk',
          actionId: hub.actionId,
          hubId: hub.id,
          subActionId: sub.id,
          lang,
        }),
      });
      const data = await res.json();
      setActionResult({
        title: lang === 'es' ? sub.titleEs : sub.titleEn,
        text: data.text || (lang === 'es' ? 'Sin respuesta.' : 'No response.'),
        status: data.status || sub.status,
        view: data.view,
        hubId: hub.id,
        subActionId: sub.id,
        artifacts: Array.isArray(data.artifacts) ? data.artifacts : undefined,
      });
    } catch {
      setActionResult({
        title: lang === 'es' ? sub.titleEs : sub.titleEn,
        text: lang === 'es' ? 'Error al ejecutar.' : 'Execution failed.',
        status: 'PARTIAL',
      });
    } finally {
      setRunning(null);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  const brand = resolveBrandFromCompany(user.companyId);
  const isEs = lang === 'es';

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
      ariaSlot={<AriaOrchestrator lang={lang} mode="authenticated" panel userId={user.id} moduleId="iskcon-desk" />}
    >
      <InnerOSPageBackdrop tone="amber">
        <div className="w-full px-4 py-6 text-center md:px-8 md:py-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-amber-300">
            <Heart className="h-4 w-4" />
            ISKCON Guayaquil
          </div>
          <h1 className="text-xl font-bold text-white sm:text-2xl md:text-3xl">
            {activeHub
              ? isEs
                ? activeHub.titleEs
                : activeHub.titleEn
              : isEs
                ? '¿Qué deseas hacer hoy?'
                : 'What would you like to do today?'}
          </h1>
          {activeHub ? (
            <p className="mx-auto mt-2 max-w-xl text-xs text-zinc-400 sm:text-sm">
              {isEs ? activeHub.descEs : activeHub.descEn}
            </p>
          ) : null}
        </div>

        {actionResult ? (
          <div className="mx-auto mb-6 w-full max-w-lg px-4">
            <div className="glass-card relative p-5">
              <button
                type="button"
                onClick={() => setActionResult(null)}
                className="absolute right-3 top-3 text-zinc-500 hover:text-white"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
              <p className="mb-1 text-center text-xs font-semibold uppercase tracking-wide text-amber-400">
                {actionResult.status}
                {actionResult.view ? ` · ${actionResult.view}` : ''}
              </p>
              <h2 className="mb-3 text-center text-lg font-semibold text-white">{actionResult.title}</h2>
              {actionResult.view === 'form' &&
              ((actionResult.hubId === 'festivals' && actionResult.subActionId === 'register') ||
                (actionResult.hubId === 'sponsors' && actionResult.subActionId === 'register')) ? (
                <PanihatiRegisterForm
                  lang={lang}
                  defaultKind={actionResult.hubId === 'sponsors' ? 'sponsor' : 'budget'}
                  onCancel={() => setActionResult(null)}
                  onDone={(message) =>
                    setActionResult({
                      ...actionResult,
                      view: 'summary',
                      text: message,
                      status: 'LIVE',
                    })
                  }
                />
              ) : (
                <>
                <div className="max-h-[50vh] overflow-y-auto whitespace-pre-wrap text-left text-sm leading-relaxed text-zinc-200">
                  {actionResult.text}
                </div>
                {actionResult.artifacts?.length ? (
                  <div className="mt-4 flex flex-col items-center gap-2">
                    {actionResult.artifacts.map((a) => (
                      <a
                        key={a.url}
                        href={a.url}
                        download={a.name}
                        className="inline-flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-100 hover:bg-amber-500/20"
                      >
                        <FileText className="h-4 w-4" />
                        {isEs ? 'Descargar' : 'Download'} {a.name}
                      </a>
                    ))}
                  </div>
                ) : null}
                </>
              )}
              <button
                type="button"
                onClick={() => setActionResult(null)}
                className="mx-auto mt-4 flex items-center gap-1 text-sm text-amber-300 hover:text-amber-200"
              >
                <ArrowLeft className="h-4 w-4" />
                {isEs ? 'Volver al menú' : 'Back to menu'}
              </button>
            </div>
          </div>
        ) : null}

        {!actionResult && activeHub ? (
          <div className="mb-3 flex justify-center px-4">
            <button
              type="button"
              onClick={() => setActiveHub(null)}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-700/80 bg-zinc-900/40 px-3 py-1.5 text-sm text-zinc-300 hover:border-amber-500/40 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              {isEs ? 'Todos los módulos' : 'All modules'}
            </button>
          </div>
        ) : null}

        {!actionResult ? (
          <div className="inneros-hub-grid">
            {(activeHub ? activeHub.subActions : hubs).map((item) => {
              if (activeHub) {
                const sub = item as IskconSubAction;
                const badge = STATUS_BADGE[sub.status];
                const isSoon = sub.status === 'NOT_READY';
                const runKey = `${activeHub.id}:${sub.id}`;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    disabled={running === runKey}
                    onClick={() => runSubAction(activeHub, sub)}
                    className={`inneros-hub-card ${isSoon ? 'opacity-75' : 'hover:border-amber-500/40'}`}
                  >
                    <h2 className="mb-1 line-clamp-2 text-sm font-semibold text-white sm:text-base">
                      {isEs ? sub.titleEs : sub.titleEn}
                    </h2>
                    <p className="mb-3 line-clamp-2 text-xs text-zinc-400 sm:text-sm">{isEs ? sub.descEs : sub.descEn}</p>
                    <span className={`inline-flex items-center gap-1 text-xs font-medium sm:text-sm ${isSoon ? badge.className : 'text-amber-300'}`}>
                      {isSoon ? (
                        <>
                          <Lock className="h-3 w-3" /> {isEs ? badge.es : badge.en}
                        </>
                      ) : running === runKey ? (
                        '…'
                      ) : (
                        <>
                          {copy.modules.open} <ArrowRight className="h-3.5 w-3.5" />
                        </>
                      )}
                    </span>
                  </button>
                );
              }

              const hub = item as IskconHub;
              const Icon = ICONS[hub.icon] || Sparkles;
              const badge = STATUS_BADGE[hub.status];
              return (
                <button
                  key={hub.id}
                  type="button"
                  onClick={() => setActiveHub(hub)}
                  className="inneros-hub-card hover:border-amber-500/40"
                >
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 sm:mb-3 sm:h-11 sm:w-11">
                    <Icon className="h-4 w-4 text-amber-300 sm:h-5 sm:w-5" />
                  </div>
                  <h2 className="mb-1 line-clamp-2 text-sm font-semibold text-white sm:text-base">
                    {isEs ? hub.titleEs : hub.titleEn}
                  </h2>
                  <p className="mb-2 line-clamp-2 text-xs leading-relaxed text-zinc-400 sm:mb-3 sm:text-sm">
                    {isEs ? hub.descEs : hub.descEn}
                  </p>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-300 sm:text-sm">
                    {hub.subActions.length} {isEs ? 'opc.' : 'opts'} · {isEs ? badge.es : badge.en}{' '}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}
      </InnerOSPageBackdrop>
    </InnerOSShell>
  );
}
