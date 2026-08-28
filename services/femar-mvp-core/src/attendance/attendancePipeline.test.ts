import { runTenantAttendancePipeline } from './attendancePipeline';

describe('attendancePipeline E2E slice', () => {
  const tenant = {
    tenant_id: 'femar-demo',
    timezone: 'America/Guayaquil',
    default_device_id: 'ZK-DEV-01',
    vendor: 'zkteco' as const,
  };

  it('tenant config → canonical punches → daily report', () => {
    const rawLog = [
      '101\t2026-08-28 08:00:00\t0\t1',
      '101\t2026-08-28 17:00:00\t1\t1',
      '102\t2026-08-28 08:15:00\t0\t1',
    ].join('\n');

    const { punches, report } = runTenantAttendancePipeline(tenant, rawLog);

    expect(punches).toHaveLength(3);
    expect(report.tenant_id).toBe('femar-demo');
    expect(report.total_punches).toBe(3);
    expect(report.rows).toHaveLength(2);

    const emp101 = report.rows.find((r) => r.employee_id === '101');
    expect(emp101?.clock_ins).toBe(1);
    expect(emp101?.clock_outs).toBe(1);
    expect(emp101?.first_punch).toContain('2026-08-28T08:00:00');
  });
});
