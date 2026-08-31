import { isSimpleGreeting, naturalGreetingText } from '@/lib/judgeAriaGreeting';
import { JUDGE_DEMO_STEPS } from '@/lib/judgeDemoSteps';
import { evaluateJudgeDemoStep } from '@/lib/judgeDemoEval';
import { runJudgeMcpAction } from '@/lib/judgeConsoleApi';
import type { McpBridgeResult } from '@/lib/ralfiaMcpBridge';

export type JudgeAriaReply = {
  text: string;
  source: 'judge_aria';
  correlation_id?: string;
  action?: string;
  ok?: boolean;
  actionStatus?: string;
};

function newCorrelationId(): string {
  return `judge-aria-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function buildJudgeHelpCatalog(lang: 'es' | 'en'): string {
  const intro =
    lang === 'es'
      ? 'Soy ARIA en modo Judge. Ejecuto los 7 pasos del demo sobre MCP real (sin PASS simulado):'
      : 'I am ARIA in Judge Mode. I run the 7-step demo on live MCP (no simulated PASS):';

  const steps = JUDGE_DEMO_STEPS.map((s, i) => `${i + 1}. ${s.labelEn}\n   ${s.purpose}`).join('\n');

  const footer =
    lang === 'es'
      ? '\n\nComandos:\n• "run test 1" … "run test 7"\n• "run all seven tests"\n• "what can you do here?"'
      : '\n\nCommands:\n• "run test 1" … "run test 7"\n• "run all seven tests"\n• "what can you do here?"';

  return `${intro}\n\n${steps}${footer}`;
}

function wantsAllTests(lower: string): boolean {
  return /\b(run all|all seven|full demo|7 steps|seven tests|demo script|run everything)\b/.test(lower);
}

function wantsTraceHelp(lower: string): boolean {
  return /\b(trace|telemetry|live trace|global trace)\b/.test(lower);
}

function wantsHelp(lower: string): boolean {
  return /\b(what can you do|help|commands|comandos|qu[eé] puedes hacer)\b/.test(lower);
}

function parseRunTestIndex(lower: string): number | null {
  const m =
    lower.match(/\b(?:run|ejecuta|opcion|option|test)\s*(?:#|n[oº.]?\s*)?(\d)\b/) ||
    lower.match(/\b(?:run test|ejecuta(?:r)?(?: la)? opci[oó]n)\s*(\d)\b/);
  if (!m) return null;
  const idx = Number(m[1]);
  return idx >= 1 && idx <= JUDGE_DEMO_STEPS.length ? idx - 1 : null;
}

function isBackendLeak(text: string): boolean {
  return /(unauthorized|x-api-key|oauth bearer|mongo|mongodb|firestore|mcp|traceback|stack|failed_precondition|econnrefused|timed out|timeout|invalid_json|enotfound|error:)/i.test(
    text
  );
}

function isAnswerLeak(text: string): boolean {
  return /(unauthorized|x-api-key|oauth bearer|traceback|stack|failed_precondition|econnrefused|timed out|timeout|invalid_json|enotfound|mongo(server)?error|firestore .*error|mcp .*error|error:)/i.test(
    text
  );
}

function safeBackendUnavailableText(lang: 'es' | 'en', correlation: string): string {
  return lang === 'es'
    ? `Estoy aquí contigo. En este momento una conexión interna no respondió bien, así que no voy a mostrarte detalles técnicos. Puedes seguir conversando o ejecutar una prueba del Judge; dejé la referencia ${correlation} para revisar la traza.`
    : `I am here with you. An internal connection did not respond cleanly right now, so I will not expose technical details in the chat. You can keep talking or run a Judge test; I kept reference ${correlation} for the trace.`;
}

function normalizeAskAriaReply(res: McpBridgeResult, cid: string, lang: 'es' | 'en'): JudgeAriaReply {
  const correlation = String(res.correlation_id || cid);
  const answer = String(res.answer || res.text || res.message || '').trim();
  const status = String(res.status || '').toUpperCase();
  const failureText = `${res.error || ''} ${answer}`.toLowerCase();
  const leakedBackendError = isBackendLeak(String(res.error || '')) || isAnswerLeak(answer);

  let text = answer;
  if (leakedBackendError || res.ok === false) {
    text = safeBackendUnavailableText(lang, correlation);
  }
  if (!text && res.ok !== false) {
    text =
      lang === 'es'
        ? `Te escucho. La acción quedó registrada, pero no recibí una respuesta final clara. Puedes intentar de nuevo o ejecutar una prueba específica. Referencia: ${correlation}.`
        : `I hear you. The action was recorded, but I did not receive a clear final answer. You can try again or run a specific test. Reference: ${correlation}.`;
  }

  const ok =
    res.ok !== false &&
    status !== 'FAIL' &&
    status !== 'ERROR' &&
    status !== 'UNAUTHORIZED' &&
    !leakedBackendError &&
    !failureText.includes('unauthorized') &&
    Boolean(answer);
  const actionStatus =
    status === 'PARTIAL' || !answer || leakedBackendError
      ? 'PARTIAL'
      : ok
        ? 'LIVE'
        : status === 'NOT_READY' || failureText.includes('unauthorized')
          ? 'NOT_READY'
          : 'PARTIAL';

  return {
    text: text.slice(0, 2400),
    source: 'judge_aria',
    correlation_id: correlation,
    action: 'ask_aria',
    ok,
    actionStatus,
  };
}

/** Codex backend path: judge_safe_trigger(ask_aria) → local-first LLM + trace. */
async function invokeAskAria(prompt: string, cid: string, lang: 'es' | 'en'): Promise<JudgeAriaReply> {
  const res = await runJudgeMcpAction('safe_trigger', {
    trigger: 'ask_aria',
    prompt,
    dry_run: false,
    correlation_id: cid,
  });
  return normalizeAskAriaReply(res, cid, lang);
}

export async function handleJudgeAriaPrompt(
  prompt: string,
  lang: 'es' | 'en' = 'en',
  correlationId?: string
): Promise<JudgeAriaReply> {
  const lower = prompt.toLowerCase().trim();
  const cid = correlationId || newCorrelationId();

  if (wantsAllTests(lower)) {
    const res = await runJudgeMcpAction('demo_recording_suite', { lang, correlation_id: cid });
    const steps =
      (res.steps as { ok: boolean; label: string; detail?: string }[] | undefined) || [];
    const pass = steps.filter((s) => s.ok).length;
    const lines = steps.map((s) => `${s.ok ? 'PASS' : 'FAIL'} · ${s.label}: ${s.detail || '—'}`).join('\n');
    const correlation = String(res.correlation_id || cid);
    return {
      text: `Full demo script: ${pass === steps.length ? 'PASS' : 'PARTIAL'} (${pass}/${steps.length})\n${lines}\ncorrelation_id: ${correlation}`,
      source: 'judge_aria',
      correlation_id: correlation,
      action: 'demo_recording_suite',
      ok: pass === steps.length,
      actionStatus: pass === steps.length ? 'LIVE' : 'PARTIAL',
    };
  }

  if (wantsHelp(lower)) {
    return {
      text: buildJudgeHelpCatalog(lang),
      source: 'judge_aria',
      correlation_id: cid,
      action: 'help_catalog',
      ok: true,
      actionStatus: 'LIVE',
    };
  }

  if (wantsTraceHelp(lower)) {
    return {
      text:
        lang === 'es'
          ? 'Global Live Trace está a la derecha (poll 4s). Ejecuta un test y filtra por correlation_id.'
          : 'Global Live Trace is on the right (4s poll). Run any test and filter by correlation_id.',
      source: 'judge_aria',
      correlation_id: cid,
      action: 'trace_help',
      ok: true,
      actionStatus: 'LIVE',
    };
  }

  const stepIndex = parseRunTestIndex(lower);
  if (stepIndex !== null) {
    const step = JUDGE_DEMO_STEPS[stepIndex];
    const stepCid = `${cid}-${step.id}`;
    const res = await runJudgeMcpAction(step.action, { ...(step.payload || {}), correlation_id: stepCid });
    const verdict = evaluateJudgeDemoStep(step.action, res, lang, step);
    return {
      text: `${verdict.ok ? 'PASS' : 'PARTIAL'} · Test ${stepIndex + 1}: ${step.labelEn}\n${verdict.detail || '—'}\ncorrelation_id: ${String(res.correlation_id || stepCid)}`,
      source: 'judge_aria',
      correlation_id: String(res.correlation_id || stepCid),
      action: step.action,
      ok: verdict.ok,
      actionStatus: verdict.ok ? 'LIVE' : 'PARTIAL',
    };
  }

  if (isSimpleGreeting(lower)) {
    return {
      text: naturalGreetingText(lang),
      source: 'judge_aria',
      correlation_id: cid,
      action: 'greeting',
      ok: true,
      actionStatus: 'LIVE',
    };
  }

  // All conversational + guided test prompts → Codex real backend (judge_safe_trigger ask_aria)
  return invokeAskAria(prompt, cid, lang);
}
