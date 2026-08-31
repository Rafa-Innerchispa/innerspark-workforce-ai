import { groupTraceEventsByRun, humanEventLabel, resolveRunMeta } from '@/lib/judgeTracePresentation';
import type { JudgeTraceEvent } from '@/lib/judgeConsoleApi';

describe('judgeTracePresentation', () => {
  it('groups events by correlation and resolves demo step metadata', () => {
    const correlation = 'judge-ui-trace-final-20260831-verify-123-abc';
    const events: JudgeTraceEvent[] = [
      {
        correlation_id: correlation,
        event_type: 'judge_test_start',
        status: 'RUNNING',
        ts_start_ms: 1000,
        action: 'safe_trigger',
      },
      {
        correlation_id: correlation,
        event_type: 'judge_test_result',
        status: 'PASS',
        ts_start_ms: 2000,
        action: 'safe_trigger',
      },
    ];
    const groups = groupTraceEventsByRun(events, correlation);
    expect(groups).toHaveLength(1);
    expect(groups[0].testNumber).toBe(1);
    expect(groups[0].terminalStatus).toBe('PASS');
    const meta = resolveRunMeta(events, correlation);
    expect(meta.testTitle).toContain('MCP health');
    expect(humanEventLabel(events[0], meta)).toMatch(/Starting Test 1/i);
  });
});
