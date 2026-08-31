import type { JudgeTraceEvent } from '@/lib/judgeConsoleApi';
import type { McpBridgeResult } from '@/lib/ralfiaMcpBridge';

export type TraceFilterId =
  | 'current_run'
  | 'all'
  | 'a2a'
  | 'a2a_proof'
  | 'models'
  | 'tools'
  | 'cloud'
  | 'agents';

export const TRACE_FILTER_LABELS: Record<TraceFilterId, string> = {
  current_run: 'Current Run',
  all: 'All',
  a2a: 'A2A',
  a2a_proof: 'A2A Live Proof',
  models: 'Models',
  tools: 'Tools',
  cloud: 'Cloud',
  agents: 'Agents',
};

export const A2A_LIVE_PROOF_CORRELATION = 'judge-a2a-live-proof-20260830';

function eventKey(ev: JudgeTraceEvent): string {
  return [
    ev.correlation_id || '',
    ev.run_id || '',
    String(ev.ts_start_ms || ''),
    ev.tool || ev.action || '',
    ev.source || '',
  ].join('|');
}

function parseMs(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const s = String(value || '').trim();
  if (!s) return undefined;
  const n = Date.parse(s);
  return Number.isNaN(n) ? undefined : n;
}

/** Normalize agent_activity rows into trace shape (global InnerOS monitor). */
export function agentActivityToTrace(item: Record<string, unknown>): JudgeTraceEvent {
  const finished = parseMs(item.finished_at || item.updated_at || item.created_at);
  return {
    correlation_id: String(item.correlation_id || item.task_id || item.ops_task_id || item.run_id || ''),
    run_id: String(item.run_id || item._id || ''),
    event_type: String(item.event_type || item.action || item.status || 'agent_activity'),
    message_id: item.message_id ? String(item.message_id) : undefined,
    task_id: item.ops_task_id ? String(item.ops_task_id) : item.task_id ? String(item.task_id) : undefined,
    a2a_task_id: item.a2a_task_id ? String(item.a2a_task_id) : undefined,
    source_collection: String(item.source_collection || 'ralfia_agent_activity'),
    source_kind: String(item.source_kind || 'live_activity'),
    ts_start_ms: finished,
    source: String(item.agent || item.source || 'agent_activity'),
    target: String(item.target || item.mailbox || 'inneros'),
    protocol: String(item.protocol || 'agent_activity'),
    agent_id: String(item.agent || item.agent_id || ''),
    tool: String(item.tool || item.action || ''),
    action: String(item.action || ''),
    model: item.model ? String(item.model) : undefined,
    provider: item.provider ? String(item.provider) : undefined,
    runtime: item.runtime ? String(item.runtime) : undefined,
    latency_ms: typeof item.latency_ms === 'number' ? item.latency_ms : undefined,
    status: String(item.status || item.result || 'OK').toUpperCase(),
    verified: item.verified === true,
    simulated: item.simulated === true,
    degraded: item.degraded === true,
    evidence_ref: item.evidence_ref ? String(item.evidence_ref) : undefined,
    error: item.error ? String(item.error).slice(0, 160) : undefined,
  };
}

export function mergeTraceEvents(...groups: JudgeTraceEvent[][]): JudgeTraceEvent[] {
  const map = new Map<string, JudgeTraceEvent>();
  for (const group of groups) {
    for (const ev of group) {
      map.set(eventKey(ev), ev);
    }
  }
  return [...map.values()].sort((a, b) => (b.ts_start_ms || 0) - (a.ts_start_ms || 0));
}

function isA2a(ev: JudgeTraceEvent): boolean {
  const hay = [
    ev.protocol,
    ev.tool,
    ev.action,
    ev.source,
    ev.target,
    ev.agent_id,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return hay.includes('a2a') || /^ag-\d+/i.test(String(ev.agent_id || ''));
}

function isModel(ev: JudgeTraceEvent): boolean {
  return Boolean(ev.model || ev.provider || /gemini|gemma|qwen|ollama|vertex|google/i.test(String(ev.runtime || '')));
}

function isTool(ev: JudgeTraceEvent): boolean {
  const p = String(ev.protocol || '').toLowerCase();
  return Boolean(ev.tool) && (p.includes('mcp') || p.includes('tool') || p.includes('module') || p.includes('judge_test'));
}

function isCloud(ev: JudgeTraceEvent): boolean {
  const p = String(ev.provider || '').toLowerCase();
  const r = String(ev.runtime || '').toLowerCase();
  return (
    p.includes('digitalocean') ||
    p.includes('gcp') ||
    p.includes('google') ||
    p.includes('cloud') ||
    r.includes('cloud') ||
    r.includes('vertex') ||
    r.includes('ephemeral')
  );
}

function isAgent(ev: JudgeTraceEvent): boolean {
  return Boolean(ev.agent_id);
}

export function filterTraceEvents(
  events: JudgeTraceEvent[],
  filter: TraceFilterId,
  activeCorrelationId?: string | null
): JudgeTraceEvent[] {
  if (filter === 'current_run' && activeCorrelationId) {
    return events.filter((e) => e.correlation_id === activeCorrelationId);
  }
  if (filter === 'all' || (filter === 'current_run' && !activeCorrelationId)) {
    return events;
  }
  if (filter === 'a2a') return events.filter(isA2a);
  if (filter === 'a2a_proof') {
    return events.filter(
      (e) =>
        e.correlation_id === A2A_LIVE_PROOF_CORRELATION ||
        (isA2a(e) && String(e.correlation_id || '').includes('judge-a2a-live-proof'))
    );
  }
  if (filter === 'models') return events.filter(isModel);
  if (filter === 'tools') return events.filter(isTool);
  if (filter === 'cloud') return events.filter(isCloud);
  if (filter === 'agents') return events.filter(isAgent);
  return events;
}

export function defaultTraceFilter(activeCorrelationId?: string | null): TraceFilterId {
  return activeCorrelationId ? 'current_run' : 'all';
}

export function extractTraceEvents(res: McpBridgeResult): JudgeTraceEvent[] {
  const raw = (res.events as JudgeTraceEvent[] | undefined) || [];
  return raw.filter((e) => e && typeof e === 'object');
}

export function extractActivityItems(res: McpBridgeResult): Record<string, unknown>[] {
  const items = res.items;
  return Array.isArray(items) ? (items as Record<string, unknown>[]) : [];
}

export function pickActiveCorrelationId(
  events: JudgeTraceEvent[],
  preferred?: string | null
): string | null {
  if (preferred?.trim()) return preferred.trim();
  return events.find((e) => e.correlation_id)?.correlation_id || null;
}

export function findMi325xDroplet(resourceFabric: Record<string, unknown> | null | undefined): {
  dropletId?: string;
  provider?: string;
  gpu?: string;
  region?: string;
  status?: string;
} | null {
  if (!resourceFabric) return null;
  const text = JSON.stringify(resourceFabric);
  const dropletMatch = text.match(/596444112|"droplet_id"\s*:\s*"?596444112"?/);
  if (!dropletMatch) return null;
  const destroyed =
    text.includes('destroy') ||
    text.includes('DESTROYED') ||
    /"count"\s*:\s*0/.test(text) ||
    !text.includes('ACTIVE');
  return {
    dropletId: '596444112',
    provider: 'digitalocean-amd-cloud',
    gpu: 'AMD Instinct MI325X (256GB)',
    region: 'tor1',
    status: destroyed ? 'DESTROYED' : text.includes('preserv') ? 'PRESERVED' : 'ACTIVE',
  };
}
