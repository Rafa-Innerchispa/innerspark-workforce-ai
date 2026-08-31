import type { JudgeModelRoute, JudgeTraceEvent } from '@/lib/judgeConsoleApi';

export type RouteReadiness = 'LIVE' | 'PARTIAL' | 'NOT_READY';

function normalizeReadiness(raw?: string): RouteReadiness | null {
  const v = String(raw || '').toUpperCase();
  if (v === 'LIVE' || v === 'READY') return 'LIVE';
  if (v === 'NOT_READY' || v === 'UNAVAILABLE') return 'NOT_READY';
  if (v === 'PARTIAL' || v === 'DEGRADED') return 'PARTIAL';
  return null;
}

export function inferRouteReadiness(route: JudgeModelRoute): RouteReadiness {
  const fromMcp = normalizeReadiness(route.readiness || route.status);
  if (fromMcp) return fromMcp;

  const task = String(route.task_class || '').toLowerCase();
  const runtime = String(route.runtime || '').toLowerCase();

  if (task.includes('cloud_burst') || task.includes('mi325x') || runtime.includes('ephemeral_cloud')) {
    return 'PARTIAL';
  }
  if (runtime.includes('local_vllm') || runtime.includes('local_model') || runtime.includes('local_voice')) {
    return 'LIVE';
  }
  if (runtime.includes('external_google') || runtime.includes('google')) {
    return 'LIVE';
  }
  return 'PARTIAL';
}

export function readinessBadgeClass(state: RouteReadiness): string {
  if (state === 'LIVE') return 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200';
  if (state === 'NOT_READY') return 'border-rose-500/40 bg-rose-500/15 text-rose-200';
  return 'border-amber-500/40 bg-amber-500/15 text-amber-200';
}

export function modelOptionReadiness(id: string, routes: JudgeModelRoute[]): RouteReadiness {
  if (id === 'functiongemma') {
    const endpointConfigured = Boolean(
      (process.env.INNEROS_FUNCTION_GEMMA_ENDPOINT_ID ?? 'mg-endpoint-98cacc40-0e4e-41fd-8f86-91a93146e936').trim()
    );
    return endpointConfigured ? 'LIVE' : 'NOT_READY';
  }
  const map: Record<string, string[]> = {
    auto: [],
    gemini: ['google_reasoning'],
    functiongemma: ['function', 'gemma', 'bounded_function'],
    local_amd: ['coding', 'vllm'],
    local_intel: ['light_ops', 'ollama'],
    lemonade_voice: ['stt_tts', 'voice', 'lemonade'],
  };
  const needles = map[id] || [];
  const matched = routes.filter((r) =>
    needles.some((n) => String(r.task_class || '').toLowerCase().includes(n))
  );
  if (!matched.length) return id === 'auto' ? 'LIVE' : 'PARTIAL';
  const states = matched.map(inferRouteReadiness);
  if (states.includes('NOT_READY')) return 'NOT_READY';
  if (states.every((s) => s === 'LIVE')) return 'LIVE';
  return 'PARTIAL';
}

export function functionGemmaTruthNote(): string {
  const endpointId =
    (process.env.INNEROS_FUNCTION_GEMMA_ENDPOINT_ID ?? 'mg-endpoint-98cacc40-0e4e-41fd-8f86-91a93146e936').trim();
  if (!endpointId) {
    return 'NOT_RUNNING · No Vertex endpoint configured. READY_TO_REDEPLOY requires owner-approved temporary deployment.';
  }
  return `LIVE · FunctionGemma on Vertex endpoint ${endpointId.slice(-12)}. Test 3 runs a bounded live predict; undeploy GPU after recording to save cost.`;
}

export function mi325xBurstTruthNote(): string {
  return 'DESTROYED · Droplet 596444112 was PROVEN (MI325X red-team PASS) then owner-approved destroy (HTTP 204, count=0). Reprovision requires owner approval + cloud credits.';
}

export function traceFieldMatrix(events: JudgeTraceEvent[]): string[] {
  const fields = [
    'correlation_id',
    'run_id',
    'event_type',
    'message_id',
    'task_id',
    'a2a_task_id',
    'source',
    'target',
    'protocol',
    'agent_id',
    'tool',
    'action',
    'model',
    'provider',
    'runtime',
    'node',
    'latency_ms',
    'status',
    'verified',
    'evidence_ref',
    'artifact_id',
    'source_collection',
    'source_kind',
    'simulated',
    'degraded',
  ];
  const present = fields.filter((f) => events.some((e) => (e as Record<string, unknown>)[f] != null && (e as Record<string, unknown>)[f] !== ''));
  return present;
}
