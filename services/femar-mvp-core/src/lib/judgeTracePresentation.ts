import type { JudgeTraceEvent } from '@/lib/judgeConsoleApi';
import { JUDGE_DEMO_STEPS } from '@/lib/judgeDemoSteps';

export type TraceRunGroup = {
  correlationId: string;
  testNumber?: number;
  testTitle?: string;
  purpose?: string;
  passCriteria?: string;
  events: JudgeTraceEvent[];
  startedAt?: number;
  endedAt?: number;
  terminalStatus?: string;
  isCurrent?: boolean;
};

function stepForAction(action?: string) {
  if (!action) return undefined;
  return JUDGE_DEMO_STEPS.find((s) => s.action === action || s.id === action);
}

function stepForCorrelation(correlationId: string) {
  const step = JUDGE_DEMO_STEPS.find((s) => correlationId.includes(`-${s.id}-`) || correlationId.endsWith(`-${s.id}`));
  if (step) return step;
  for (const demoStep of JUDGE_DEMO_STEPS) {
    if (correlationId.includes(demoStep.id)) return demoStep;
  }
  return undefined;
}

export function resolveRunMeta(events: JudgeTraceEvent[], correlationId: string) {
  const actionEvent = events.find((e) => e.action || e.tool);
  const step =
    stepForAction(actionEvent?.action || actionEvent?.tool) ||
    stepForCorrelation(correlationId);
  if (!step) {
    return {
      testNumber: undefined,
      testTitle: 'Judge activity',
      purpose: 'Live orchestration event captured from MCP and persisted trace.',
    };
  }
  const idx = JUDGE_DEMO_STEPS.indexOf(step);
  return {
    testNumber: idx >= 0 ? idx + 1 : undefined,
    testTitle: step.labelEn.replace(/^\d+\s·\s*/, ''),
    purpose: step.purpose,
    passCriteria: step.passCriteria,
  };
}

export function humanEventLabel(event: JudgeTraceEvent, meta?: { testNumber?: number; testTitle?: string }): string {
  const type = String(event.event_type || '').toLowerCase();
  const action = String(event.action || event.tool || '');
  const n = meta?.testNumber;
  const title = meta?.testTitle || 'Judge test';

  if (type === 'judge_test_start') {
    return n ? `Starting Test ${n} — ${title}` : `Starting — ${title}`;
  }
  if (type === 'judge_test_result') {
    const status = String(event.status || 'RESULT').toUpperCase();
    return n ? `Test ${n} completed (${status})` : `Run completed (${status})`;
  }
  if (action.includes('safe_trigger') || type.includes('safe_trigger')) {
    return 'Dispatching safe verification to Ralphi MCP';
  }
  if (action.includes('a2a_dispatch')) {
    return 'Submitting RACB dispatch to AG-25 (dry run)';
  }
  if (action.includes('a2a') || type.includes('a2a')) {
    return 'Checking A2A bridge and agent registry';
  }
  if (action.includes('gemma')) {
    return 'Reading FunctionGemma historical evidence';
  }
  if (action.includes('iskcon')) {
    return 'Generating ISKCON emergency PDF artifact';
  }
  if (action.includes('workflow')) {
    return 'Starting judge workflow through ARIA orchestrator';
  }
  if (type) {
    return type.replace(/_/g, ' ');
  }
  return 'Trace event';
}

export function terminalStatusForRun(events: JudgeTraceEvent[]): string | undefined {
  const result = events.find((e) => e.event_type === 'judge_test_result');
  if (result?.status) return String(result.status).toUpperCase();
  const last = events[events.length - 1];
  return last?.status ? String(last.status).toUpperCase() : undefined;
}

export function groupTraceEventsByRun(
  events: JudgeTraceEvent[],
  activeCorrelationId?: string | null
): TraceRunGroup[] {
  const buckets = new Map<string, JudgeTraceEvent[]>();
  for (const event of events) {
    const cid = String(event.correlation_id || 'unknown');
    const list = buckets.get(cid) || [];
    list.push(event);
    buckets.set(cid, list);
  }

  const groups: TraceRunGroup[] = [];
  for (const [correlationId, runEvents] of buckets.entries()) {
    const sorted = [...runEvents].sort((a, b) => (a.ts_start_ms || 0) - (b.ts_start_ms || 0));
    const meta = resolveRunMeta(sorted, correlationId);
    groups.push({
      correlationId,
      ...meta,
      events: sorted,
      startedAt: sorted[0]?.ts_start_ms,
      endedAt: sorted[sorted.length - 1]?.ts_end_ms || sorted[sorted.length - 1]?.ts_start_ms,
      terminalStatus: terminalStatusForRun(sorted),
      isCurrent: Boolean(activeCorrelationId && correlationId === activeCorrelationId),
    });
  }

  return groups.sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0));
}

export function formatTraceTime(ms?: number): string {
  if (!ms) return 'Pending';
  return new Date(ms).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function displayField(label: string, value?: string | number | null): { label: string; value: string } | null {
  if (value === undefined || value === null || value === '') return null;
  return { label, value: String(value) };
}
