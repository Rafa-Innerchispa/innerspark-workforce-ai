'use client';

import React from 'react';
import type { JudgeTraceEvent } from '@/lib/judgeConsoleApi';
import {
  TRACE_FILTER_LABELS,
  filterTraceEvents,
  type TraceFilterId,
} from '@/lib/judgeGlobalTrace';
import { traceFieldMatrix } from '@/lib/judgeVisualAudit';

type JudgeGlobalTracePanelProps = {
  events: JudgeTraceEvent[];
  filter: TraceFilterId;
  activeCorrelationId: string | null;
  sources: string[];
  loading?: boolean;
  stale?: boolean;
  onFilterChange: (filter: TraceFilterId) => void;
  onCorrelationChange: (id: string) => void;
};

function fmtTime(ms?: number): string {
  if (!ms) return '—';
  return new Date(ms).toLocaleTimeString('en-US', { hour12: false });
}

function value(v?: string | number | null): string {
  if (v === undefined || v === null || v === '') return '—';
  return String(v);
}

function statusClass(status?: string) {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'LIVE' || normalized === 'PASS' || normalized === 'COMPLETED' || normalized === 'SUCCESS') {
    return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200';
  }
  if (normalized === 'RUNNING' || normalized === 'ACCEPTED' || normalized === 'SUBMITTED') {
    return 'border-blue-500/40 bg-blue-500/10 text-blue-200';
  }
  if (normalized === 'ERROR' || normalized === 'FAIL' || normalized === 'FAILED' || normalized === 'TIMEOUT') {
    return 'border-red-500/40 bg-red-500/10 text-red-200';
  }
  return 'border-amber-500/30 bg-amber-500/10 text-amber-100';
}

function Field({ label, children, mono = false }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <span className="text-[9px] font-semibold uppercase tracking-wide text-zinc-600">{label}</span>
      <div className={`${mono ? 'font-mono' : ''} break-all text-[10px] leading-4 text-zinc-300`}>{children}</div>
    </div>
  );
}

function EventCard({ event }: { event: JudgeTraceEvent }) {
  const flags = [event.verified ? 'VERIFIED' : null, event.simulated ? 'SIMULATED' : null, event.degraded ? 'DEGRADED' : null]
    .filter(Boolean)
    .join(' · ');
  const collection = event.source_collection ||
    (String(event.source || '').includes('agent_activity') || String(event.protocol || '').includes('agent_activity')
      ? 'agent_activity'
      : 'judge_trace');

  return (
    <article className="rounded-lg border border-zinc-800 bg-zinc-900/55 p-2.5 shadow-sm shadow-black/20">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[10px] text-zinc-500">{fmtTime(event.ts_start_ms)}</span>
            <span className="text-[11px] font-semibold text-white">{value(event.event_type)}</span>
            {flags ? <span className="text-[9px] text-emerald-400/80">{flags}</span> : null}
          </div>
          <div className="mt-1 break-all font-mono text-[9px] text-violet-300">corr: {value(event.correlation_id)}</div>
        </div>
        <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-bold ${statusClass(event.status)}`}>
          {value(event.status)}
        </span>
      </div>

      <div className="grid gap-x-3 gap-y-2 sm:grid-cols-2">
        <Field label="Connection">{value(event.source)} → {value(event.target)}</Field>
        <Field label="Protocol">{value(event.protocol)}</Field>
        <Field label="Provider / Model">{value(event.provider)} · {value(event.model)}</Field>
        <Field label="Runtime / Node">{value(event.runtime)} · {value(event.node)}</Field>
        <Field label="Agent" mono>{value(event.agent_id)}</Field>
        <Field label="Task / A2A" mono>{value(event.task_id)} · {value(event.a2a_task_id)}</Field>
        <Field label="Message" mono>{value(event.message_id)}</Field>
        <Field label="Tool / Action" mono>{value(event.tool)} · {value(event.action)}</Field>
        <Field label="Latency">{event.latency_ms == null ? '—' : `${event.latency_ms} ms`}</Field>
        <Field label="Persistence">{collection} · {value(event.source_kind)}</Field>
      </div>

      <div className="mt-2 border-t border-zinc-800/80 pt-2">
        <Field label="Evidence ref" mono>{value(event.evidence_ref || event.artifact_id)}</Field>
        {event.error ? <div className="mt-1 break-all text-[9px] text-red-300">error: {event.error}</div> : null}
      </div>
    </article>
  );
}

export default function JudgeGlobalTracePanel({
  events,
  filter,
  activeCorrelationId,
  sources,
  loading,
  stale,
  onFilterChange,
  onCorrelationChange,
}: JudgeGlobalTracePanelProps) {
  const filtered = filterTraceEvents(events, filter, activeCorrelationId);
  const fields = traceFieldMatrix(filtered);

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-emerald-500/30 bg-zinc-950/95 shadow-lg shadow-black/40 backdrop-blur">
      <div className="shrink-0 border-b border-zinc-800 px-3 py-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-white">Global Live Trace</h2>
            <p className="text-[10px] text-zinc-500">
              Real persisted connections only · judge_trace + agent_activity · poll 4s
              {stale ? ' · last good snapshot preserved while reconnecting' : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-1">
            {(Object.keys(TRACE_FILTER_LABELS) as TraceFilterId[]).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => onFilterChange(id)}
                className={`rounded px-2 py-1 text-[9px] font-medium ${
                  filter === id
                    ? 'bg-emerald-600/30 text-emerald-100 ring-1 ring-emerald-500/40'
                    : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {TRACE_FILTER_LABELS[id]}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-2 flex items-center gap-2">
          <span className="shrink-0 text-[9px] text-zinc-500">Correlation</span>
          <input
            value={activeCorrelationId || ''}
            onChange={(e) => onCorrelationChange(e.target.value)}
            placeholder="correlation_id"
            className="min-w-0 flex-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 font-mono text-[9px] text-white"
          />
        </div>
        <div className="mt-1 text-[9px] text-zinc-600">
          {filtered.length}/{events.length} events · sources: {sources.join(', ') || '—'} · fields detected: {fields.length}
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain p-2">
        {filtered.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-zinc-800 px-4 text-center text-xs text-zinc-500">
            {loading ? 'Loading real trace…' : 'No persisted events for this filter. Run one Judge action or send ARIA a command.'}
          </div>
        ) : (
          filtered.slice().reverse().map((event, index) => (
            <EventCard key={`${event.run_id || 'run'}-${event.correlation_id || 'corr'}-${event.event_type || 'event'}-${index}`} event={event} />
          ))
        )}
      </div>
    </section>
  );
}
