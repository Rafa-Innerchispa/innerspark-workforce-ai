'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  CheckCircle2,
  ChevronRight,
  Cloud,
  Cpu,
  Play,
  RefreshCw,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import AriaOrchestrator from '@/components/AriaOrchestrator';
import JudgeShell from '@/components/JudgeShell';
import JudgeGlobalTracePanel from '@/components/JudgeGlobalTracePanel';
import type { JudgeContentSection, JudgeModelRoute, JudgeTraceEvent } from '@/lib/judgeConsoleApi';
import { JUDGE_CLOUD_BURST_NOTE, JUDGE_DEMO_STEPS } from '@/lib/judgeDemoSteps';
import { evaluateJudgeDemoStep } from '@/lib/judgeDemoEval';
import {
  inferRouteReadiness,
  modelOptionReadiness,
  readinessBadgeClass,
  functionGemmaTruthNote,
  mi325xBurstTruthNote,
  type RouteReadiness,
} from '@/lib/judgeVisualAudit';
import {
  A2A_LIVE_PROOF_CORRELATION,
  defaultTraceFilter,
  findMi325xDroplet,
  pickActiveCorrelationId,
  type TraceFilterId,
} from '@/lib/judgeGlobalTrace';

const MODEL_OPTIONS = [
  { id: 'auto', label: 'Auto (local-first)' },
  { id: 'gemini', label: 'Gemini (Google)' },
  { id: 'functiongemma', label: 'FunctionGemma (Vertex)' },
  { id: 'local_amd', label: 'Local AMD / vLLM' },
  { id: 'local_intel', label: 'Local Intel / Ollama' },
  { id: 'lemonade_voice', label: 'Lemonade voice (STT/TTS)' },
] as const;

type JudgeApiPayload = {
  backend?: 'live' | 'pending_merge';
  isOwner?: boolean;
  kpis?: { total: number; verified: number; passRate: number; local: number; cloud: number };
  events?: JudgeTraceEvent[];
  workflows?: Record<string, unknown>[];
  sections?: JudgeContentSection[];
  modelRouting?: { routes?: JudgeModelRoute[]; local_first?: boolean } | null;
  resourceFabric?: Record<string, unknown> | null;
  errors?: string[];
  traceSources?: string[];
  globalEvents?: JudgeTraceEvent[];
};

type StepRunState = {
  id: string;
  ok?: boolean;
  detail?: string;
  running?: boolean;
};

