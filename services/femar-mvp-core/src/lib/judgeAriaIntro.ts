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
    return `Soy ARIA, tu guía en el Judge Workspace.\n\nAquí hay 7 pruebas en vivo. Puedes ejecutarlas de dos maneras: pedírmelas aquí (por ejemplo, "run test 2") o usar los botones de las 7 pruebas que aparecen debajo. Ambos caminos ejecutan la misma acción real.\n\nCuando una prueba corre, verás mi respuesta aquí, el bloque "Proof produced" en su tarjeta y la evidencia de ejecución al lado en Global Live Trace.\n\n${steps}\n\nPuedes empezar con cualquier prueba del 1 al 7, ejecutar todas en orden o hacerme una pregunta libre para verificar una respuesta en vivo.`;
  }
  return `I am ARIA, your guide in the Judge Workspace.\n\nThere are 7 live tests. You can run them in two ways: ask me here (for example, "run test 2") or use the seven test buttons below. Both paths execute the same real action.\n\nWhen a test runs, you will see my response here, a "Proof produced" block on its card, and the execution evidence beside me in Global Live Trace.\n\n${steps}\n\nStart with any test from 1 to 7, run them in order, or ask me a free-form question to verify a live response.`;
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
