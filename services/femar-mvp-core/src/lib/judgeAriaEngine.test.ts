import { buildJudgeHelpCatalog, handleJudgeAriaPrompt } from '@/lib/judgeAriaEngine';

jest.mock('@/lib/judgeConsoleApi', () => ({
  runJudgeMcpAction: jest.fn(async (action: string, payload: Record<string, unknown>) => {
    if (action === 'safe_trigger' && payload.trigger === 'ask_aria') {
      return {
        ok: true,
        correlation_id: payload.correlation_id || 'cid-ask',
        status: 'OK',
        answer: `Judge-aware reply for: ${payload.prompt}`,
        model_result: { model: 'phi3.5:3.8b', provider: 'local-intel-4', runtime: 'local_model' },
      };
    }
    if (action === 'demo_recording_suite') {
      return {
        ok: true,
        correlation_id: 'cid-suite',
        steps: [{ ok: true, label: '1 · Verify System', detail: 'ok' }],
      };
    }
    return { ok: false, error: `unexpected:${action}` };
  }),
}));

describe('judgeAriaEngine', () => {
  it('builds help catalog with seven steps', () => {
    const text = buildJudgeHelpCatalog('en');
    expect(text).toContain('Judge Mode');
    expect(text.match(/\d\. /g)?.length).toBeGreaterThanOrEqual(7);
  });

  it('routes conversational prompts through ask_aria backend', async () => {
    const reply = await handleJudgeAriaPrompt('what can you do here?', 'en');
    expect(reply.action).toBe('ask_aria');
    expect(reply.text).toContain('Judge-aware reply');
    expect(reply.text).not.toContain('Type help for modules');
    expect(reply.correlation_id).toBeTruthy();
  });

  it('turns an empty successful backend response into a truthful PARTIAL message', async () => {
    const { runJudgeMcpAction } = jest.requireMock('@/lib/judgeConsoleApi');
    runJudgeMcpAction.mockResolvedValueOnce({
      ok: true,
      correlation_id: 'cid-empty',
      status: 'OK',
    });
    const reply = await handleJudgeAriaPrompt('hola', 'en', 'cid-empty');
    expect(reply.action).toBe('ask_aria');
    expect(reply.ok).toBe(false);
    expect(reply.actionStatus).toBe('PARTIAL');
    expect(reply.text).toContain('no final answer text');
    expect(reply.text).toContain('cid-empty');
  });

  it('does not mark unauthorized backend text as LIVE', async () => {
    const { runJudgeMcpAction } = jest.requireMock('@/lib/judgeConsoleApi');
    runJudgeMcpAction.mockResolvedValueOnce({
      ok: true,
      correlation_id: 'cid-auth',
      status: 'OK',
      text: 'Unauthorized: valid X-API-Key or OAuth Bearer token required',
    });
    const reply = await handleJudgeAriaPrompt('hola', 'en', 'cid-auth');
    expect(reply.ok).toBe(false);
    expect(reply.actionStatus).toBe('NOT_READY');
    expect(reply.text).toContain('Unauthorized');
  });

  it('routes run test 1 through ask_aria per Codex contract', async () => {
    const reply = await handleJudgeAriaPrompt('run test 1', 'en');
    expect(reply.action).toBe('ask_aria');
    expect(reply.text).toContain('run test 1');
  });

  it('runs full demo suite separately', async () => {
    const reply = await handleJudgeAriaPrompt('run all seven tests', 'en');
    expect(reply.action).toBe('demo_recording_suite');
  });
});
