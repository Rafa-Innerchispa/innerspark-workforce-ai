'use client';

import React, { useState } from 'react';
import { Link2, RefreshCw } from 'lucide-react';
import type { JudgeTraceEvent } from '@/lib/judgeConsoleApi';
import {
  A2A_LIVE_PROOF_CORRELATION,
  A2A_PROOF_OPS_CODEX,
  buildA2aChainSummary,
  type A2aProofBundle,
  type OpsStateTransition,
} from '@/lib/judgeA2aProof';

type JudgeA2aProofPanelProps = {
  events: JudgeTraceEvent[];
  loading?: boolean;
  onLoadProof: (bundle: A2aProofBundle) => void;
  onFocusCorrelation: (correlationId: string) => void;
};

function fmtTs(raw?: string): string {
  if (!raw) return '—';
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? raw.slice(0, 19) : d.toLocaleString('en-US', { hour12: false });
}

export default function JudgeA2aProofPanel({
  events,
  loading,
  onLoadProof,
  onFocusCorrelation,
}: JudgeA2aProofPanelProps) {
  const [bundle, setBundle] = useState<A2aProofBundle | null>(null);
  const [localLoading, setLocalLoading] = useState(false);
  const [error, setError] = useState('');

  const mergedEvents = bundle?.traceEvents?.length ? bundle.traceEvents : events;
  const { steps, eventCount } = buildA2aChainSummary(
    mergedEvents,
    A2A_LIVE_PROOF_CORRELATION,
    bundle?.opsTasks || []
  );

  const loadProof = async () => {
    setLocalLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams({
        mode: 'a2a_proof',
        correlation_id: A2A_LIVE_PROOF_CORRELATION,
      });
      const res = await fetch(`/api/ecosystem/judge?${qs}`);
      const data = (await res.json()) as A2aProofBundle & { ok?: boolean; error?: string };
      if (!res.ok || data.ok === false) {
        setError(String(data.error || res.status));
        return;
      }
      setBundle(data);
      onFocusCorrelation(A2A_LIVE_PROOF_CORRELATION);
      onLoadProof(data);
    } catch (err) {
      setError(String(err));
    } finally {
      setLocalLoading(false);
    }
  };

  const busy = loading || localLoading;
  const a2aOnline = String(bundle?.a2aStatus?.state || bundle?.a2aStatus?.status || '').toLowerCase() === 'online';
  const agentCount = bundle?.a2aStatus?.agent_count ?? bundle?.a2aStatus?.cards;

  return (
    <section className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Proof: live agent handoff</h2>
          <p className="mt-1 text-[11px] text-zinc-400">
            Dispatch → accepted → running → result, from persisted Mongo/RACB records · correlation{' '}
            <span className="font-mono text-violet-200">{A2A_LIVE_PROOF_CORRELATION}</span> · ops{' '}
            <span className="font-mono text-violet-200">{A2A_PROOF_OPS_CODEX}</span>
          </p>
          {bundle?.a2aStatus ? (
            <p className="mt-1 text-[10px] text-emerald-300/90">
              Bridge: {a2aOnline ? 'online' : String(bundle.a2aStatus.state || 'unknown')} · protocol{' '}
              {String(bundle.a2aStatus.protocol_version || bundle.a2aStatus.protocol || '0.3.0-inneros')} · cards{' '}
              {String(agentCount ?? '—')}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={loadProof}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-violet-500/40 bg-violet-600/20 px-3 py-1.5 text-[11px] font-medium text-violet-100 hover:bg-violet-600/30 disabled:opacity-40"
        >
          {busy ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Link2 className="h-3 w-3" />}
          Load proof
        </button>
      </div>

      {(bundle?.racbTimeline?.length || 0) > 0 ? (
        <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">RACB state transitions</div>
          <ul className="mt-2 space-y-1">
            {bundle!.racbTimeline.map((hop: OpsStateTransition, i: number) => (
              <li key={`${hop.from}-${hop.to}-${i}`} className="font-mono text-[10px] text-zinc-300">
                {String(hop.from || '?').toUpperCase()} → {String(hop.to || '?').toUpperCase()}
                <span className="text-zinc-500"> · {hop.actor || '—'} · {fmtTs(hop.at)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <ol className="mt-4 space-y-2">
        {steps.map((step, i) => (
          <li
            key={step.label}
            className="flex gap-3 rounded-lg border border-zinc-800/80 bg-zinc-950/60 px-3 py-2 text-[11px]"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-600/30 text-[10px] font-bold text-violet-100">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-zinc-200">{step.label}</div>
              <p className="text-zinc-500">{step.detail}</p>
              {step.event ? (
                <p className="mt-1 font-mono text-[10px] text-emerald-400/90">
                  evidence: {step.event.status || '—'} · {step.event.tool || step.event.action || step.event.protocol || 'trace row'}
                  {step.event.evidence_ref ? ` · ref ${step.event.evidence_ref}` : ''}
                </p>
              ) : (
                <p className="mt-1 text-[10px] text-amber-400/80">No trace row yet — load proof or run step 7</p>
              )}
            </div>
          </li>
        ))}
      </ol>

      {error ? <p className="mt-2 text-[10px] text-rose-400">{error}</p> : null}
      <p className="mt-3 text-[10px] text-zinc-500">
        {eventCount} trace event(s) · {bundle?.opsTasks?.length || 0} ops task(s) · sources:{' '}
        {(bundle?.traceSources || []).join(', ') || '—'}
      </p>
    </section>
  );
}
