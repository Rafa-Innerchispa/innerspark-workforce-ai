'use client';

import React, { useMemo, useState } from 'react';
import type { JudgeTraceEvent } from '@/lib/judgeConsoleApi';
import {
  TRACE_FILTER_LABELS,
  filterTraceEvents,
  type TraceFilterId,
} from '@/lib/judgeGlobalTrace';
import {
  displayField,
  formatTraceTime,
  groupTraceEventsByRun,
  humanEventLabel,
  type TraceRunGroup,
} from '@/lib/judgeTracePresentation';

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

function TimelineEvent({ event, meta }: { event: JudgeTraceEvent; meta: TraceRunGroup }) {
  const [open, setOpen] = useState(false);
  const label = humanEventLabel(event, meta);
  const fields = [
    displayField('Protocol', event.protocol),
    displayField('Connection', event.source && event.target ? `${event.source} → ${event.target}` : undefined),
    displayField('Provider / Model', [event.provider, event.model].filter(Boolean).join(' · ') || undefined),
    displayField('Runtime / Node', [event.runtime, event.node].filter(Boolean).join(' · ') || undefined),
    displayField('Agent', event.agent_id),
    displayField('Task / A2A', [event.task_id, event.a2a_task_id].filter(Boolean).join(' · ') || undefined),
    displayField('Message', event.message_id),
    displayField('Tool / Action', [event.tool, event.action].filter(Boolean).join(' · ') || undefined),
    displayField('Latency', event.latency_ms == null ? undefined : `${event.latency_ms} ms`),
    displayField('Evidence', event.evidence_ref || event.artifact_id),
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <li className="rounded-lg border border-zinc-800/90 bg-zinc-900/40 p-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold text-white">{label}</div>
          <div className="mt-0.5 text-[10px] text-zinc-500">{formatTraceTime(event.ts_start_ms)}</div>
        </div>
        <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-bold ${statusClass(event.status)}`}>
          {event.status || 'EVENT'}
        </span>
      </div>
      {fields.length ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-2 text-[9px] font-medium text-violet-300 hover:text-violet-200"
        >
          {open ? 'Hide technical details' : 'Show technical details'}
        </button>
      ) : null}
      {open ? (
        <div className="mt-2 grid gap-1 border-t border-zinc-800/80 pt-2 sm:grid-cols-2">
          <div className="sm:col-span-2 font-mono text-[9px] text-zinc-500">event_type: {event.event_type || 'unknown'}</div>
          {fields.map((field) => (
            <div key={field.label}>
              <div className="text-[9px] uppercase tracking-wide text-zinc-600">{field.label}</div>
              <div className="break-all text-[10px] text-zinc-300">{field.value}</div>
            </div>
          ))}
          {event.error ? <div className="sm:col-span-2 text-[9px] text-red-300">error: {event.error}</div> : null}
        </div>
      ) : null}
    </li>
  );
}

function currentRunSummary(group: TraceRunGroup): string {
  const running = group.events.find((event) => String(event.status || '').toUpperCase() === 'RUNNING');
  if (running) return humanEventLabel(running, group);
  const latest = group.events[group.events.length - 1];
  return latest ? humanEventLabel(latest, group) : 'Waiting for persisted trace events…';
}

function RunGroupCard({ group, defaultOpen }: { group: TraceRunGroup; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const durationMs =
    group.startedAt && group.endedAt && group.endedAt >= group.startedAt
      ? group.endedAt - group.startedAt
      : undefined;
  const title =
    group.testNumber != null
      ? `Test ${group.testNumber} — ${group.testTitle || 'Judge proof'}`
      : group.testTitle || 'Judge activity';

  return (
    <section className={`rounded-xl border ${group.isCurrent ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-zinc-800 bg-zinc-950/60'} p-3`}>
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-start justify-between gap-3 text-left">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-white">{title}</h3>
            {group.isCurrent ? (
              <span className="rounded bg-emerald-600/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-200">CURRENT RUN</span>
            ) : null}
            <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold ${statusClass(group.terminalStatus || 'RUNNING')}`}>
              {group.terminalStatus || 'RUNNING'}
            </span>
          </div>
          {group.purpose ? <p className="mt-1 text-[10px] leading-4 text-zinc-400">{group.purpose}</p> : null}
          <p className="mt-2 rounded-lg border border-blue-500/20 bg-blue-500/5 px-2 py-1.5 text-[10px] text-blue-100">
            <span className="font-semibold">What is happening now:</span> {currentRunSummary(group)}
          </p>
          <div className="mt-2 flex flex-wrap gap-3 text-[9px] text-zinc-500">
            <span>Started {formatTraceTime(group.startedAt)}</span>
            {durationMs != null ? <span>Duration {durationMs} ms</span> : null}
            <span>{group.events.length} events</span>
          </div>
          <div className="mt-1 break-all font-mono text-[9px] text-violet-300/80">{group.correlationId}</div>
        </div>
        <span className="shrink-0 text-[10px] text-zinc-500">{open ? '▾' : '▸'}</span>
      </button>
      {open ? (
        <ol className="mt-3 space-y-2 border-t border-zinc-800/80 pt-3">
          {group.events.map((event, index) => (
            <TimelineEvent key={`${group.correlationId}-${event.event_type}-${index}`} event={event} meta={group} />
          ))}
        </ol>
      ) : null}
    </section>
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
  const [showAdvanced, setShowAdvanced] = useState(false);
  const filtered = filterTraceEvents(events, filter, activeCorrelationId);
  const groups = useMemo(
    () => groupTraceEventsByRun(filtered, activeCorrelationId),
    [filtered, activeCorrelationId]
  );
  const currentGroups = groups.filter((g) => g.isCurrent);
  const previousGroups = groups.filter((g) => !g.isCurrent);

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-emerald-500/30 bg-zinc-950/95 shadow-lg shadow-black/40 backdrop-blur">
      <div className="shrink-0 border-b border-zinc-800 px-3 py-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-white">Global Live Trace</h2>
            <p className="text-[10px] text-zinc-500">
              Grouped by test run · human timeline first · persisted MCP truth
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

        <div className="mt-2 text-[9px] text-zinc-600">
          {filtered.length}/{events.length} events · {groups.length} runs · sources: {sources.join(', ') || 'pending'}
        </div>

        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="mt-2 text-[9px] font-medium text-zinc-500 hover:text-zinc-300"
        >
          {showAdvanced ? 'Hide advanced correlation filter' : 'Advanced correlation filter'}
        </button>
        {showAdvanced ? (
          <div className="mt-2 flex items-center gap-2">
            <span className="shrink-0 text-[9px] text-zinc-500">Correlation</span>
            <input
              value={activeCorrelationId || ''}
              onChange={(e) => onCorrelationChange(e.target.value)}
              placeholder="correlation_id"
              className="min-w-0 flex-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 font-mono text-[9px] text-white"
            />
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-2">
        {groups.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-zinc-800 px-4 text-center text-xs text-zinc-500">
            {loading
              ? 'Loading real trace…'
              : activeCorrelationId
                ? 'Starting test… waiting for persisted trace events.'
                : 'Run a Judge test to see the current execution chain here.'}
          </div>
        ) : (
          <>
            {currentGroups.map((group) => (
              <RunGroupCard key={group.correlationId} group={group} defaultOpen />
            ))}
            {previousGroups.length ? (
              <div className="space-y-2">
                <div className="px-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Previous runs</div>
                {previousGroups.map((group) => (
                  <RunGroupCard key={group.correlationId} group={group} defaultOpen={false} />
                ))}
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
