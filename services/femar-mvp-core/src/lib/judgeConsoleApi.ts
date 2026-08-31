import { callMcpTool, type McpBridgeResult } from '@/lib/ralfiaMcpBridge';
import { judgeKpiSummary } from '@/lib/iskconAg52Helpers';
import { runIskconEmergencyPdfDemo } from '@/lib/judgeRecordingSuite';
import { runJudgeRecordingSuite } from '@/lib/judgeDemoEval';
import {
  agentActivityToTrace,
  extractActivityItems,
  extractTraceEvents,
  mergeTraceEvents,
  type TraceFilterId,
} from '@/lib/judgeGlobalTrace';

export type JudgeTraceEvent = {
  correlation_id?: string;
  run_id?: string;
  event_type?: string;
  message_id?: string;
  task_id?: string;
  a2a_task_id?: string;
  source_collection?: string;
  source_kind?: string;
  ts_start_ms?: number;
  ts_end_ms?: number;
  source?: string;
  target?: string;
  protocol?: string;
  agent_id?: string;
  tool?: string;
  action?: string;
  latency_ms?: number;
  status?: string;
  verified?: boolean;
  simulated?: boolean;
  degraded?: boolean;
  model?: string;
  provider?: string;
  runtime?: string;
  node?: string;
  evidence_ref?: string;
  artifact_id?: string;
  error?: string;
};

export type JudgeContentSection = {
  section_id?: string;
  title?: string;
  kind?: string;
  content?: Record<string, unknown>;
  freshness?: { source?: string; evidence_ref?: string; generated_at?: string; version?: string };
};

export type JudgeModelRoute = {
  task_class?: string;
  selected_model?: string;
  provider_id?: string;
  runtime?: string;
  reason?: string;
  cost_policy?: string;
  readiness?: string;
  status?: string;
};

export type JudgeConsoleSnapshot = {
  ok: boolean;
  backend: 'live' | 'pending_merge';
  kpis: ReturnType<typeof judgeKpiSummary>;
  events: JudgeTraceEvent[];
  globalEvents: JudgeTraceEvent[];
  traceSources: string[];
  workflows: Record<string, unknown>[];
  resourceFabric: Record<string, unknown> | null;
  sections: JudgeContentSection[];
  modelRouting: Record<string, unknown> | null;
  errors: string[];
};

export type LoadGlobalTraceOptions = {
  limit?: number;
  correlationId?: string;
  includeActivity?: boolean;
};

const OPTIONAL_JUDGE_TOOLS = new Set(['judge_resource_telemetry']);

function isMissingTool(res: McpBridgeResult): boolean {
  const err = String(res.error || '');
  return err.includes('Method not found') || err.includes('unknown tool');
}

function isOptionalToolFailure(res: McpBridgeResult, toolHint?: string): boolean {
  if (res.ok !== false) return false;
  const err = String(res.error || '');
  if (toolHint && OPTIONAL_JUDGE_TOOLS.has(toolHint)) return true;
  return err.includes('judge_resource_telemetry') || err.includes('Command failed');
}

export async function loadGlobalTraceEvents(options: LoadGlobalTraceOptions = {}): Promise<{
  events: JudgeTraceEvent[];
  sources: string[];
  errors: string[];
}> {
  const limit = Math.max(20, Math.min(options.limit || 120, 200));
  const errors: string[] = [];
  const sources: string[] = [];

  const historyArgs: Record<string, unknown> = { limit };
  if (options.correlationId) historyArgs.correlation_id = options.correlationId;

  const [currentRes, historyRes, activityRes] = await Promise.all([
    callMcpTool('judge_trace_current', { limit }),
    callMcpTool('judge_trace_history', historyArgs),
    options.includeActivity !== false
      ? callMcpTool('list_recent_agent_activity', { hours: 6, limit: 80 })
      : Promise.resolve({ ok: true, items: [] } as McpBridgeResult),
  ]);

  const judgeEvents = mergeTraceEvents(
    extractTraceEvents(currentRes),
    extractTraceEvents(historyRes)
  );
  if (judgeEvents.length) sources.push('judge_trace_mongo');

  const activityEvents = extractActivityItems(activityRes).map(agentActivityToTrace);
  if (activityEvents.length) sources.push('agent_activity_mongo');

  if (currentRes.ok === false && currentRes.error) errors.push(String(currentRes.error));
  if (activityRes.ok === false && activityRes.error && !String(activityRes.error).includes('Method not found')) {
    errors.push(String(activityRes.error));
  }

  return {
    events: mergeTraceEvents(judgeEvents, activityEvents),
    sources,
    errors,
  };
}

