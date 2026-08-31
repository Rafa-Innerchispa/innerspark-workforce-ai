import {
  agentActivityToTrace,
  filterTraceEvents,
  mergeTraceEvents,
  defaultTraceFilter,
} from '@/lib/judgeGlobalTrace';
import type { JudgeTraceEvent } from '@/lib/judgeConsoleApi';

describe('judgeGlobalTrace', () => {
  const base: JudgeTraceEvent[] = [
    {
      correlation_id: 'run-a',
      protocol: 'a2a',
      agent_id: 'AG-25',
      tool: 'a2a_dispatch',
      status: 'OK',
      ts_start_ms: 200,
    },
    {
      correlation_id: 'run-b',
      protocol: 'mcp',
      tool: 'judge_workflow_start',
      model: 'gemini',
      provider: 'google',
      status: 'OK',
      ts_start_ms: 100,
    },
    {
      correlation_id: 'run-c',
      provider: 'digitalocean-amd-cloud',
      runtime: 'ephemeral_cloud_gpu',
      status: 'OK',
      ts_start_ms: 50,
    },
  ];

  it('merges and sorts by timestamp desc', () => {
    const merged = mergeTraceEvents(base, [
      { correlation_id: 'run-a', tool: 'dup', ts_start_ms: 199, status: 'OK' },
    ]);
    expect(merged[0].ts_start_ms).toBe(200);
    expect(merged.length).toBe(4);
  });

  it('filters current run by correlation_id', () => {
    const filtered = filterTraceEvents(base, 'current_run', 'run-a');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].agent_id).toBe('AG-25');
  });

  it('defaults to current_run when correlation active', () => {
    expect(defaultTraceFilter('run-a')).toBe('current_run');
    expect(defaultTraceFilter(null)).toBe('all');
  });

  it('filters cloud and a2a buckets', () => {
    expect(filterTraceEvents(base, 'cloud', null).length).toBeGreaterThanOrEqual(1);
    expect(filterTraceEvents(base, 'a2a', null)).toHaveLength(1);
  });

  it('normalizes agent activity rows', () => {
    const ev = agentActivityToTrace({
      agent: 'codex',
      action: 'a2a_dispatch',
      correlation_id: 'x1',
      message_id: 'msg_123',
      ops_task_id: 'ops_123',
      finished_at: '2026-08-31T00:00:00.000Z',
      status: 'PASS',
    });
    expect(ev.protocol).toBe('agent_activity');
    expect(ev.correlation_id).toBe('x1');
    expect(ev.event_type).toBe('a2a_dispatch');
    expect(ev.message_id).toBe('msg_123');
    expect(ev.task_id).toBe('ops_123');
    expect(ev.source_collection).toBe('ralfia_agent_activity');
    expect(ev.source_kind).toBe('live_activity');
  });
});
