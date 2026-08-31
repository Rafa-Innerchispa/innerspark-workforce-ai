import { inferRouteReadiness, modelOptionReadiness, traceFieldMatrix } from '@/lib/judgeVisualAudit';

describe('judgeVisualAudit', () => {
  it('honors MCP readiness when provided', () => {
    expect(
      inferRouteReadiness({
        task_class: 'bounded_function_intent',
        selected_model: 'functiongemma',
        runtime: 'vertex_ai',
        readiness: 'LIVE',
      })
    ).toBe('LIVE');
  });

  it('falls back to NOT_READY for gemma without MCP signal', () => {
    expect(
      inferRouteReadiness({ task_class: 'bounded_function_intent', selected_model: 'functiongemma', runtime: 'local_classifier' })
    ).toBe('PARTIAL');
  });

  it('marks cloud burst as PARTIAL', () => {
    expect(
      inferRouteReadiness({ task_class: 'cloud_burst_gpu', runtime: 'ephemeral_cloud_gpu' })
    ).toBe('PARTIAL');
  });

  it('builds trace field matrix from events', () => {
    const fields = traceFieldMatrix([
      {
        correlation_id: 'c1',
        run_id: 'r1',
        event_type: 'dispatch',
        protocol: 'a2a',
        tool: 'dispatch',
        source_collection: 'inneros_judge_trace_events',
        source_kind: 'live_event',
        verified: true,
      },
    ]);
    expect(fields).toContain('correlation_id');
    expect(fields).toContain('event_type');
    expect(fields).toContain('protocol');
    expect(fields).toContain('source_collection');
    expect(fields).toContain('source_kind');
  });

  it('maps model options to readiness', () => {
    const routes = [
      { task_class: 'coding', runtime: 'local_vllm', selected_model: 'qwen' },
      { task_class: 'bounded_function_intent', selected_model: 'functiongemma', runtime: 'local_classifier' },
    ];
    expect(modelOptionReadiness('local_amd', routes)).toBe('LIVE');
    expect(modelOptionReadiness('functiongemma', routes)).toBe('LIVE');
    const prev = process.env.INNEROS_FUNCTION_GEMMA_ENDPOINT_ID;
    process.env.INNEROS_FUNCTION_GEMMA_ENDPOINT_ID = '';
    expect(modelOptionReadiness('functiongemma', routes)).toBe('NOT_READY');
    process.env.INNEROS_FUNCTION_GEMMA_ENDPOINT_ID = prev;
  });
});
