import { CanonicalPunch } from './canonicalPunch';
import { zktecoPunchAdapter } from './punchAdapter';

export interface TenantAttendanceConfig {
  tenant_id: string;
  timezone: string;
  default_device_id: string;
  vendor: 'zkteco';
}

export interface DailyAttendanceReportRow {
  employee_id: string;
  clock_ins: number;
  clock_outs: number;
  first_punch: string | null;
  last_punch: string | null;
}

export interface DailyAttendanceReport {
  tenant_id: string;
  date: string;
  rows: DailyAttendanceReportRow[];
  total_punches: number;
}

export function ingestTenantPunches(
  config: TenantAttendanceConfig,
  rawLog: string
): CanonicalPunch[] {
  if (config.vendor !== 'zkteco') {
    return [];
  }

  return zktecoPunchAdapter.parseBatch(rawLog, {
    device_id: config.default_device_id,
    source: 'zkteco',
  });
}

export function buildDailyAttendanceReport(
  config: TenantAttendanceConfig,
  punches: CanonicalPunch[]
): DailyAttendanceReport {
  const byEmployee = new Map<string, CanonicalPunch[]>();

  for (const punch of punches) {
    const list = byEmployee.get(punch.employee_id) ?? [];
    list.push(punch);
    byEmployee.set(punch.employee_id, list);
  }

  const rows: DailyAttendanceReportRow[] = [...byEmployee.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([employee_id, employeePunches]) => {
      const sorted = [...employeePunches].sort((a, b) =>
        a.timestamp.localeCompare(b.timestamp)
      );
      return {
        employee_id,
        clock_ins: sorted.filter((p) => p.event_type === 'clock_in').length,
        clock_outs: sorted.filter((p) => p.event_type === 'clock_out').length,
        first_punch: sorted[0]?.timestamp ?? null,
        last_punch: sorted[sorted.length - 1]?.timestamp ?? null,
      };
    });

  const date =
    punches[0]?.timestamp.slice(0, 10) ??
    new Date().toISOString().slice(0, 10);

  return {
    tenant_id: config.tenant_id,
    date,
    rows,
    total_punches: punches.length,
  };
}

export function runTenantAttendancePipeline(
  config: TenantAttendanceConfig,
  rawLog: string
): { punches: CanonicalPunch[]; report: DailyAttendanceReport } {
  const punches = ingestTenantPunches(config, rawLog);
  const report = buildDailyAttendanceReport(config, punches);
  return { punches, report };
}
