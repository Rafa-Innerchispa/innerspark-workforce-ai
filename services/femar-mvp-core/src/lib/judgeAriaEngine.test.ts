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
    if (action === 'safe_trigger') {
      return {
        ok: true,
        correlation_id: payload.correlation_id || 'cid-step1',
        status: 'OK',
      };
    }
    if (action === 'a2a_handshake') {
      return {
        ok: true,
        correlation_id: payload.correlation_id || 'cid-step1',
        status: { state: 'online' },
        agent_count: 58,
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
  beforeEach(() => {
    const { runJudgeMcpAction } = jest.requireMock('@/lib/judgeConsoleApi');
    runJudgeMcpAction.mockClear();
  });

  it('builds help catalog with seven steps', () => {
    const text = buildJudgeHelpCatalog('en');
    expect(text).toContain('Judge Mode');
    expect(text.match(/\d\. /g)?.length).toBeGreaterThanOrEqual(7);
  });

  it('returns local help catalog without MCP', async () => {
    const reply = await handleJudgeAriaPrompt('what can you do here?', 'en');
    expect(reply.action).toBe('help_catalog');
    expect(reply.actionStatus).toBe('LIVE');
    expect(reply.text).toContain('Judge Mode');
    expect(reply.text).not.toContain('Type help for modules');
  });

  it('routes conversational prompts through ask_aria backend', async () => {
    const reply = await handleJudgeAriaPrompt('explain the A2A bridge in one sentence', 'en');
    expect(reply.action).toBe('ask_aria');
    expect(reply.text).toContain('Judge-aware reply');
    expect(reply.text).not.toContain('local-intel-4');
    expect(reply.text).not.toContain('phi3.5');
    expect(reply.text).not.toContain('Type help for modules');
    expect(reply.correlation_id).toBeTruthy();
  });

  it('answers simple greetings naturally without technical Judge boilerplate', async () => {
    const { runJudgeMcpAction } = jest.requireMock('@/lib/judgeConsoleApi');
    const before = runJudgeMcpAction.mock.calls.length;
    const reply = await handleJudgeAriaPrompt('hola', 'es', 'cid-hola');
    expect(reply.action).toBe('greeting');
    expect(reply.actionStatus).toBe('LIVE');
    expect(reply.text).toContain('¡Hola!');
    expect(reply.text).not.toContain('MCP');
    expect(reply.text).not.toContain('PASS simulado');
    expect(runJudgeMcpAction.mock.calls.length).toBe(before);
  });

  it('normalizes typo greetings like holña', async () => {
    const reply = await handleJudgeAriaPrompt('holña', 'es', 'cid-typo');
    expect(reply.action).toBe('greeting');
    expect(reply.text).toContain('ARIA');
  });

  it('turns an empty successful backend response into a truthful PARTIAL message', async () => {
    const { runJudgeMcpAction } = jest.requireMock('@/lib/judgeConsoleApi');
    runJudgeMcpAction.mockResolvedValueOnce({
      ok: true,
      correlation_id: 'cid-empty',
      status: 'OK',
    });
    const reply = await handleJudgeAriaPrompt('explain current status', 'en', 'cid-empty');
    expect(reply.action).toBe('ask_aria');
    expect(reply.ok).toBe(false);
    expect(reply.actionStatus).toBe('PARTIAL');
    expect(reply.text).toContain('clear final answer');
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
    const reply = await handleJudgeAriaPrompt('explain the current backend', 'en', 'cid-auth');
    expect(reply.ok).toBe(false);
    expect(reply.actionStatus).toBe('PARTIAL');
    expect(reply.text).not.toContain('Unauthorized');
    expect(reply.text).not.toContain('X-API-Key');
    expect(reply.text).toContain('cid-auth');
  });

  it('shields Mongo and MCP backend errors from chat text', async () => {
    const { runJudgeMcpAction } = jest.requireMock('@/lib/judgeConsoleApi');
    runJudgeMcpAction.mockResolvedValueOnce({
      ok: false,
      correlation_id: 'cid-mongo',
      error: 'MongoServerError: MCP invalid_json stack trace',
    });
    const reply = await handleJudgeAriaPrompt('tell me something useful', 'en', 'cid-mongo');
    expect(reply.ok).toBe(false);
    expect(reply.actionStatus).toBe('PARTIAL');
    expect(reply.text).not.toContain('MongoServerError');
    expect(reply.text).not.toContain('invalid_json');
    expect(reply.text).toContain('cid-mongo');
  });

  it('explains test N without executing MCP', async () => {
    const { runJudgeMcpAction } = jest.requireMock('@/lib/judgeConsoleApi');
    const before = runJudgeMcpAction.mock.calls.length;
    const reply = await handleJudgeAriaPrompt('what does test 3 prove?', 'en');
    expect(reply.action).toBe('explain_test');
    expect(reply.ok).toBe(true);
    expect(reply.text).toContain('Test 3');
    expect(reply.text).toContain('PASS criteria');
    expect(reply.text).not.toContain('PASS · Test 3');
    expect(runJudgeMcpAction.mock.calls.length).toBe(before);
  });

  it('runs guided test N via real MCP step action', async () => {
    const reply = await handleJudgeAriaPrompt('run test 1', 'en');
    expect(reply.action).toBe('safe_trigger');
    expect(reply.text).toContain('Test 1');
    expect(reply.correlation_id).toBeTruthy();
  });

  it('runs full demo suite separately', async () => {
    const reply = await handleJudgeAriaPrompt('run all seven tests', 'en');
    expect(reply.action).toBe('demo_recording_suite');
  });
});
