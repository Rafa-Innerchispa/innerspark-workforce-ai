import { mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import type { JudgeTraceEvent } from '@/lib/judgeConsoleApi';
import type { McpBridgeResult } from '@/lib/ralfiaMcpBridge';

const TRACE_SOURCE_COLLECTION = 'inneros_judge_trace_contract_events';
const TRACE_SOURCE_KIND = 'persistent_runtime_contract';

export type JudgeTraceContractWrite = {
  ok: boolean;
  path: string;
  error?: string;
};

function tracePath(): string {
  return (
    process.env.JUDGE_TRACE_CONTRACT_PATH ||
    path.join(os.tmpdir(), 'inneros_judge_trace_contract_events.jsonl')
  );
}

function textValue(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function terminalStatus(result: McpBridgeResult): string {
  if (result.ok === false) return 'FAIL';
  const status = String(result.status || '').toUpperCase();
  if (/(FAIL|ERROR|DENIED|UNAUTHORIZED)/.test(status)) return 'FAIL';
  if (/(PARTIAL|TIMEOUT|DEGRADED|NOT_READY|NOT_RUNNING)/.test(status)) return 'PARTIAL';
  return 'PASS';
}

function targetForAction(action: string): string {
  if (action.includes('a2a')) return 'InnerOS A2A / AG-25';
  if (action.includes('gemma')) return 'Google Vertex FunctionGemma evidence';
  if (action.includes('mi325x')) return 'DigitalOcean AMD MI325X evidence';
  if (action.includes('iskcon')) return 'ISKCON artifact pipeline';
  if (action.includes('workflow')) return 'Judge workflow runtime';
  if (action.includes('safe_trigger')) return 'Ralphi MCP safe trigger';
  return 'InnerOS runtime';
}

function buildTraceEvent(input: {
  action: string;
  correlationId: string;
  eventType: 'judge_test_start' | 'judge_test_result';
  status: string;
  startedAt: number;
  endedAt?: number;
  result?: McpBridgeResult;
  error?: string;
}): JudgeTraceEvent {
  const result = input.result || {};
  const latencyMs =
    typeof result.latency_ms === 'number'
      ? result.latency_ms
      : input.endedAt
        ? Math.max(0, input.endedAt - input.startedAt)
        : undefined;

  return {
    correlation_id: input.correlationId,
    run_id: `${input.correlationId}:${input.action}:${input.eventType}`,
    event_type: input.eventType,
    message_id: textValue(result.message_id),
    task_id: textValue(result.task_id) || textValue(result.ops_task_id),
    a2a_task_id: textValue(result.a2a_task_id),
    source_collection: TRACE_SOURCE_COLLECTION,
    source_kind: TRACE_SOURCE_KIND,
    ts_start_ms: input.startedAt,
    ts_end_ms: input.endedAt,
    source: 'Judge Console',
    target: targetForAction(input.action),
    protocol: 'judge_test_contract',
    agent_id: textValue(result.agent_id),
    tool: input.action,
    action: input.action,
    latency_ms: latencyMs,
    status: input.status,
    verified: input.eventType === 'judge_test_result' && input.status !== 'FAIL',
    simulated: false,
    degraded: input.status === 'PARTIAL',
    model: textValue(result.model) || textValue(result.selected_model),
    provider: textValue(result.provider) || textValue(result.provider_id),
    runtime: textValue(result.runtime),
    node: textValue(result.node) || textValue(result.host),
    evidence_ref:
      textValue(result.evidence_ref) ||
      `${TRACE_SOURCE_COLLECTION}:${input.correlationId}:${input.action}`,
    artifact_id: textValue(result.artifact_id),
    error: input.error || textValue(result.error),
  };
}

async function appendTraceEvent(event: JudgeTraceEvent): Promise<JudgeTraceContractWrite> {
  const file = tracePath();
  try {
    await mkdir(/* turbopackIgnore: true */ path.dirname(file), { recursive: true });
    await writeFile(/* turbopackIgnore: true */ file, `${JSON.stringify(event)}\n`, { flag: 'a' });
    return { ok: true, path: file };
  } catch (err) {
    return { ok: false, path: file, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function loadJudgeTraceContractEvents(options: {
  correlationId?: string;
  limit?: number;
} = {}): Promise<{ events: JudgeTraceEvent[]; source: string; error?: string }> {
  const file = tracePath();
  try {
    const raw = await readFile(/* turbopackIgnore: true */ file, 'utf8');
    const events = raw
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line) as JudgeTraceEvent)
      .filter((event) => !options.correlationId || event.correlation_id === options.correlationId)
      .slice(-(options.limit || 120));
    return { events, source: TRACE_SOURCE_COLLECTION };
  } catch (err) {
    const code = typeof err === 'object' && err && 'code' in err ? String(err.code) : '';
    if (code === 'ENOENT') return { events: [], source: TRACE_SOURCE_COLLECTION };
    return {
      events: [],
      source: TRACE_SOURCE_COLLECTION,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function runWithJudgeTraceContract(
  action: string,
  payload: Record<string, unknown>,
  runner: () => Promise<McpBridgeResult>
): Promise<McpBridgeResult> {
  const startedAt = Date.now();
  const correlationId =
    textValue(payload.correlation_id) || `judge-test-${action}-${startedAt}`;

  const startWrite = await appendTraceEvent(
    buildTraceEvent({
      action,
      correlationId,
      eventType: 'judge_test_start',
      status: 'RUNNING',
      startedAt,
    })
  );
  if (!startWrite.ok) {
    return {
      ok: false,
      correlation_id: correlationId,
      error: 'judge_trace_persist_start_failed',
      trace_error: startWrite.error,
    };
  }

  let result: McpBridgeResult;
  try {
    result = await runner();
  } catch (err) {
    result = {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  const endedAt = Date.now();
  const traceStatus = terminalStatus(result);
  const resultWrite = await appendTraceEvent(
    buildTraceEvent({
      action,
      correlationId,
      eventType: 'judge_test_result',
      status: traceStatus,
      startedAt,
      endedAt,
      result,
      error: textValue(result.error),
    })
  );

  if (!resultWrite.ok) {
    return {
      ok: false,
      correlation_id: correlationId,
      error: 'judge_trace_persist_result_failed',
      trace_error: resultWrite.error,
      original_result: result,
    };
  }

  return {
    ...result,
    correlation_id: textValue(result.correlation_id) || correlationId,
    trace_persisted: true,
    trace_event_count: 2,
    trace_source_collection: TRACE_SOURCE_COLLECTION,
    trace_terminal_status: traceStatus,
    evidence_ref:
      textValue(result.evidence_ref) ||
      `${TRACE_SOURCE_COLLECTION}:${correlationId}:${action}`,
  };
}
