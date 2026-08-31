import { executeModuleAction } from '@/lib/iskconActionEngine';
import { actionsForModule } from '@/lib/moduleActions';
import type { McpBridgeResult } from '@/lib/ralfiaMcpBridge';
import { runJudgeRecordingSuite } from '@/lib/judgeDemoEval';

export { runJudgeRecordingSuite, JUDGE_DEMO_STEPS, evaluateJudgeDemoStep } from '@/lib/judgeDemoEval';
export type { JudgeDemoStepResult } from '@/lib/judgeDemoEval';

export async function runIskconEmergencyPdfDemo(): Promise<McpBridgeResult> {
  const festivals = actionsForModule('iskcon-desk').find((a) => a.id === 'festivals');
  if (!festivals) {
    return { ok: false, error: 'festivals_action_missing' };
  }
  const result = await executeModuleAction(festivals, 'es', 'Plan de emergencia Panihati domingo ISKCON Guayaquil', {
    hubId: 'festivals',
    subActionId: 'emergency',
  });
  const pdf = result.artifacts?.find((a) => a.mime === 'application/pdf' || a.url.includes('.pdf'));
  return {
    ok: result.ok,
    status: result.status,
    text: result.text,
    artifacts: result.artifacts,
    pdf_url: pdf?.url,
  };
}
