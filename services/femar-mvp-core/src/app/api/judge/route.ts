import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { db } from '@/lib/firebase';
import {
  JUDGE_TESTS,
  JudgeProvider,
  JudgeRunResult,
  JudgeState,
  JudgeTraceEvent,
  parseJudgeTestCommand,
  testById,
} from '@/lib/judgeCore';

export const dynamic = 'force-dynamic';

const TRACE_COLLECTION = 'inneros_judge_web_trace';
const EVIDENCE_COLLECTION = 'inneros_judge_evidence';
const MCP_BASE = process.env.INNEROS_MCP_URL || 'http://127.0.0.1:8102';
const INNEROS_API_BASE = process.env.INNEROS_API_URL || 'http://127.0.0.1:8101';
const VLLM_BASE = process.env.JUDGE_VLLM_URL || 'http://127.0.0.1:8000/v1';
const LOCAL_MODEL = process.env.JUDGE_LOCAL_MODEL || 'QuantTrio/Qwen3-Coder-30B-A3B-Instruct-AWQ';
const GEMINI_MODEL = process.env.JUDGE_GEMINI_MODEL || 'gemini-3.5-flash';

function nowIso() {
  return new Date().toISOString();
}

async function timedFetch(url: string, init: RequestInit = {}, timeoutMs = 12_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();
  try {
    const response = await fetch(url, { ...init, signal: controller.signal, cache: 'no-store' });
    return { response, latencyMs: Date.now() - started };
  } finally {
    clearTimeout(timer);
  }
}

async function writeTrace(event: JudgeTraceEvent): Promise<boolean> {
  try {
    await db.collection(TRACE_COLLECTION).doc(event.id).set(event);
    return true;
  } catch (error) {
    console.error('judge_trace_write_failed', error);
    return false;
  }
}

function makeTrace(
  correlationId: string,
  status: JudgeState,
  eventType: string,
  detail: string,
  extra: Partial<JudgeTraceEvent> = {}
): JudgeTraceEvent {
  return {
    id: randomUUID(),
    timestamp: nowIso(),
    correlation_id: correlationId,
    source: 'judge-console',
    target: extra.target || 'inneros',
    protocol: extra.protocol || 'HTTP',
    event_type: eventType,
    state: extra.state || status,
    status,
    detail,
    ...extra,
  };
}

