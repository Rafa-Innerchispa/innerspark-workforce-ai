import {
  ingestTenantPunches,
  runTenantAttendancePipeline,
  TenantAttendanceConfig,
  TenantAttendancePipelineResult,
} from '@/attendance/attendancePipeline';
import {
  AttendanceReportRow,
  buildAttendanceReport,
} from '@/payroll/attendanceReport';
import { resolveTenantConfig } from '@/tenant/tenantConfig';

export function defaultTenantId(): string {
  return process.env.WORKFORCE_DEFAULT_TENANT?.trim() || 'femar';
}

export function tenantAttendanceConfig(
  deviceId: string,
  tenantId?: string
): TenantAttendanceConfig {
  return {
    tenant_id: tenantId ?? defaultTenantId(),
    default_device_id: deviceId,
    vendor: 'zkteco',
  };
}

/** Runs full tenant pipeline for a device ATTLOG batch. */
export function processDeviceAttlog(
  deviceId: string,
  rawLog: string,
  tenantId?: string
): TenantAttendancePipelineResult {
  return runTenantAttendancePipeline(
    tenantAttendanceConfig(deviceId, tenantId),
    rawLog
  );
}

/** Builds attendance rows from raw ZKTeco ATTLOG without payroll side-effects. */
export function buildTenantAttendanceReport(
  deviceId: string,
  rawLog: string,
  tenantId?: string
): AttendanceReportRow[] {
  const config = tenantAttendanceConfig(deviceId, tenantId);
  const punches = ingestTenantPunches(config, rawLog);
  return buildAttendanceReport(punches, resolveTenantConfig(config.tenant_id));
}
