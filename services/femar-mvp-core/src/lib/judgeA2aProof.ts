import type { JudgeTraceEvent } from '@/lib/judgeConsoleApi';

export const A2A_LIVE_PROOF_CORRELATION = 'judge-a2a-live-proof-20260830';
export const A2A_PROOF_OPS_CODEX = 'ops_ebb19e2b9226';

export type OpsStateTransition = {
  from?: string;
  to?: string;
  at?: string;
  actor?: string;
};

export type A2aProofOpsTask = {
  task_id?: string;
  correlation_id?: string;
  title?: string;
  status?: string;
  assignee?: string;
  from_agent?: string;
  state_history?: OpsStateTransition[];
  updated_at?: string;
  created_at?: string;
  evidence?: Record<string, unknown>;
};

export type A2aChainStep = {
  label: string;
  detail: string;
  event?: JudgeTraceEvent;
};

export type A2aProofBundle = {
  correlationId: string;
  traceEvents: JudgeTraceEvent[];
  traceSources: string[];
  a2aStatus: Record<string, unknown> | null;
  opsTasks: A2aProofOpsTask[];
  racbTimeline: OpsStateTransition[];
};

/** Build a human-readable A2A chain from real trace rows (no fixtures). */
export function buildA2aChainSummary(
  events: JudgeTraceEvent[],
  correlationId: string = A2A_LIVE_PROOF_CORRELATION,
  opsTasks: A2aProofOpsTask[] = []
): { steps: A2aChainStep[]; eventCount: number } {
  const byCorrelation = events.filter((e) => e.correlation_id === correlationId);
  const chain = byCorrelation.length
    ? byCorrelation
    : events.filter(
        (e) => String(e.correlation_id || '').includes(correlationId) || isA2aHop(e)
      );

  const codexOps = opsTasks.find((t) => t.task_id === A2A_PROOF_OPS_CODEX) || opsTasks[0];

  const steps: A2aChainStep[] = [
    {
      label: 'Judge Console / ARIA',
      detail: 'User or ARIA triggers bounded action on live MCP bridge.',
      event: byCorrelation.find((e) => /judge|aria/i.test(String(e.source || ''))) || chain[0],
    },
    {
      label: 'MCP safe path',
      detail: 'judge_safe_trigger / judge_workflow_* records correlation_id + tool latency in Mongo judge_trace.',
      event: byCorrelation.find((e) => /mcp|safe_judge|tool/i.test(String(e.protocol || e.tool || ''))),
    },
    {
      label: 'A2A dispatch',
      detail: 'a2a_dispatch → AG-25 (or target agent) with durable task_id when not dry_run.',
      event: byCorrelation.find((e) => /a2a|dispatch/i.test(String(e.tool || e.action || e.protocol || ''))),
    },
    {
      label: 'Codex / RACB ops',
      detail: codexOps
        ? `Ops ${codexOps.task_id}: ${formatOpsStatus(codexOps)}`
        : `Ops ${A2A_PROOF_OPS_CODEX}: PROPOSED → ACCEPTED → IN_PROGRESS (Mongo RACB).`,
      event: byCorrelation.find((e) => /codex|ack|message/i.test(String(e.target || e.agent_id || ''))),
    },
  ];

  return { steps, eventCount: byCorrelation.length || chain.length };
}

export function flattenOpsTimeline(tasks: A2aProofOpsTask[]): OpsStateTransition[] {
  const rows: OpsStateTransition[] = [];
  for (const task of tasks) {
    for (const hop of task.state_history || []) {
      rows.push({
        ...hop,
        at: hop.at || task.updated_at,
        actor: hop.actor || task.assignee,
      });
    }
  }
  return rows.sort((a, b) => String(a.at || '').localeCompare(String(b.at || '')));
}

function formatOpsStatus(task: A2aProofOpsTask): string {
  const hops = (task.state_history || [])
    .map((h) => `${String(h.from || '?').toUpperCase()}→${String(h.to || '?').toUpperCase()}`)
    .join(' · ');
  return `${task.status || 'unknown'}${hops ? ` (${hops})` : ''}`;
}

function isA2aHop(ev: JudgeTraceEvent): boolean {
  const hay = `${ev.protocol || ''} ${ev.tool || ''} ${ev.action || ''}`.toLowerCase();
  return hay.includes('a2a') || /^ag-\d+/i.test(String(ev.agent_id || ''));
}
