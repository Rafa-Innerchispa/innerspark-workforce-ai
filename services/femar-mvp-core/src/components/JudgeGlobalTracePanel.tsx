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
  return new Date(ms).toLocaleString('en-US', { hour12: false });
}

function fmtLatency(ms?: number): string {
  if (ms === undefined || ms === null || Number.isNaN(ms)) return '—';
  return `${ms} ms`;
}

function EventRow({ event }: { event: JudgeTraceEvent }) {
  const flags = [event.simulated ? 'SIM' : null, event.degraded ? 'DEG' : null, event.verified ? 'VER' : null]
    .filter(Boolean)
    .join(' ');
  const mongoSource = event.source_collection || (
    String(event.source || '').includes('agent_activity') || String(event.protocol || '').includes('agent_activity')
      ? 'agent_activity'
      : 'judge_trace'
  );
  return (
    <tr className="border-b border-zinc-800/80 text-[10px] text-zinc-300">
      <td className="px-2 py-1.5 font-mono">{event.status || '—'}</td>
      <td className={`px-2 py-1.5 ${event.verified ? 'text-emerald-400' : 'text-zinc-400'}`}>{flags || '·'}</td>
      <td className="px-2 py-1.5 font-mono text-zinc-500">{mongoSource}</td>
      <td className="px-2 py-1.5 font-mono text-zinc-500">{event.source_kind || '—'}</td>
      <td className="px-2 py-1.5 font-mono">{event.correlation_id?.slice(-10) || '—'}</td>
      <td className="px-2 py-1.5 font-mono">{event.event_type || '—'}</td>
      <td className="px-2 py-1.5">{event.source || '—'} → {event.target || '—'}</td>
      <td className="px-2 py-1.5">{event.protocol || '—'}</td>
      <td className="px-2 py-1.5">{event.agent_id || event.task_id || event.a2a_task_id || '—'}</td>
      <td className="px-2 py-1.5">{event.tool || event.action || '—'}</td>
      <td className="px-2 py-1.5 font-mono text-zinc-500">{event.message_id || '—'}</td>
      <td className="px-2 py-1.5 font-mono text-violet-300/80">{event.evidence_ref || '—'}</td>
      <td className="px-2 py-1.5">{event.model || '—'}</td>
      <td className="px-2 py-1.5">{event.provider || '—'}</td>
      <td className="px-2 py-1.5">{event.latency_ms != null ? fmtLatency(event.latency_ms) : '—'}</td>
      <td className="px-2 py-1.5 whitespace-nowrap">{fmtTime(event.ts_start_ms)}</td>
    </tr>
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
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-emerald-500/30 bg-zinc-950/95 shadow-lg shadow-black/40 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 px-3 py-2">
        <div>
          <h2 className="text-sm font-semibold text-white">Global Live Trace</h2>
          <p className="text-[10px] text-zinc-500">
            Persisted backend records only · judge_trace + A2A/ops activity · auto-poll 4s
            {stale ? ' · showing last good snapshot (reconnecting)' : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          {(Object.keys(TRACE_FILTER_LABELS) as TraceFilterId[]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => onFilterChange(id)}
              className={`rounded px-2 py-1 text-[10px] font-medium ${
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
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800/80 px-3 py-2 text-[10px] text-zinc-400">
        <span>Active correlation:</span>
        <input
          value={activeCorrelationId || ''}
          onChange={(e) => onCorrelationChange(e.target.value)}
          placeholder="paste correlation_id"
          className="min-w-[180px] flex-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 font-mono text-[10px] text-white"
        />
        <span>{filtered.length}/{events.length} events · MCP sources: {sources.join(', ') || '—'} · fields: {fields.slice(0, 8).join(', ')}</span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto overflow-x-auto">
        <table className="w-full min-w-[1500px] text-left">
          <thead className="sticky top-0 bg-zinc-900/95 text-[10px] uppercase text-zinc-500">
            <tr>
              {['Status', 'Flags', 'Collection', 'Kind', 'Corr', 'Event', 'Route', 'Protocol', 'Agent/Task', 'Tool', 'Message', 'Evidence', 'Model', 'Provider', 'ms', 'Time'].map((h) => (
                <th key={h} className="px-2 py-1.5">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={16} className="px-4 py-6 text-center text-xs text-zinc-500">
                  {loading ? 'Loading global trace…' : 'No events for this filter — trigger any InnerOS action externally'}
                </td>
              </tr>
            ) : (
              filtered.map((ev, i) => <EventRow key={`${ev.run_id}-${ev.correlation_id}-${i}`} event={ev} />)
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
