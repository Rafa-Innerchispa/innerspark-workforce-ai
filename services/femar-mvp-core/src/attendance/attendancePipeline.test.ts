import { createTenantConfig, resolveTenantConfig } from '../tenant/tenantConfig';
import {
  buildAttendanceReport,
  buildSimplePayrollReport,
} from '../payroll/attendanceReport';
import { createCanonicalPunch } from './canonicalPunch';
import { runTenantAttendancePipeline } from './attendancePipeline';

describe('tenantConfig', () => {
  it('resolves known tenant femar with Guayaquil schedule', () => {
    const config = resolveTenantConfig('femar');

    expect(config.tenant_id).toBe('femar');
    expect(config.schedule.timezone).toBe('America/Guayaquil');
    expect(config.schedule.entry_time).toBe('09:00');
    expect(config.payroll.iess_rate).toBeCloseTo(0.0945);
  });

  it('falls back to defaults for unknown tenants', () => {
    const config = resolveTenantConfig('acme-corp');

    expect(config.tenant_id).toBe('acme-corp');
    expect(config.schedule.exit_time).toBe('18:00');
  });

  it('rejects invalid schedule times', () => {
    expect(() =>
      createTenantConfig('bad', {
        schedule: { entry_time: '25:99' } as never,
      })
    ).toThrow(/Invalid tenant config/);
  });
});

describe('attendanceReport', () => {
  const tenant = resolveTenantConfig('femar');

  it('marks on-time day when clock-in is within grace', () => {
    const punches = [
      createCanonicalPunch({
        employee_id: '1001',
        timestamp: '2026-08-05 08:55:00',
        event_type: 'clock_in',
        source: 'zkteco',
        device_id: 'ZK-1',
      }),
      createCanonicalPunch({
        employee_id: '1001',
        timestamp: '2026-08-05 17:30:00',
        event_type: 'clock_out',
        source: 'zkteco',
        device_id: 'ZK-1',
      }),
    ];

    const report = buildAttendanceReport(punches, tenant);

    expect(report).toHaveLength(1);
    expect(report[0]).toMatchObject({
      employee_id: '1001',
      date: '2026-08-05',
      status: 'on_time',
      late_minutes: 0,
      punch_count: 2,
    });
  });

  it('marks late day when clock-in exceeds grace', () => {
    const punches = [
      createCanonicalPunch({
        employee_id: '1001',
        timestamp: '2026-08-05 09:20:00',
        event_type: 'clock_in',
        source: 'zkteco',
        device_id: 'ZK-1',
      }),
      createCanonicalPunch({
        employee_id: '1001',
        timestamp: '2026-08-05 18:00:00',
        event_type: 'clock_out',
        source: 'zkteco',
        device_id: 'ZK-1',
      }),
    ];

    const report = buildAttendanceReport(punches, tenant);

    expect(report[0].status).toBe('late');
    expect(report[0].late_minutes).toBe(20);
  });

  it('builds deterministic payroll from punch volume', () => {
    const punches = Array.from({ length: 22 }, (_, index) =>
      createCanonicalPunch({
        employee_id: '1001',
        timestamp: `2026-08-${String((index % 28) + 1).padStart(2, '0')} 08:55:00`,
        event_type: index % 2 === 0 ? 'clock_in' : 'clock_out',
        source: 'zkteco',
        device_id: 'ZK-1',
      })
    );

    const payroll = buildSimplePayrollReport(punches, tenant, [
      { id: '1001', baseSalary: 1000 },
    ]);

    expect(payroll[0].punch_count).toBe(22);
    expect(payroll[0].overtime).toBe(20);
    expect(payroll[0].penalty).toBe(0);
    expect(payroll[0].iess).toBeCloseTo(94.5);
  });
});

describe('attendancePipeline E2E slice', () => {
  it('tenant config → canonical punches → attendance and payroll report', () => {
    const rawLog = [
      '101\t2026-08-28 08:00:00\t0\t1',
      '101\t2026-08-28 17:00:00\t1\t1',
      '102\t2026-08-28 08:15:00\t0\t1',
    ].join('\n');

    const result = runTenantAttendancePipeline(
      {
        tenant_id: 'femar',
        default_device_id: 'ZK-DEV-01',
        vendor: 'zkteco',
      },
      rawLog,
      [
        { id: '101', baseSalary: 2000 },
        { id: '102', baseSalary: 1500 },
      ]
    );

    expect(result.tenant.tenant_id).toBe('femar');
    expect(result.punches).toHaveLength(3);
    expect(result.attendance).toHaveLength(2);

    const emp101 = result.attendance.find((r) => r.employee_id === '101');
    expect(emp101).toMatchObject({
      status: 'on_time',
      punch_count: 2,
    });

    expect(result.payroll).toHaveLength(2);
    expect(result.payroll.find((r) => r.employee_id === '101')?.base_salary).toBe(
      2000
    );
  });
});
