import { JUDGE_DEMO_STEPS, runJudgeRecordingSuite } from '@/lib/judgeDemoEval';
import type { McpBridgeResult } from '@/lib/ralfiaMcpBridge';

describe('judgeRecordingSuite', () => {
  it('defines seven demo steps for recording', () => {
    expect(JUDGE_DEMO_STEPS).toHaveLength(7);
    expect(JUDGE_DEMO_STEPS.map((s) => s.id)).toContain('emergency_pdf');
  });

  it('marks suite PASS when all steps succeed', async () => {
    const runner = jest.fn(async (action: string): Promise<McpBridgeResult> => {
      if (action === 'a2a_handshake') return { ok: true, status: { state: 'online' }, agent_count: 58 };
      if (action === 'a2a_cards') return { ok: true, cards: [{ id: 'AG-25' }] };
      if (action === 'iskcon_emergency_pdf') return { ok: true, pdf_url: '/api/artifacts/x.pdf' };
      return { ok: true, workflow_id: 'wf-demo' };
    });

    const result = await runJudgeRecordingSuite(runner, 'es');
    expect(result.ok).toBe(true);
    expect(result.steps.every((s) => s.ok)).toBe(true);
  });

  it('marks suite PARTIAL when a step fails', async () => {
    const runner = jest.fn(async (action: string): Promise<McpBridgeResult> => {
      if (action === 'a2a_handshake') return { ok: false, error: 'offline' };
      return { ok: true };
    });

    const result = await runJudgeRecordingSuite(runner, 'en');
    expect(result.ok).toBe(false);
    expect(result.steps.find((s) => s.id === 'a2a')?.ok).toBe(false);
  });
});
