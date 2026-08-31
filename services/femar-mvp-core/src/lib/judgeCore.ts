export type JudgeState = 'READY' | 'RUNNING' | 'LIVE' | 'PARTIAL' | 'FAIL' | 'ERROR' | 'TIMEOUT' | 'DEGRADED';

export type JudgeProvider = 'auto' | 'local' | 'gemini';

export interface JudgeTestDefinition {
  id: number;
  title: string;
  subtitle: string;
  capability: string;
}

export interface JudgeTraceEvent {
  id: string;
  timestamp: string;
  correlation_id: string;
  run_id?: string;
  test_id?: number;
  source_collection?: string;
  source_kind?: 'live_event' | 'historical_evidence' | 'degraded_event';
  source: string;
  target: string;
  protocol: string;
  event_type: string;
  state: string;
  state_transition?: string;
  agent_id?: string;
  message_id?: string;
  task_id?: string;
  a2a_task_id?: string;
  provider?: string;
  model?: string;
  runtime?: string;
  node?: string;
  tool?: string;
  action?: string;
  status: JudgeState;
  verified?: boolean;
  simulated?: boolean;
  degraded?: boolean;
  latency_ms?: number;
  evidence_ref?: string | null;
  artifact_id?: string | null;
  detail?: string;
}

export interface JudgeRunResult {
  ok: boolean;
  test_id?: number;
  correlation_id: string;
  status: JudgeState;
  title: string;
  detail: string;
  provider?: string;
  model?: string;
  runtime?: string;
  node?: string;
  tool?: string;
  agent_id?: string;
  latency_ms?: number;
  evidence_ref?: string | null;
  trace_persisted?: boolean;
}

export const JUDGE_TESTS: JudgeTestDefinition[] = [
  { id: 1, title: 'Sovereign Local AI', subtitle: 'AMD R9700 · vLLM · Qwen3-Coder', capability: 'local_model' },
  { id: 2, title: 'Google Gemini', subtitle: 'Gemini real model call · configured runtime', capability: 'gemini' },
  { id: 3, title: 'MCP Runtime Health', subtitle: 'InnerOS MCP live connection', capability: 'mcp_health' },
  { id: 4, title: 'InnerOS Control API', subtitle: 'Control-plane service connection', capability: 'inneros_api' },
  { id: 5, title: 'Durable Evidence', subtitle: 'Firestore write + read verification', capability: 'firestore' },
  { id: 6, title: 'FunctionGemma', subtitle: 'Truthful historical/readiness evaluation', capability: 'function_gemma' },
  { id: 7, title: 'Agent Fabric Catalog', subtitle: 'MCP/A2A catalog connection', capability: 'agent_fabric' },
];

export function parseJudgeTestCommand(input: string): number | null {
  const normalized = (input || '').trim().toLowerCase();
  const patterns = [
    /(?:run|execute|ejecuta|ejecutar|prueba|test|opci[oó]n)\s*(?:la\s*)?(?:opci[oó]n\s*)?(\d)/i,
    /(?:test|prueba)\s*#?\s*(\d)/i,
  ];
  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (!match) continue;
    const value = Number(match[1]);
    if (Number.isInteger(value) && value >= 1 && value <= 7) return value;
  }
  return null;
}

export function testById(id: number): JudgeTestDefinition | null {
  return JUDGE_TESTS.find((item) => item.id === id) || null;
}

export function safeStatus(value: unknown): JudgeState {
  const candidate = String(value || '').toUpperCase();
  const allowed: JudgeState[] = ['READY', 'RUNNING', 'LIVE', 'PARTIAL', 'FAIL', 'ERROR', 'TIMEOUT', 'DEGRADED'];
  return allowed.includes(candidate as JudgeState) ? (candidate as JudgeState) : 'ERROR';
}

export function isVerifiedSuccess(status: JudgeState): boolean {
  return status === 'LIVE';
}

export function eventCanDisplayAsLive(event: JudgeTraceEvent): boolean {
  return event.source_kind === 'live_event' && event.simulated !== true && event.verified === true;
}
