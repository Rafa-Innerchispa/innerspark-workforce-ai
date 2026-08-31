import { JUDGE_DEMO_STEPS } from '@/lib/judgeDemoSteps';
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

function normalizeAskAriaReply(res: McpBridgeResult, cid: string, lang: 'es' | 'en'): JudgeAriaReply {
  const correlation = String(res.correlation_id || cid);
  const answer = String(res.answer || res.text || res.message || '').trim();
  const status = String(res.status || '').toUpperCase();
  const model = (res.model_result as { model?: string } | undefined)?.model;
  const provider = (res.model_result as { provider?: string } | undefined)?.provider;
  const runtime = (res.model_result as { runtime?: string } | undefined)?.runtime;
  const failureText = `${res.error || ''} ${answer}`.toLowerCase();

  let text = answer;
  if (!text && res.ok === false) {
    text = String(res.error || (lang === 'es' ? 'ARIA Judge no disponible.' : 'Judge ARIA unavailable.')).slice(0, 400);
  }
  if (!text && res.ok !== false) {
    text =
      lang === 'es'
        ? 'ARIA recibió la solicitud y el backend la aceptó, pero no devolvió texto final. Estado: PARTIAL. Revisa Global Live Trace con el correlation_id mostrado para ver el resultado real.'
        : 'ARIA received the request and the backend accepted it, but no final answer text was returned. Status: PARTIAL. Check Global Live Trace with the correlation_id below for the real backend result.';
  }
  if (model || provider) {
    text += `\n\n[${provider || 'local'} · ${model || runtime || 'model'} · …${correlation.slice(-10)}]`;
  } else if (correlation) {
    text += `\n\ncorrelation …${correlation.slice(-10)}`;
  }

  const ok =
    res.ok !== false &&
    status !== 'FAIL' &&
    status !== 'ERROR' &&
    status !== 'UNAUTHORIZED' &&
    !failureText.includes('unauthorized') &&
    Boolean(answer);
  const actionStatus =
    status === 'PARTIAL' || !answer
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

  if (wantsTraceHelp(lower)) {
    return {
      text:
        lang === 'es'
          ? 'Global Live Trace está arriba (poll 4s). Ejecuta un test y filtra por correlation_id.'
          : 'Global Live Trace is sticky above (4s poll). Run any test and filter by correlation_id.',
      source: 'judge_aria',
    };
  }

  if (/^(hi|hello|hola|hey)[\s,!?.]*$/i.test(lower)) {
    return invokeAskAria(
      lang === 'es' ? 'Hola — ¿qué puedes hacer en Judge Mode?' : 'Hello — what can you do in Judge Mode?',
      cid,
      lang
    );
  }

  // All conversational + guided test prompts → Codex real backend (judge_safe_trigger ask_aria)
  return invokeAskAria(prompt, cid, lang);
}
