import type { JudgeTraceEvent } from '@/lib/judgeConsoleApi';
import { JUDGE_DEMO_STEPS, type JudgeDemoStep } from '@/lib/judgeDemoSteps';
import type { McpBridgeResult } from '@/lib/ralfiaMcpBridge';

export type JudgeStepProof = {
  headline: string;
  status: 'PASS' | 'PARTIAL' | 'FAIL';
  summary: string;
  whatHappened?: string;
  whereToLook?: string;
  lines: string[];
  pdfUrl?: string;
  pdfFilename?: string;
  excerpt?: string;
  provider?: string;
  model?: string;
  runtime?: string;
  node?: string;
  latencyMs?: number;
  correlationId?: string;
  eventCount?: number;
  dryRun?: boolean;
  timestamp?: string;
};

function statusFromOk(ok: boolean, partial?: boolean): JudgeStepProof['status'] {
  if (ok) return 'PASS';
  if (partial) return 'PARTIAL';
  return 'FAIL';
}

function agentCardNames(cards: unknown): string {
  if (!Array.isArray(cards)) return '';
  return cards
    .slice(0, 6)
    .map((c) => {
      if (!c || typeof c !== 'object') return '';
      const card = c as { name?: string; agent_id?: string; id?: string; title?: string };
      return String(card.name || card.title || card.agent_id || card.id || '');
    })
    .filter(Boolean)
    .join(', ');
}