async function localModelCall(prompt: string, correlationId: string): Promise<JudgeRunResult> {
  const started = Date.now();
  try {
    const { response, latencyMs } = await timedFetch(`${VLLM_BASE}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: LOCAL_MODEL,
        temperature: 0.2,
        max_tokens: 260,
        messages: [
          {
            role: 'system',
            content: 'You are ARIA inside InnerOS Judge Console. Be concise, factual, and never claim a capability that was not actually executed. Reply in the user language.',
          },
          { role: 'user', content: prompt },
        ],
      }),
    }, 20_000);
    if (!response.ok) {
      return {
        ok: false,
        correlation_id: correlationId,
        status: 'ERROR',
        title: 'ARIA local model',
        detail: `vLLM returned HTTP ${response.status}`,
        provider: 'local-amd-5',
        model: LOCAL_MODEL,
        runtime: 'vLLM',
        node: 'AMD .5',
        latency_ms: latencyMs,
      };
    }
    const body = await response.json();
    const text = String(body?.choices?.[0]?.message?.content || '').trim();
    if (!text) throw new Error('empty_model_response');
    return {
      ok: true,
      correlation_id: correlationId,
      status: 'LIVE',
      title: 'ARIA local model',
      detail: text,
      provider: 'local-amd-5',
      model: LOCAL_MODEL,
      runtime: 'vLLM',
      node: 'AMD .5',
      latency_ms: latencyMs,
    };
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === 'AbortError';
    return {
      ok: false,
      correlation_id: correlationId,
      status: isTimeout ? 'TIMEOUT' : 'ERROR',
      title: 'ARIA local model',
      detail: error instanceof Error ? error.message : 'local model call failed',
      provider: 'local-amd-5',
      model: LOCAL_MODEL,
      runtime: 'vLLM',
      node: 'AMD .5',
      latency_ms: Date.now() - started,
    };
  }
}

async function geminiCall(prompt: string, correlationId: string): Promise<JudgeRunResult> {
  const started = Date.now();
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error('Gemini API key is not configured in the service runtime');
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: `You are ARIA inside InnerOS Judge Console. Reply concisely and factually in the user language. Do not invent execution evidence. User request: ${prompt}`,
    });
    const text = String(response.text || '').trim();
    if (!text) throw new Error('empty_gemini_response');
    return {
      ok: true,
      correlation_id: correlationId,
      status: 'LIVE',
      title: 'ARIA Google Gemini',
      detail: text,
      provider: 'google',
      model: GEMINI_MODEL,
      runtime: 'Google GenAI SDK',
      node: 'Google',
      latency_ms: Date.now() - started,
    };
  } catch (error) {
    return {
      ok: false,
      correlation_id: correlationId,
      status: 'ERROR',
      title: 'ARIA Google Gemini',
      detail: error instanceof Error ? error.message : 'Gemini call failed',
      provider: 'google',
      model: GEMINI_MODEL,
      runtime: 'Google GenAI SDK',
      node: 'Google',
      latency_ms: Date.now() - started,
    };
  }
}

async function runAria(prompt: string, provider: JudgeProvider): Promise<JudgeRunResult> {
  const correlationId = `judge-aria-${randomUUID()}`;
  await writeTrace(makeTrace(correlationId, 'RUNNING', 'aria_dispatch', prompt.slice(0, 220), {
    target: provider === 'gemini' ? 'google-gemini' : 'local-model-router',
    protocol: 'MODEL',
    provider,
  }));

  const embeddedTest = parseJudgeTestCommand(prompt);
  if (embeddedTest) return runTest(embeddedTest, correlationId);

  let result = provider === 'gemini'
    ? await geminiCall(prompt, correlationId)
    : await localModelCall(prompt, correlationId);

  if (provider === 'auto' && !result.ok) {
    const fallback = await geminiCall(prompt, correlationId);
    if (fallback.ok) result = fallback;
  }

  const persisted = await writeTrace(makeTrace(correlationId, result.status, 'aria_result', result.detail.slice(0, 600), {
    target: result.provider || 'model',
    protocol: 'MODEL',
    provider: result.provider,
    model: result.model,
    runtime: result.runtime,
    node: result.node,
    latency_ms: result.latency_ms,
    evidence_ref: result.evidence_ref,
  }));
  return { ...result, trace_persisted: persisted };
}

async function probeJson(url: string, timeoutMs = 10_000) {
  const { response, latencyMs } = await timedFetch(url, {}, timeoutMs);
  const text = await response.text();
  let body: unknown = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text.slice(0, 500); }
  return { ok: response.ok, status: response.status, body, latencyMs };
}

async function runTest(testId: number, suppliedCorrelationId?: string): Promise<JudgeRunResult> {
  const definition = testById(testId);
  const correlationId = suppliedCorrelationId || `judge-test-${testId}-${randomUUID()}`;
  if (!definition) {
    return { ok: false, test_id: testId, correlation_id: correlationId, status: 'ERROR', title: 'Unknown test', detail: 'Test id must be 1-7.' };
  }

  await writeTrace(makeTrace(correlationId, 'RUNNING', 'test_dispatch', definition.title, {
    test_id: testId,
    target: definition.capability,
    protocol: 'JUDGE',
  }));

  let result: JudgeRunResult;
  const started = Date.now();
  try {
    if (testId === 1) {
      result = await localModelCall('Reply exactly: LOCAL_AI_LIVE', correlationId);
      if (result.ok && !result.detail.includes('LOCAL_AI_LIVE')) {
        result = { ...result, ok: false, status: 'FAIL', detail: `Model responded, but smoke contract was not satisfied: ${result.detail}` };
      }
    } else if (testId === 2) {
      result = await geminiCall('Reply exactly: GEMINI_LIVE', correlationId);
      if (result.ok && !result.detail.includes('GEMINI_LIVE')) {
        result = { ...result, ok: false, status: 'FAIL', detail: `Gemini responded, but smoke contract was not satisfied: ${result.detail}` };
      }
    } else if (testId === 3) {
      const probe = await probeJson(`${MCP_BASE}/health`);
      result = {
        ok: probe.ok,
        test_id: testId,
        correlation_id: correlationId,
        status: probe.ok ? 'LIVE' : 'FAIL',
        title: definition.title,
        detail: probe.ok ? 'MCP health endpoint is reachable and healthy.' : `MCP health HTTP ${probe.status}`,
        provider: 'inneros',
        runtime: 'MCP',
        node: 'AMD .5',
        latency_ms: probe.latencyMs,
        evidence_ref: probe.ok ? `${MCP_BASE}/health` : null,
      };
    } else if (testId === 4) {
      let probe = await probeJson(`${INNEROS_API_BASE}/status`);
      if (!probe.ok && probe.status === 404) probe = await probeJson(`${INNEROS_API_BASE}/health`);
      result = {
        ok: probe.ok,
        test_id: testId,
        correlation_id: correlationId,
        status: probe.ok ? 'LIVE' : 'FAIL',
        title: definition.title,
        detail: probe.ok ? 'InnerOS control API responded successfully.' : `InnerOS control API HTTP ${probe.status}`,
        provider: 'inneros',
        runtime: 'FastAPI/InnerOS',
        node: 'AMD .5',
        latency_ms: probe.latencyMs,
      };
    } else if (testId === 5) {
      const evidenceId = `judge-${randomUUID()}`;
      const evidence = {
        correlation_id: correlationId,
        kind: 'live_write_read_probe',
        source: 'judge-console',
        created_at: nowIso(),
      };
      await db.collection(EVIDENCE_COLLECTION).doc(evidenceId).set(evidence);
      const readBack = await db.collection(EVIDENCE_COLLECTION).doc(evidenceId).get();
      const verified = readBack.exists && readBack.data()?.correlation_id === correlationId;
      result = {
        ok: verified,
        test_id: testId,
        correlation_id: correlationId,
        status: verified ? 'LIVE' : 'FAIL',
        title: definition.title,
        detail: verified ? 'Firestore evidence was written and read back successfully.' : 'Firestore write/read verification failed.',
        provider: 'google-cloud',
        runtime: 'Firestore',
        node: 'Google Cloud',
        latency_ms: Date.now() - started,
        evidence_ref: `firestore:${EVIDENCE_COLLECTION}/${evidenceId}`,
      };
    } else if (testId === 6) {
      const endpoint = (process.env.FUNCTION_GEMMA_ENDPOINT || '').trim();
      const historicalRef = (process.env.FUNCTION_GEMMA_EVIDENCE_REF || '').trim() || null;
      if (!endpoint) {
        result = {
          ok: true,
          test_id: testId,
          correlation_id: correlationId,
          status: 'PARTIAL',
          title: definition.title,
          detail: 'HISTORICAL PROVEN · CURRENTLY NOT_RUNNING · READY_TO_REDEPLOY. No live endpoint is configured, so the console does not fabricate a live PASS.',
          provider: 'google',
          model: 'FunctionGemma',
          runtime: 'Vertex AI / Model Garden (historical)',
          node: 'Google Cloud',
          latency_ms: Date.now() - started,
          evidence_ref: historicalRef,
        };
      } else {
        const probe = await probeJson(endpoint, 12_000);
        result = {
          ok: probe.ok,
          test_id: testId,
          correlation_id: correlationId,
          status: probe.ok ? 'LIVE' : 'PARTIAL',
          title: definition.title,
          detail: probe.ok ? 'FunctionGemma configured endpoint responded live.' : `Configured FunctionGemma endpoint did not respond successfully (HTTP ${probe.status}). Historical proof remains preserved.`,
          provider: 'google',
          model: 'FunctionGemma',
          runtime: 'Vertex AI / Model Garden',
          node: 'Google Cloud',
          latency_ms: probe.latencyMs,
          evidence_ref: historicalRef,
        };
      }
    } else {
      const probe = await probeJson(`${MCP_BASE}/version`);
      const body = probe.body as Record<string, unknown> | null;
      const toolCount = Number(body?.tool_count || body?.tools_count || 0);
      const verified = probe.ok && (toolCount > 0 || Boolean(body));
      result = {
        ok: verified,
        test_id: testId,
        correlation_id: correlationId,
        status: verified ? 'LIVE' : 'FAIL',
        title: definition.title,
        detail: verified ? `Agent/MCP catalog is reachable${toolCount > 0 ? ` with ${toolCount} tools` : ''}.` : `MCP version/catalog probe failed (HTTP ${probe.status}).`,
        provider: 'inneros',
        runtime: 'A2A + MCP Agent Fabric',
        node: 'AMD .5 / Intel .4',
        latency_ms: probe.latencyMs,
        evidence_ref: verified ? `${MCP_BASE}/version` : null,
      };
    }
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === 'AbortError';
    result = {
      ok: false,
      test_id: testId,
      correlation_id: correlationId,
      status: isTimeout ? 'TIMEOUT' : 'ERROR',
      title: definition.title,
      detail: error instanceof Error ? error.message : 'Judge test failed',
      latency_ms: Date.now() - started,
    };
  }

  result = { ...result, test_id: testId, title: definition.title };
  const persisted = await writeTrace(makeTrace(correlationId, result.status, 'test_result', result.detail.slice(0, 600), {
    test_id: testId,
    target: definition.capability,
    protocol: 'JUDGE',
    provider: result.provider,
    model: result.model,
    runtime: result.runtime,
    node: result.node,
    latency_ms: result.latency_ms,
    evidence_ref: result.evidence_ref,
  }));
  return { ...result, trace_persisted: persisted };
}

async function readTrace(limit = 80): Promise<{ events: JudgeTraceEvent[]; degraded: boolean }> {
  try {
    const snapshot = await db.collection(TRACE_COLLECTION).orderBy('timestamp', 'desc').limit(Math.max(1, Math.min(limit, 120))).get();
    const events = snapshot.docs.map((doc) => doc.data() as JudgeTraceEvent).reverse();
    return { events, degraded: false };
  } catch (error) {
    console.error('judge_trace_read_failed', error);
    return { events: [], degraded: true };
  }
}

export async function GET() {
  const trace = await readTrace(80);
  return NextResponse.json({
    ok: true,
    generated_at: nowIso(),
    tests: JUDGE_TESTS,
    trace: trace.events,
    trace_status: trace.degraded ? 'DEGRADED' : 'LIVE',
    truth: {
      function_gemma: 'HISTORICAL_PROVEN_CURRENTLY_NOT_RUNNING_READY_TO_REDEPLOY',
      mi325x: 'HISTORICAL_PROVEN_EVIDENCE_PRESERVED_OWNER_APPROVED_DESTROYED',
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = String(body?.action || '').trim().toLowerCase();
    if (action === 'aria') {
      const prompt = String(body?.prompt || '').trim();
      if (!prompt) return NextResponse.json({ ok: false, error: 'prompt_required' }, { status: 400 });
      const providerRaw = String(body?.provider || 'auto').toLowerCase();
      const provider: JudgeProvider = providerRaw === 'local' || providerRaw === 'gemini' ? providerRaw : 'auto';
      return NextResponse.json(await runAria(prompt, provider));
    }
    if (action === 'run-test') {
      const testId = Number(body?.test_id);
      if (!Number.isInteger(testId) || testId < 1 || testId > 7) {
        return NextResponse.json({ ok: false, error: 'test_id_must_be_1_to_7' }, { status: 400 });
      }
      return NextResponse.json(await runTest(testId));
    }
    return NextResponse.json({ ok: false, error: 'unsupported_action' }, { status: 400 });
  } catch (error) {
    console.error('judge_api_error', error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'judge_api_error' }, { status: 500 });
  }
}
