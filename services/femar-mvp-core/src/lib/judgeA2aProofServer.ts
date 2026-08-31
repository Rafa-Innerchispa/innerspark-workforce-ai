import { callMcpTool } from '@/lib/ralfiaMcpBridge';
import { loadGlobalTraceEvents } from '@/lib/judgeConsoleApi';
import {
  A2A_LIVE_PROOF_CORRELATION,
  A2A_PROOF_OPS_CODEX,
  flattenOpsTimeline,
  type A2aProofBundle,
  type A2aProofOpsTask,
} from '@/lib/judgeA2aProof';

export async function loadA2aProofBundle(
  correlationId: string = A2A_LIVE_PROOF_CORRELATION
): Promise<A2aProofBundle> {
  const [trace, a2aRes, opsRes] = await Promise.all([
    loadGlobalTraceEvents({ correlationId, limit: 120 }),
    callMcpTool('a2a_status', {}),
    callMcpTool('list_ops_tasks', { limit: 50 }),
  ]);

  const allOps = ((opsRes.tasks as A2aProofOpsTask[]) || []).filter(Boolean);
  const opsTasks = allOps.filter(
    (t) =>
      t.correlation_id === correlationId ||
      t.task_id === A2A_PROOF_OPS_CODEX ||
      String(t.title || '').toLowerCase().includes('a2a')
  );

  return {
    correlationId,
    traceEvents: trace.events,
    traceSources: trace.sources,
    a2aStatus: a2aRes.ok !== false ? (a2aRes as Record<string, unknown>) : null,
    opsTasks,
    racbTimeline: flattenOpsTimeline(opsTasks),
  };
}