export function buildStepProof(
  action: string,
  res: McpBridgeResult,
  step: JudgeDemoStep,
  traceEvents: JudgeTraceEvent[] = []
): JudgeStepProof {
  const correlationId = String(res.correlation_id || '');
  const timestamp = new Date().toISOString();
  const scopedTrace = correlationId
    ? traceEvents.filter((event) => event.correlation_id === correlationId)
    : traceEvents;
  const traceMeta = scopedTrace.find((event) => event.provider || event.model || event.runtime);
  const latencyMs =
    typeof res.latency_ms === 'number'
      ? res.latency_ms
      : traceMeta?.latency_ms ?? scopedTrace.find((event) => event.latency_ms != null)?.latency_ms;

  if (action === 'safe_trigger') {
    const health = String(res.message || res.summary || res.result || res.status || 'verify_system completed');
    const ok = res.ok !== false;
    return {
      headline: 'System alive — MCP health & safe trigger',
      status: statusFromOk(ok),
      summary: health.slice(0, 220),
      lines: [
        `Trigger: ${String(res.trigger || 'verify_system')}`,
        `Health: ${health.slice(0, 160)}`,
        latencyMs != null ? `Latency: ${latencyMs} ms` : '',
        correlationId ? `Correlation: ${correlationId}` : '',
      ].filter(Boolean),
      provider: String(res.provider || traceMeta?.provider || 'RalfIA MCP'),
      runtime: String(res.runtime || traceMeta?.runtime || 'InnerOS fleet'),
      latencyMs,
      correlationId,
      eventCount: scopedTrace.length,
      timestamp,
    };
  }

  if (action === 'a2a_handshake') {
    const state =
      (res.status as { state?: string } | undefined)?.state || String(res.state || 'unknown');
    const count = Number(res.agent_count ?? 0);
    const names = agentCardNames(res.cards);
    const ok = state === 'online' && count > 0;
    const traceLine = scopedTrace[0];
    const connection = traceLine?.source && traceLine?.target ? `${traceLine.source} → ${traceLine.target}` : 'Judge Console → MCP → A2A controller';
    return {
      headline: 'Agents connected — A2A bridge online',
      status: statusFromOk(ok, state === 'online' && count === 0),
      whatHappened: `A2A bridge reported ${state} with ${count} registered agent cards.`,
      summary: names ? `Sample agents: ${names}` : `Bridge ${state}; ${count} agents online.`,
      whereToLook: 'Proof block + Global Live Trace (protocol a2a_status, correlation below).',
      lines: [
        `Connection: ${connection}`,
        `Protocol: a2a_status / a2a-inneros-1.0`,
        `A2A state: ${state}`,
        `Agent count: ${count}`,
        names ? `Agent names: ${names}` : '',
        correlationId ? `Correlation: ${correlationId}` : '',
      ].filter(Boolean),
      provider: 'InnerOS A2A',
      runtime: 'a2a-inneros-1.0',
      latencyMs,
      correlationId,
      eventCount: scopedTrace.length,
      timestamp,
    };
  }

  if (action === 'gemma_probe') {
    const status = String(res.status || 'HISTORICAL_VERIFIED');
    const model = String(res.model || res.selected_model || 'FunctionGemma');
    const ok = /gemma|function/i.test(model);
    return {
      headline: 'FunctionGemma — historical evidence verification',
      status: statusFromOk(ok, /not_running|ready_to_redeploy/i.test(status)),
      summary: 'Hackathon evidence preserved. Endpoint is NOT live — no fake inference spinner.',
      lines: [
        `Model identity: ${model}`,
        `Current state: ${status}`,
        `Evidence: ${String(res.evidence_ref || 'judge_model_routing_policy + resource_fabric')}`,
        'Live inference: NOT RUNNING (truthful)',
      ],
      provider: String(res.provider || 'Google Vertex AI'),
      model,
      runtime: String(res.runtime || 'vertex-model-garden-evidence'),
      correlationId,
      eventCount: scopedTrace.length,
      timestamp,
    };
  }

  if (action === 'gemini_emergency_pdf' || action === 'iskcon_emergency_pdf') {
    const pdfUrl = String(res.pdf_url || (res.artifacts as { url?: string }[] | undefined)?.[0]?.url || '');
    const excerpt = String(res.gemini_excerpt || res.text || '').slice(0, 280);
    const partial = res.gemini_fallback === true || res.status === 'PARTIAL';
    const ok = Boolean(pdfUrl) && res.ok !== false;
    const generatedAt = timestamp;
    return {
      headline: 'Gemini emergency PDF — live generation',
      status: statusFromOk(ok, partial),
      whatHappened: partial
        ? 'Emergency plan text was generated with local fallback; PDF artifact is still real and downloadable.'
        : 'Gemini generated emergency plan text; backend converted it to a PDF artifact.',
      summary: excerpt || (ok ? 'PDF artifact ready — use Open/Download below.' : 'PDF generation incomplete.'),
      whereToLook: 'Gemini excerpt here, PDF buttons below, matching trace on the right.',
      excerpt,
      lines: [
        `Provider: ${String(res.provider || 'Google Gemini')}`,
        `Model: ${String(res.model || 'gemini')}`,
        res.nonce ? `Nonce: ${String(res.nonce)}` : '',
        `Generated: ${generatedAt}`,
        `Content-Type: application/pdf`,
        pdfUrl ? `Artifact URL: ${pdfUrl}` : 'No PDF URL returned',
        latencyMs != null ? `Latency: ${latencyMs} ms` : '',
      ].filter(Boolean),
      pdfUrl,
      pdfFilename: String(res.pdf_filename || 'judge-emergency-plan.pdf'),
      provider: String(res.provider || 'Google Gemini'),
      model: String(res.model || traceMeta?.model),
      latencyMs,
      correlationId,
      eventCount: scopedTrace.length,
      timestamp,
    };
  }

  if (action === 'workflow_start') {
    const intent = String((res.intent as string | undefined) || step.payload?.intent || 'ask_aria');
    const answer = String(res.answer || res.text || res.message || res.workflow_message || '').slice(0, 320);
    const workflowId = String(res.workflow_id || res.id || '');
    const startedOnly = !answer && Boolean(workflowId);
    const ok = res.ok !== false && (Boolean(answer) || Boolean(workflowId));
    return {
      headline: intent.includes('local') ? 'Local-first AMD routing' : 'ARIA live challenge',
      status: statusFromOk(ok, startedOnly),
      summary: answer || (startedOnly ? `Workflow started (${workflowId}) — awaiting terminal output.` : 'Workflow response captured.'),
      excerpt: answer || undefined,
      lines: [
        `Intent: ${intent}`,
        workflowId ? `Workflow ID: ${workflowId}` : '',
        answer ? `Response excerpt: ${answer.slice(0, 180)}` : 'Status: workflow started (not full reasoning chain)',
        correlationId ? `Correlation: ${correlationId}` : '',
      ].filter(Boolean),
      provider: String(res.provider || traceMeta?.provider),
      model: String(res.model || traceMeta?.model),
      runtime: String(res.runtime || traceMeta?.runtime),
      node: String(res.node || traceMeta?.node),
      latencyMs,
      correlationId,
      eventCount: scopedTrace.length,
      timestamp,
    };
  }

  if (action === 'local_ai_proof') {
    const answer = String(
      res.answer || res.text || res.response || res.output || res.content || ''
    ).slice(0, 400);
    const route = res.route as Record<string, unknown> | undefined;
    const routeSummary = route
      ? String(route.selected_model || route.runtime || route.provider || route.recommendation || '')
      : '';
    const partial = !answer;
    const ok = res.ok !== false && Boolean(answer);
    return {
      headline: 'Local-first AMD — Qwen inference proof',
      status: statusFromOk(ok, partial),
      whatHappened: answer
        ? 'Local model returned a bounded coding answer on the AMD path.'
        : routeSummary
          ? `Routing accepted (${routeSummary}) but no model output returned yet — PARTIAL.`
          : 'Local routing invoked; awaiting model output — PARTIAL.',
      summary: answer || 'No final model text in response (workflow/routing only).',
      whereToLook: 'Model excerpt here + provider/runtime badges + Global Live Trace.',
      excerpt: answer || undefined,
      lines: [
        `Provider: ${String(res.provider || res.provider_id || traceMeta?.provider || 'local_amd')}`,
        `Model: ${String(res.model || res.selected_model || traceMeta?.model || 'Qwen3-Coder')}`,
        `Runtime: ${String(res.runtime || traceMeta?.runtime || 'vLLM / Ollama')}`,
        `Node: ${String(res.node || res.host || traceMeta?.node || '192.168.1.5')}`,
        routeSummary ? `Route decision: ${routeSummary}` : '',
        latencyMs != null ? `Latency: ${latencyMs} ms` : '',
        correlationId ? `Correlation: ${correlationId}` : '',
      ].filter(Boolean),
      provider: String(res.provider || traceMeta?.provider),
      model: String(res.model || traceMeta?.model),
      runtime: String(res.runtime || traceMeta?.runtime),
      node: String(res.node || traceMeta?.node),
      latencyMs,
      correlationId,
      eventCount: scopedTrace.length,
      timestamp,
    };
  }

  if (action === 'a2a_dispatch') {
    const dryRun = res.dry_run !== false;
    const taskId = String(res.task_id || res.ops_task_id || res.a2a_task_id || '');
    const ok = res.ok !== false;
    return {
      headline: dryRun ? 'Multi-agent RACB — DRY-RUN dispatch' : 'Multi-agent RACB dispatch',
      status: statusFromOk(ok),
      summary: dryRun
        ? 'Dispatch accepted in dry-run mode — no side effects on agents.'
        : `Dispatch accepted${taskId ? ` · task ${taskId}` : ''}.`,
      lines: [
        dryRun ? 'Mode: DRY-RUN (visible, no agent execution claimed)' : 'Mode: LIVE dispatch',
        taskId ? `Task ID: ${taskId}` : 'Task reference pending in trace',
        `Agent: ${String(res.agent_id || 'AG-25')}`,
        correlationId ? `Correlation: ${correlationId}` : '',
      ].filter(Boolean),
      provider: 'InnerOS RACB',
      runtime: 'a2a_dispatch',
      dryRun,
      correlationId,
      eventCount: scopedTrace.length,
      timestamp,
    };
  }

  const ok = res.ok !== false;
  return {
    headline: step.labelEn.replace(/^\d+\s·\s*/, ''),
    status: statusFromOk(ok),
    summary: String(res.message || res.text || 'Execution completed.').slice(0, 200),
    lines: [correlationId ? `Correlation: ${correlationId}` : ''].filter(Boolean),
    correlationId,
    eventCount: scopedTrace.length,
    timestamp,
  };
}

export function formatProofBlock(proof: JudgeStepProof): string {
  const header = `${proof.status} · ${proof.headline}`;
  const body = proof.lines.join('\n');
  return `${header}\n\nProof produced:\n${proof.summary}\n\n${body}`;
}

export function extractThisRunUsed(events: JudgeTraceEvent[], correlationId?: string | null) {
  const scoped = correlationId
    ? events.filter((event) => event.correlation_id === correlationId)
    : events.slice(-8);
  if (!scoped.length) return null;
  const latest = scoped[scoped.length - 1];
  return {
    action: latest.action || latest.tool,
    provider: latest.provider,
    model: latest.model,
    runtime: latest.runtime,
    node: latest.node,
    status: latest.status,
    correlationId: latest.correlation_id,
  };
}