export async function loadJudgeConsoleSnapshot(options: LoadGlobalTraceOptions = {}): Promise<JudgeConsoleSnapshot> {
  const errors: string[] = [];
  const [kpiRes, currentRes, workflowRes, resourceRes, contentRes, routingRes, globalTrace] = await Promise.all([
    callMcpTool('judge_trace_kpis', { limit: 500 }),
    callMcpTool('judge_trace_current', { limit: 30 }),
    callMcpTool('judge_workflow_list', { limit: 20 }),
    callMcpTool('judge_resource_telemetry', {}),
    callMcpTool('judge_console_content_get', { refresh: true }),
    callMcpTool('judge_model_routing_policy', {}),
    loadGlobalTraceEvents({ ...options, limit: options.limit || 120 }),
  ]);

  const coreTools = [kpiRes, currentRes, workflowRes];
  const missingTools = coreTools.every(isMissingTool);

  for (const [tool, res] of [
    ['judge_trace_kpis', kpiRes],
    ['judge_trace_current', currentRes],
    ['judge_workflow_list', workflowRes],
    ['judge_resource_telemetry', resourceRes],
    ['judge_console_content_get', contentRes],
    ['judge_model_routing_policy', routingRes],
  ] as const) {
    if (res.ok === false && res.error && !isOptionalToolFailure(res, tool)) {
      errors.push(String(res.error));
    }
  }

  const events = globalTrace.events.length
    ? globalTrace.events
    : (currentRes.events as JudgeTraceEvent[] | undefined) || [];
  const workflows =
    (workflowRes.workflows as Record<string, unknown>[] | undefined) ||
    (workflowRes.items as Record<string, unknown>[] | undefined) ||
    [];

  const rfBlock = resourceRes.resource_fabric as Record<string, unknown> | undefined;
  const resourceFabric =
    rfBlock && typeof rfBlock === 'object'
      ? rfBlock
      : isMissingTool(resourceRes)
        ? null
        : (resourceRes as Record<string, unknown>);

  const sections = (contentRes.sections as JudgeContentSection[] | undefined) || [];
  const modelRouting = isMissingTool(routingRes) ? null : (routingRes as Record<string, unknown>);

  return {
    ok: !missingTools && (kpiRes.ok !== false || events.length > 0),
    backend: missingTools ? 'pending_merge' : 'live',
    kpis: judgeKpiSummary(kpiRes),
    events,
    globalEvents: events,
    traceSources: globalTrace.sources,
    workflows,
    resourceFabric,
    sections,
    modelRouting,
    errors: [...errors, ...globalTrace.errors],
  };
}

export async function runJudgeMcpAction(
  action: string,
  payload: Record<string, unknown> = {}
): Promise<McpBridgeResult> {
  switch (action) {
    case 'workflow_start':
      return callMcpTool('judge_workflow_start', {
        message: String(payload.message || ''),
        intent: String(payload.intent || 'auto'),
        correlation_id: String(payload.correlation_id || ''),
      });
    case 'workflow_continue':
      return callMcpTool('judge_workflow_continue', {
        workflow_id: String(payload.workflow_id || ''),
        fields: (payload.fields as Record<string, unknown>) || {},
      });
    case 'workflow_execute':
      return callMcpTool('judge_workflow_execute', { workflow_id: String(payload.workflow_id || '') });
    case 'safe_trigger':
      return callMcpTool('judge_safe_trigger', {
        action: String(payload.trigger || 'verify_system'),
        prompt: String(payload.prompt || ''),
        correlation_id: String(payload.correlation_id || ''),
        dry_run: payload.dry_run !== false,
      });
    case 'mi325x_preflight':
      return callMcpTool('judge_mi325x_deploy', { action: 'preflight', params: { dry_run: true, ...(payload.params as object) } });
    case 'trace_detail':
      return callMcpTool('judge_trace_detail', { run_id: String(payload.run_id || '') });
    case 'a2a_handshake':
      return callMcpTool('a2a_status', {});
    case 'a2a_cards':
      return callMcpTool('a2a_agent_cards', {});
    case 'a2a_dispatch':
      return callMcpTool('a2a_dispatch', {
        agent_id: String(payload.agent_id || 'AG-25'),
        title: String(payload.title || 'Judge demo dispatch'),
        body: String(payload.body || payload.message || ''),
        correlation_id: String(payload.correlation_id || ''),
        priority: String(payload.priority || 'normal'),
        dry_run: payload.dry_run !== false,
      });
    case 'iskcon_emergency_pdf':
      return runIskconEmergencyPdfDemo();
    case 'gemma_probe':
      return callMcpTool('route_ai_task', {
        title: 'Judge Gemma route probe',
        body: String(payload.message || 'Classify bounded function intent for Judge demo'),
        task_type: 'bounded_function_intent',
      });
    case 'external_ping':
      return callMcpTool('a2a_dispatch', {
        agent_id: String(payload.agent_id || 'AG-25'),
        title: String(payload.title || 'External trace ping'),
        body: String(payload.body || 'Cross-surface global trace test from outside Judge UI'),
        correlation_id: String(payload.correlation_id || `judge-global-${Date.now()}`),
        dry_run: payload.dry_run !== false,
      });
    case 'demo_recording_suite':
      return runJudgeRecordingSuite(
        (demoAction, demoPayload) => runJudgeMcpAction(demoAction, demoPayload || {}),
        payload.lang === 'en' ? 'en' : 'es'
      );
    default:
      return { ok: false, error: `unknown_judge_action:${action}` };
  }
}