function ReadinessPill({ state }: { state: RouteReadiness }) {
  return (
    <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold ${readinessBadgeClass(state)}`}>
      {state}
    </span>
  );
}

function StepStatusPill({ state }: { state: 'READY' | 'RUNNING' | RouteReadiness }) {
  const classes =
    state === 'READY'
      ? 'border-zinc-700 bg-zinc-800/70 text-zinc-300'
      : state === 'RUNNING'
        ? 'border-blue-500/40 bg-blue-500/15 text-blue-200'
        : readinessBadgeClass(state);
  return <span className={`inline-flex rounded border px-1.5 py-0.5 text-[10px] font-semibold ${classes}`}>{state}</span>;
}

function freshStepCorrelation(stepId: string) {
  const suffix = Math.random().toString(36).slice(2, 8);
  return `judge-ui-trace-final-20260831-${stepId}-${Date.now()}-${suffix}`;
}

export default function JudgeConsolePage() {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<JudgeApiPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState('auto');
  const [actionResult, setActionResult] = useState('');
  const [stepStates, setStepStates] = useState<StepRunState[]>([]);
  const [demoRunning, setDemoRunning] = useState(false);
  const [traceFilter, setTraceFilter] = useState<TraceFilterId>('all');
  const [activeCorrelationId, setActiveCorrelationId] = useState<string>('');
  const [traceEvents, setTraceEvents] = useState<JudgeTraceEvent[]>([]);
  const [traceSources, setTraceSources] = useState<string[]>([]);
  const [traceLoading, setTraceLoading] = useState(false);
  const [traceStale, setTraceStale] = useState(false);
  const lastTraceRef = useRef<JudgeTraceEvent[]>([]);
  const [legacyHostWarning, setLegacyHostWarning] = useState(false);

  const pollTrace = (correlationId?: string) => {
    setTraceLoading(true);
    const qs = new URLSearchParams({ mode: 'trace', limit: '120' });
    if (correlationId) qs.set('correlation_id', correlationId);
    fetch(`/api/ecosystem/judge?${qs}`)
      .then((r) => r.json())
      .then((d) => {
        const events = (d.events as JudgeTraceEvent[]) || [];
        if (events.length) {
          lastTraceRef.current = events;
          setTraceEvents(events);
          setTraceStale(false);
        } else if (lastTraceRef.current.length) {
          setTraceEvents(lastTraceRef.current);
          setTraceStale(true);
        }
        setTraceSources((d.sources as string[]) || []);
        const active = pickActiveCorrelationId(events.length ? events : lastTraceRef.current, activeCorrelationId || correlationId);
        if (active && !activeCorrelationId) setActiveCorrelationId(active);
      })
      .catch(() => {
        if (lastTraceRef.current.length) {
          setTraceEvents(lastTraceRef.current);
          setTraceStale(true);
        }
      })
      .finally(() => setTraceLoading(false));
  };

  const load = () => {
    setLoading(true);
    fetch('/api/ecosystem/judge')
      .then((r) => {
        if (r.status === 403) {
          router.push('/app/login?judge=1');
          return null;
        }
        return r.json();
      })
      .then((d) => setSnapshot(d))
      .catch(() => setSnapshot(null))
      .finally(() => setLoading(false));
  };

  const runAction = async (action: string, extra: Record<string, unknown> = {}, busyId?: string) => {
    setActionBusy(busyId || action);
    setActionResult('');
    try {
      const res = await fetch('/api/ecosystem/judge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json();
      setActionResult(JSON.stringify(data, null, 2).slice(0, 1400));
      const cid = String(data.correlation_id || data.event?.correlation_id || extra.correlation_id || '');
      if (cid) {
        setActiveCorrelationId(cid);
        setTraceFilter('current_run');
      }
      load();
      pollTrace(cid || activeCorrelationId);
      return data;
    } catch (err) {
      setActionResult(String(err));
      return { ok: false, error: String(err) };
    } finally {
      setActionBusy(null);
    }
  };

  const runSingleStep = async (stepIndex: number) => {
    const step = JUDGE_DEMO_STEPS[stepIndex];
    const correlation_id = freshStepCorrelation(step.id);
    setStepStates(
      JUDGE_DEMO_STEPS.map((s) => ({
        id: s.id,
        running: s.id === step.id,
        ok: stepStates.find((x) => x.id === s.id)?.ok,
        detail: stepStates.find((x) => x.id === s.id)?.detail,
      }))
    );
    const data = await runAction(step.action, { ...(step.payload || {}), correlation_id }, step.id);
    const verdict = evaluateJudgeDemoStep(step.action, data, 'en', step);
    setStepStates((prev) =>
      prev.map((s) =>
        s.id === step.id ? { id: step.id, ok: verdict.ok, detail: verdict.detail, running: false } : { ...s, running: false }
      )
    );
  };

  const runDemoSuite = async () => {
    setDemoRunning(true);
    setStepStates(JUDGE_DEMO_STEPS.map((s) => ({ id: s.id })));
    const collected: StepRunState[] = [];
    try {
      for (const step of JUDGE_DEMO_STEPS) {
        setStepStates((prev) =>
          prev.map((s) => (s.id === step.id ? { ...s, running: true } : s))
        );
        const data = await runAction(
          step.action,
          { ...(step.payload || {}), correlation_id: freshStepCorrelation(step.id) },
          step.id
        );
        const verdict = evaluateJudgeDemoStep(step.action, data, 'en', step);
        collected.push({ id: step.id, ok: verdict.ok, detail: verdict.detail });
        setStepStates([...collected]);
      }
      const pass = collected.filter((s) => s.ok).length;
      setActionResult(`Guided process: ${pass === collected.length ? 'PASS' : 'PARTIAL'} (${pass}/${collected.length})`);
    } finally {
      setDemoRunning(false);
      setActionBusy(null);
    }
  };

  const handleJudgeAriaEvent = (event: { correlationId?: string; action?: string; ok?: boolean }) => {
    if (event.correlationId) {
      setActiveCorrelationId(event.correlationId);
      setTraceFilter('current_run');
      pollTrace(event.correlationId);
    }
    load();
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setLegacyHostWarning(window.location.hostname.includes('pcdoctor.ai'));
    }
  }, []);

  useEffect(() => {
    if (user) {
      load();
      pollTrace();
      const id = window.setInterval(() => pollTrace(activeCorrelationId || undefined), 4000);
      return () => window.clearInterval(id);
    }
  }, [user, activeCorrelationId]);

  useEffect(() => {
    if (!isLoading && !user) router.push('/app/login?judge=1');
  }, [user, isLoading, router]);

  const routes = useMemo(
    () => (snapshot?.modelRouting?.routes as JudgeModelRoute[] | undefined) || [],
    [snapshot?.modelRouting]
  );
  const cloudBurstRoute = useMemo(
    () => routes.find((r) => String(r.task_class || '').includes('cloud_burst')),
    [routes]
  );
  const mi325x = useMemo(
    () => findMi325xDroplet(snapshot?.resourceFabric as Record<string, unknown> | null),
    [snapshot?.resourceFabric]
  );
  const displayEvents = traceEvents.length ? traceEvents : snapshot?.globalEvents || snapshot?.events || [];
  const effectiveFilter = traceFilter === 'current_run' && !activeCorrelationId ? 'all' : traceFilter;
  const a2aOnline = snapshot?.backend === 'live';
  const kpis = snapshot?.kpis || { total: 0, verified: 0, passRate: 0, local: 0, cloud: 0 };

  const tracePanel = (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-zinc-500">
        <span>LIVE trace only: persisted MCP/A2A/RACB events</span>
        {traceStale ? <span className="text-amber-300">showing last good trace while reconnecting</span> : null}
      </div>
      <JudgeGlobalTracePanel
        events={displayEvents}
        filter={effectiveFilter}
        activeCorrelationId={activeCorrelationId || null}
        sources={traceSources.length ? traceSources : snapshot?.traceSources || []}
        loading={traceLoading || loading}
        stale={traceStale}
        onFilterChange={(f) => setTraceFilter(f)}
        onCorrelationChange={(id) => {
          setActiveCorrelationId(id);
          if (id) setTraceFilter(defaultTraceFilter(id));
        }}
      />
    </div>
  );

  if (isLoading || !user) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <JudgeShell
      userName={user.name}
      onLogout={() => {
        logout();
        router.push('/app/login?judge=1');
      }}
      ariaSlot={
        <AriaOrchestrator
          lang="en"
          mode="authenticated"
          panel
          userId={user.id}
          moduleId="judge"
          onJudgeEvent={handleJudgeAriaEvent}
        />
      }
      traceSlot={tracePanel}
    >
      <div className="mx-auto w-full space-y-5 py-4 text-left md:py-5">
        {legacyHostWarning ? (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Legacy host <span className="font-mono">inneros.pcdoctor.ai</span> may point to Cloud Run shell, not this AMD Judge build.
            Canonical jury URL:{' '}
            <a href="https://inneros.creatorcore.ai/app/judge" className="font-mono text-emerald-300 underline">
              inneros.creatorcore.ai/app/judge
            </a>
          </div>
        ) : null}
        {/* Status + refresh */}
        <div className="grid items-end gap-3 text-center md:grid-cols-[1fr_auto] md:text-left">
          <div className="mx-auto max-w-2xl md:mx-0">
            <h1 className="text-lg font-bold text-white">Live MCP Judge workspace</h1>
            <p className="text-sm text-zinc-500">
              ARIA + Global Live Trace · Guided Process · honest LIVE / NOT_READY badges
            </p>
          </div>
          <button
            type="button"
            onClick={load}
            className="mx-auto inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-900 md:mx-0"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh snapshot
          </button>
        </div>

        {snapshot?.backend === 'pending_merge' && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <p>judge_trace_* tools NOT_AVAILABLE on MCP — backend merge pending.</p>
          </div>
        )}

        {a2aOnline && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-emerald-100">
              <CheckCircle2 className="h-4 w-4" />
              MCP Judge LIVE · ready to record
            </div>
            <button
              type="button"
              disabled={demoRunning || actionBusy !== null}
              onClick={runDemoSuite}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-40"
            >
              <Play className="h-3.5 w-3.5" />
              {demoRunning ? 'Guided run in progress...' : 'Guided Run All'}
            </button>
          </div>
        )}

        {/* Guided 7-step process */}
        <section>
          <h2 className="mb-3 text-center text-sm font-semibold uppercase tracking-wide text-zinc-400 sm:text-left">
            Individual Judge Tests
          </h2>
          <div className="space-y-3">
            {JUDGE_DEMO_STEPS.map((step, idx) => {
              const state = stepStates.find((s) => s.id === step.id);
              const isActive = state?.running || actionBusy === step.id;
              return (
                <details
                  key={step.id}
                  className={`group rounded-xl border bg-zinc-900/50 open:border-violet-500/30 ${
                    isActive ? 'border-violet-500/50 ring-1 ring-violet-500/30' : 'border-zinc-800'
                  }`}
                >
                  <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 px-4 py-3">
                    <ChevronRight className="h-4 w-4 shrink-0 text-zinc-500 transition group-open:rotate-90" />
                    <span className="min-w-[220px] flex-1 text-sm font-medium text-white">{step.labelEn}</span>
                    {state?.running ? (
                      <StepStatusPill state="RUNNING" />
                    ) : state?.ok === true ? (
                      <StepStatusPill state="LIVE" />
                    ) : state?.ok === false ? (
                      <StepStatusPill state="NOT_READY" />
                    ) : (
                      <StepStatusPill state="READY" />
                    )}
                    <button
                      type="button"
                      disabled={
                        (actionBusy !== null && actionBusy !== step.id) ||
                        demoRunning ||
                        snapshot?.backend !== 'live'
                      }
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        runSingleStep(idx);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-violet-500/40 bg-violet-500/10 px-3 py-1.5 text-[11px] text-violet-100 hover:bg-violet-500/20 disabled:opacity-40"
                    >
                      <Play className="h-3 w-3" />
                      {isActive ? 'Running...' : `Run test ${idx + 1}`}
                    </button>
                  </summary>
                  <div className="border-t border-zinc-800 px-4 pb-4 pt-3 text-xs text-zinc-400">
                    <p className="text-[10px] text-zinc-500">
                      <span className="font-semibold text-zinc-400">Agent:</span> {step.agent} ·{' '}
                      <span className="font-semibold text-zinc-400">Protocol:</span> {step.protocol} ·{' '}
                      <span className="font-semibold text-zinc-400">Mongo:</span> {step.evidenceMongo}
                    </p>
                    <p className="mt-2"><span className="font-semibold text-zinc-300">Purpose:</span> {step.purpose}</p>
                    <p className="mt-2"><span className="font-semibold text-zinc-300">Expected flow:</span> {step.expectedFlow}</p>
                    <p className="mt-2"><span className="font-semibold text-emerald-400/90">PASS:</span> {step.passCriteria}</p>
                    {state?.detail ? (
                      <p className="mt-2 font-mono text-[10px] text-zinc-500">Result: {state.detail}</p>
                    ) : null}
                  </div>
                </details>
              );
            })}
          </div>
        </section>

        {/* Routing + cloud burst */}
        <div className="grid gap-4 lg:grid-cols-3">
          <label className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-xs">
            <span className="font-semibold text-zinc-200">Model selector (read-only policy view)</span>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-white"
            >
              {MODEL_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label} [{modelOptionReadiness(o.id, routes)}]
                </option>
              ))}
            </select>
            <div className="mt-2">
              <ReadinessPill state={modelOptionReadiness(selectedModel, routes)} />
              {selectedModel === 'functiongemma' ? (
                <p className="mt-2 text-[10px] text-rose-300/90">{functionGemmaTruthNote()}</p>
              ) : null}
            </div>
          </label>

          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs">
            <div className="font-semibold text-amber-100">{JUDGE_CLOUD_BURST_NOTE.title}</div>
            {mi325x ? (
              <div
                className={`mt-2 rounded border p-2 text-[10px] ${
                  mi325x.status === 'DESTROYED'
                    ? 'border-rose-500/30 bg-rose-500/5 text-rose-100'
                    : 'border-emerald-500/30 bg-emerald-500/5 text-emerald-100'
                }`}
              >
                Droplet <span className="font-mono">{mi325x.dropletId}</span> · {mi325x.gpu} · {mi325x.region} ·{' '}
                {mi325x.status}
              </div>
            ) : (
              <p className="mt-2 text-[10px] text-rose-300/90">{mi325xBurstTruthNote()}</p>
            )}
            <p className="mt-2 text-zinc-400">{JUDGE_CLOUD_BURST_NOTE.preflight}</p>
            <p className="mt-2 text-zinc-500">{JUDGE_CLOUD_BURST_NOTE.deploy}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <ReadinessPill
                state={
                  mi325x?.status === 'DESTROYED' || !mi325x
                    ? 'NOT_READY'
                    : cloudBurstRoute
                      ? inferRouteReadiness(cloudBurstRoute)
                      : 'NOT_READY'
                }
              />
              <span className="text-zinc-500">{cloudBurstRoute?.selected_model || 'mi325x-vllm-explicit-burst'}</span>
            </div>
            <button
              type="button"
              disabled={!!actionBusy || snapshot?.backend !== 'live'}
              onClick={() => runAction('mi325x_preflight', {}, 'preflight')}
              className="mt-3 inline-flex items-center gap-1 rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-100 hover:bg-amber-500/20 disabled:opacity-40"
            >
              <Zap className="h-3 w-3" />
              Run preflight (dry-run only)
            </button>
            <button
              type="button"
              disabled={!!actionBusy || snapshot?.backend !== 'live'}
              onClick={() => runAction('gemma_probe', {}, 'gemma')}
              className="mt-2 inline-flex items-center gap-1 rounded border border-blue-500/40 bg-blue-500/10 px-2 py-1 text-[10px] text-blue-100 hover:bg-blue-500/20 disabled:opacity-40"
            >
              Gemma route probe (honest NOT_RUNNING if undeployed)
            </button>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-xs text-zinc-400">
            <div className="font-semibold text-zinc-200">Routing policy</div>
            <p className="mt-2">local_first: {String(snapshot?.modelRouting?.local_first ?? true)}</p>
            <p>{routes.length} routes from MCP judge_model_routing_policy</p>
          </div>
        </div>

        {actionResult ? (
          <pre className="max-h-36 overflow-auto rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-[10px] text-zinc-400">
            {actionResult}
          </pre>
        ) : null}

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {[
            { icon: Activity, label: 'Events', value: kpis.total },
            { icon: CheckCircle2, label: 'Verified', value: kpis.verified },
            { icon: CheckCircle2, label: 'Pass rate', value: `${kpis.passRate}%` },
            { icon: Cpu, label: 'Local', value: kpis.local },
            { icon: Cloud, label: 'Cloud', value: kpis.cloud },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
              <Icon className="mb-2 h-4 w-4 text-violet-400" />
              <div className="text-2xl font-bold text-white">{value}</div>
              <div className="text-xs text-zinc-500">{label}</div>
            </div>
          ))}
        </div>

        {/* Model routing table */}
        {routes.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/70">
            <div className="border-b border-zinc-800 px-4 py-3 text-sm font-semibold text-white">Model routing (MCP truth table)</div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-xs">
                <thead className="bg-zinc-900/80 text-[10px] uppercase text-zinc-500">
                  <tr>
                    <th className="px-3 py-2">Task</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Model</th>
                    <th className="px-3 py-2">Runtime</th>
                    <th className="px-3 py-2">Provider</th>
                    <th className="px-3 py-2">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {routes.map((r) => (
                    <tr key={r.task_class} className="border-b border-zinc-800/80 text-zinc-300">
                      <td className="px-3 py-2 font-mono">{r.task_class}</td>
                      <td className="px-3 py-2">
                        <ReadinessPill state={inferRouteReadiness(r)} />
                      </td>
                      <td className="px-3 py-2">{r.selected_model}</td>
                      <td className="px-3 py-2">{r.runtime}</td>
                      <td className="px-3 py-2">{r.provider_id || '—'}</td>
                      <td className="px-3 py-2 text-zinc-500">{String(r.reason || '').slice(0, 80)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Legacy detail table removed — Global Live Trace is sticky above */}
      </div>
    </JudgeShell>
  );
}
