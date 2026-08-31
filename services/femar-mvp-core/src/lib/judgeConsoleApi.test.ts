import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { loadGlobalTraceEvents } from '@/lib/judgeConsoleApi';
import { runWithJudgeTraceContract } from '@/lib/judgeTraceContract';

jest.mock('@/lib/ralfiaMcpBridge', () => ({
  callMcpTool: jest.fn(async (tool: string) => {
    if (tool === 'judge_trace_current') {
      return {
        ok: true,
        events: [
          {
            correlation_id: 'other-run',
            event_type: 'noise',
            status: 'COMPLETED',
            ts_start_ms: 3,
          },
        ],
      };
    }
    if (tool === 'judge_trace_history') {
      return {
        ok: true,
        events: [
          {
            correlation_id: 'target-run',
            event_type: 'history',
            status: 'PASS',
            ts_start_ms: 2,
          },
        ],
      };
    }
    return { ok: true, items: [] };
  }),
}));

describe('judgeConsoleApi trace loading', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), 'judge-console-trace-'));
    process.env.JUDGE_TRACE_CONTRACT_PATH = path.join(dir, 'trace.jsonl');
  });

  afterEach(async () => {
    delete process.env.JUDGE_TRACE_CONTRACT_PATH;
    await rm(dir, { recursive: true, force: true });
  });

  it('scopes all merged trace sources to the requested correlation_id', async () => {
    await runWithJudgeTraceContract('safe_trigger', { correlation_id: 'target-run' }, async () => ({
      ok: true,
    }));

    const trace = await loadGlobalTraceEvents({
      correlationId: 'target-run',
      includeActivity: false,
    });

    expect(trace.events.length).toBeGreaterThanOrEqual(3);
    expect(trace.events.every((event) => event.correlation_id === 'target-run')).toBe(true);
    expect(trace.events.some((event) => event.event_type === 'judge_test_start')).toBe(true);
    expect(trace.events.some((event) => event.event_type === 'judge_test_result')).toBe(true);
  });
});
