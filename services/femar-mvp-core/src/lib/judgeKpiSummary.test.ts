import { judgeKpiSummary } from '@/lib/iskconAg52Helpers';

describe('judgeKpiSummary', () => {
  it('reads nested kpis block', () => {
    const summary = judgeKpiSummary({
      ok: true,
      kpis: { total_events: 10, verified_events: 7, local_events: 4, cloud_events: 3 },
    });
    expect(summary.total).toBe(10);
    expect(summary.verified).toBe(7);
    expect(summary.passRate).toBe(70);
  });
});
