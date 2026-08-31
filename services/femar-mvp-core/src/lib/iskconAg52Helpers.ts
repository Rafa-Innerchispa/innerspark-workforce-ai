import type { McpBridgeResult } from '@/lib/ralfiaMcpBridge';

export function judgeKpiSummary(payload: McpBridgeResult): {
  total: number;
  verified: number;
  passRate: number;
  local: number;
  cloud: number;
} {
  const kpis = (payload.kpis as Record<string, number> | undefined) || {};
  const total = Number(kpis.total_events ?? payload.total_events ?? 0);
  const verified = Number(kpis.verified_events ?? payload.verified_events ?? 0);
  const passRate = total > 0 ? Math.round((verified / total) * 100) : 0;
  return {
    total,
    verified,
    passRate,
    local: Number(kpis.local_events ?? 0),
    cloud: Number(kpis.cloud_events ?? 0),
  };
}
