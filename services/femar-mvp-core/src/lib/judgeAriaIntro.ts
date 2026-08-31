import { JUDGE_DEMO_STEPS } from '@/lib/judgeDemoSteps';

export const JUDGE_ARIA_STEP_COMMANDS = JUDGE_DEMO_STEPS.map((step, index) => ({
  step: index + 1,
  id: step.id,
  label: step.labelEn.replace(/^\d+\s·\s*/, ''),
  command: `run test ${index + 1}`,
}));

export function judgeAriaOpeningMessage(lang: 'es' | 'en'): string {
  const steps = JUDGE_ARIA_STEP_COMMANDS.map((item) => `${item.step}. ${item.label}`).join('\n');
  if (lang === 'es') {
    return `Soy ARIA, tu guía en el Judge Workspace.\n\nTe acompaño en 7 pruebas en vivo sobre MCP real. Ejecútalas en orden o pídeme cualquier paso.\n\n${steps}\n\nComandos: "run test 1" … "run test 7" · "run all seven tests" · pregúntame lo que quieras para verificar respuesta en vivo.`;
  }
  return `I am ARIA, your guide in the Judge Workspace.\n\nI'll guide you through 7 live proofs on real MCP. Run them in order or ask me to run any step.\n\n${steps}\n\nCommands: "run test 1" … "run test 7" · "run all seven tests" · ask me anything to verify a live response.`;
}

export function judgeAriaStepCompletionMessage(
  stepIndex: number,
  ok: boolean,
  proofSummary: string,
  lang: 'es' | 'en'
): string {
  const step = JUDGE_DEMO_STEPS[stepIndex];
  const title = step.labelEn.replace(/^\d+\s·\s*/, '');
  const status = ok ? (lang === 'es' ? 'completo' : 'complete') : lang === 'es' ? 'parcial' : 'partial';
  const next = stepIndex + 1 < JUDGE_DEMO_STEPS.length ? stepIndex + 2 : null;
  const nextLine =
    next != null
      ? lang === 'es'
        ? `\n\nSiguiente: Paso ${next} — ${JUDGE_DEMO_STEPS[next - 1].labelEn.replace(/^\d+\s·\s*/, '')}. Di "run test ${next}".`
        : `\n\nNext: Step ${next} — ${JUDGE_DEMO_STEPS[next - 1].labelEn.replace(/^\d+\s·\s*/, '')}. Say "run test ${next}".`
      : lang === 'es'
        ? '\n\nHas completado las 7 pruebas. Pregúntame cualquier cosa o revisa Global Live Trace.'
        : '\n\nAll seven proofs are done. Ask me anything or review Global Live Trace.';
  return lang === 'es'
    ? `Paso ${stepIndex + 1} ${status} — ${title}.\n\nPrueba generada:\n${proofSummary}${nextLine}`
    : `Step ${stepIndex + 1} ${status} — ${title}.\n\nProof produced:\n${proofSummary}${nextLine}`;
}

export function judgeProvenanceLabel(action?: string): 'LOCAL COMMAND' | 'LIVE MODEL' | 'LIVE MCP' {
  if (!action) return 'LOCAL COMMAND';
  if (['greeting', 'help_catalog', 'explain_test', 'trace_help'].includes(action)) return 'LOCAL COMMAND';
  if (action === 'ask_aria') return 'LIVE MODEL';
  return 'LIVE MCP';
}
