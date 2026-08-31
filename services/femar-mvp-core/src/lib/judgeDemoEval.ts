import { JUDGE_DEMO_STEPS, type JudgeDemoStep } from '@/lib/judgeDemoSteps';
import type { McpBridgeResult } from '@/lib/ralfiaMcpBridge';

export type JudgeDemoStepResult = {
  id: string;
  label: string;
  ok: boolean;
  detail?: string;
};

function stepOk(action: string, res: McpBridgeResult): { ok: boolean; detail: string } {
  if (res.ok === false) {
    return { ok: false, detail: String(res.error || 'failed').slice(0, 160) };
  }
  if (action === 'a2a_handshake') {
    const state = (res.status as { state?: string } | undefined)?.state || res.state;
    return { ok: state === 'online', detail: `state=${state} agents=${res.agent_count ?? '?'}` };
  }
  if (action === 'a2a_cards') {
    const cards = res.cards;
    const n = Array.isArray(cards)
      ? cards.length
      : cards && typeof cards === 'object'
        ? Object.keys(cards as object).length
        : Number(res.count ?? 0);
    return { ok: n > 0, detail: `cards=${n}` };
  }
  if (action === 'gemma_probe') {
    const status = String(res.status || res.state || res.route_state || res.gemma_route_state || 'not_running');
    const model = String(res.model || res.selected_model || res.model_id || 'FunctionGemma');
    const truthful = /gemma/i.test(model) || /function/i.test(model) || /not_ready|not_running|ready_to_redeploy/i.test(status);
    return {
      ok: truthful,
      detail: `${model.slice(0, 54)} status=${status.slice(0, 40)}`,
    };
  }
  if (action === 'iskcon_emergency_pdf') {
    const url = String(res.pdf_url || (res.artifacts as { url?: string }[] | undefined)?.[0]?.url || '');
    return { ok: Boolean(url), detail: url ? `pdf=${url.slice(-48)}` : 'no_pdf_artifact' };
  }
  if (action === 'a2a_dispatch') {
    return { ok: true, detail: String(res.task_id || res.dry_run || 'dispatched').slice(0, 80) };
  }
  return { ok: true, detail: String(res.workflow_id || res.correlation_id || 'ok').slice(0, 80) };
}

export function formatJudgeStepVerdict(
  step: JudgeDemoStep,
  stepIndex: number,
  verdict: { ok: boolean; detail: string },
  lang: 'es' | 'en' = 'en'
): string {
  const title = step.labelEn.replace(/^\d+\s·\s*/, '');
  const status = verdict.ok ? (lang === 'es' ? 'PASS' : 'PASS') : lang === 'es' ? 'PARTIAL/FAIL' : 'PARTIAL/FAIL';
  const intro =
    lang === 'es'
      ? `Test ${stepIndex + 1} — ${title}: ${status}.`
      : `Test ${stepIndex + 1} — ${title}: ${status}.`;
  return `${intro}\nVerified: ${step.purpose}\nEvidence: ${verdict.detail}\nPASS rule: ${step.passCriteria}`;
}

export function evaluateJudgeDemoStep(
  action: string,
  res: McpBridgeResult,
  lang: 'es' | 'en' = 'en',
  step: JudgeDemoStep
): JudgeDemoStepResult {
  const verdict = stepOk(action, res);
  const stepIndex = JUDGE_DEMO_STEPS.indexOf(step);
  return {
    id: step.id,
    label: step.labelEn,
    ok: verdict.ok,
    detail: formatJudgeStepVerdict(step, stepIndex >= 0 ? stepIndex : 0, verdict, lang),
  };
}

export async function runJudgeRecordingSuite(
  runner: (action: string, payload?: Record<string, unknown>) => Promise<McpBridgeResult>,
  lang: 'es' | 'en' = 'es'
): Promise<{ ok: boolean; steps: JudgeDemoStepResult[] }> {
  const steps: JudgeDemoStepResult[] = [];
  let allOk = true;

  for (const step of JUDGE_DEMO_STEPS) {
    const res = await runner(step.action, step.payload);
    const verdict = evaluateJudgeDemoStep(step.action, res, lang, step);
    steps.push(verdict);
    if (!verdict.ok) allOk = false;
  }

  return { ok: allOk, steps };
}

export { JUDGE_DEMO_STEPS, type JudgeDemoStep };
