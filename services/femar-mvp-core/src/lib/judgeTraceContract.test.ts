import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {
  loadJudgeTraceContractEvents,
  runWithJudgeTraceContract,
} from '@/lib/judgeTraceContract';

describe('judgeTraceContract', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), 'judge-trace-contract-'));
    process.env.JUDGE_TRACE_CONTRACT_PATH = path.join(dir, 'trace.jsonl');
  });

  afterEach(async () => {
    delete process.env.JUDGE_TRACE_CONTRACT_PATH;
    await rm(dir, { recursive: true, force: true });
  });

  it('persists START and RESULT events with the same correlation_id', async () => {
    const result = await runWithJudgeTraceContract(
      'safe_trigger',
      { correlation_id: 'judge-correlation-1' },
      async () => ({
        ok: true,
        provider: 'local-intel-4',
        model: 'phi3.5:3.8b',
        runtime: 'ollama',
      })
    );

    expect(result.ok).toBe(true);
    expect(result.correlation_id).toBe('judge-correlation-1');
    expect(result.trace_persisted).toBe(true);

    const trace = await loadJudgeTraceContractEvents({ correlationId: 'judge-correlation-1' });
    expect(trace.events).toHaveLength(2);
    expect(trace.events.map((event) => event.event_type)).toEqual([
      'judge_test_start',
      'judge_test_result',
    ]);
    expect(trace.events.every((event) => event.correlation_id === 'judge-correlation-1')).toBe(true);
    expect(trace.events[1].provider).toBe('local-intel-4');
    expect(trace.events[1].model).toBe('phi3.5:3.8b');
    expect(trace.events[1].source_collection).toBe('inneros_judge_trace_contract_events');
  });

  it('marks not-running FunctionGemma evidence as PARTIAL without hiding the trace', async () => {
    await runWithJudgeTraceContract(
      'gemma_probe',
      { correlation_id: 'judge-gemma-1' },
      async () => ({
        ok: true,
        status: 'HISTORICAL_PROVEN_CURRENTLY_NOT_RUNNING_READY_TO_REDEPLOY',
        provider: 'Google Vertex AI',
        model: 'FunctionGemma',
        runtime: 'vertex-model-garden-evidence',
      })
    );

    const trace = await loadJudgeTraceContractEvents({ correlationId: 'judge-gemma-1' });
    expect(trace.events[1].status).toBe('PARTIAL');
    expect(trace.events[1].provider).toBe('Google Vertex AI');
    expect(trace.events[1].model).toBe('FunctionGemma');
    expect(trace.events[1].simulated).toBe(false);
  });

  it('returns a failing action result when START cannot be persisted', async () => {
    process.env.JUDGE_TRACE_CONTRACT_PATH = dir;
    const result = await runWithJudgeTraceContract('safe_trigger', { correlation_id: 'bad' }, async () => ({
      ok: true,
    }));

    expect(result.ok).toBe(false);
    expect(result.error).toBe('judge_trace_persist_start_failed');
  });
});
