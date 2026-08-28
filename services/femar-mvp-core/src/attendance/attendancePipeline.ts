/**
 * E2E workforce slice: tenant config → canonical punch → simple report.
 */

import {
  AttendanceReportRow,
  PayrollEmployeeInput,
  SimplePayrollRow,
  buildAttendanceReport,
  buildSimplePayrollReport,
} from '../payroll/attendanceReport';
import { TenantConfig, resolveTenantConfig } from '../tenant/tenantConfig';
import { CanonicalPunch } from './canonicalPunch';
import { PunchAdapter, zktecoPunchAdapter } from './punchAdapter';

export interface TenantAttendanceConfig {
  tenant_id: string;
  default_device_id: string;
  vendor?: 'zkteco';
}

export interface TenantAttendancePipelineResult {
  tenant: TenantConfig;
  punches: CanonicalPunch[];
  attendance: AttendanceReportRow[];
  payroll: SimplePayrollRow[];
}

/** @deprecated Use AttendanceReportRow from payroll/attendanceReport */
export interface DailyAttendanceReportRow {
  employee_id: string;
  clock_ins: number;
  clock_outs: number;
  first_punch: string | null;
  last_punch: string | null;
}

/** @deprecated Use TenantAttendancePipelineResult */
export interface DailyAttendanceReport {
  tenant_id: string;
  date: string;
  rows: DailyAttendanceReportRow[];
  total_punches: number;
}

export function ingestTenantPunches(
  config: TenantAttendanceConfig,
  rawLog: string,
  adapter: PunchAdapter = zktecoPunchAdapter
): CanonicalPunch[] {
  if (config.vendor && config.vendor !== 'zkteco') {
    return [];
  }

  return adapter.parseBatch(rawLog, {
    device_id: config.default_device_id,
    source: 'zkteco',
  });
}

export function runTenantAttendancePipeline(
  config: TenantAttendanceConfig,
  rawLog: string,
  employees?: PayrollEmployeeInput[],
  adapter?: PunchAdapter
): TenantAttendancePipelineResult {
  const tenant = resolveTenantConfig(config.tenant_id);
  const punches = ingestTenantPunches(config, rawLog, adapter);
  const attendance = buildAttendanceReport(punches, tenant);
  const payroll = buildSimplePayrollReport(
    punches,
    tenant,
    employees ?? uniqueEmployeesFromPunches(punches)
  );

  return { tenant, punches, attendance, payroll };
}

function uniqueEmployeesFromPunches(
  punches: CanonicalPunch[]
): PayrollEmployeeInput[] {
  return [...new Set(punches.map((p) => p.employee_id))].map((id) => ({ id }));
}
