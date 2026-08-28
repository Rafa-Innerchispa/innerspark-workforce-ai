/**
 * Simple attendance and payroll reports built from canonical punches
 * and tenant schedule/payroll configuration.
 */

import { CanonicalPunch } from '../attendance/canonicalPunch';
import {
  TenantConfig,
  parseScheduleTimeToMinutes,
} from '../tenant/tenantConfig';

export type AttendanceDayStatus =
  | 'on_time'
  | 'late'
  | 'incomplete'
  | 'absent';

export interface AttendanceReportRow {
  employee_id: string;
  date: string;
  clock_in?: string;
  clock_out?: string;
  status: AttendanceDayStatus;
  late_minutes: number;
  punch_count: number;
}

export interface SimplePayrollRow {
  employee_id: string;
  punch_count: number;
  base_salary: number;
  overtime: number;
  penalty: number;
  iess: number;
  net: number;
}

export interface PayrollEmployeeInput {
  id: string;
  baseSalary?: number;
}

function localDateKey(timestamp: string, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(timestamp));
}

function localTimeMinutes(timestamp: string, timezone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(new Date(timestamp));

  const hourPart = parts.find((p) => p.type === 'hour')?.value ?? '0';
  const minutePart = parts.find((p) => p.type === 'minute')?.value ?? '0';
  const hours = parseInt(hourPart, 10) === 24 ? 0 : parseInt(hourPart, 10);

  return hours * 60 + parseInt(minutePart, 10);
}

function isClockIn(eventType: CanonicalPunch['event_type']): boolean {
  return eventType === 'clock_in' || eventType === 'unknown';
}

function isClockOut(eventType: CanonicalPunch['event_type']): boolean {
  return eventType === 'clock_out';
}

function deriveDayStatus(
  clockIn: CanonicalPunch | undefined,
  clockOut: CanonicalPunch | undefined,
  lateMinutes: number
): AttendanceDayStatus {
  if (!clockIn && !clockOut) {
    return 'absent';
  }
  if (!clockIn || !clockOut) {
    return 'incomplete';
  }
  return lateMinutes > 0 ? 'late' : 'on_time';
}

/**
 * Groups canonical punches into per-employee daily attendance rows.
 */
export function buildAttendanceReport(
  punches: CanonicalPunch[],
  config: TenantConfig
): AttendanceReportRow[] {
  const entryMinutes = parseScheduleTimeToMinutes(config.schedule.entry_time);
  const grace = config.schedule.grace_minutes;
  const timezone = config.schedule.timezone;

  const byEmployeeDate = new Map<string, CanonicalPunch[]>();

  for (const punch of punches) {
    const date = localDateKey(punch.timestamp, timezone);
    const key = `${punch.employee_id}::${date}`;
    const bucket = byEmployeeDate.get(key) ?? [];
    bucket.push(punch);
    byEmployeeDate.set(key, bucket);
  }

  const rows: AttendanceReportRow[] = [];

  for (const [key, dayPunches] of byEmployeeDate.entries()) {
    const [employee_id, date] = key.split('::');
    const sorted = [...dayPunches].sort((a, b) =>
      a.timestamp.localeCompare(b.timestamp)
    );

    const clockIn = sorted.find((p) => isClockIn(p.event_type));
    const clockOut = [...sorted].reverse().find((p) => isClockOut(p.event_type));

    let lateMinutes = 0;
    if (clockIn) {
      const punchMinutes = localTimeMinutes(clockIn.timestamp, timezone);
      const threshold = entryMinutes + grace;
      if (punchMinutes > threshold) {
        lateMinutes = punchMinutes - entryMinutes;
      }
    }

    rows.push({
      employee_id,
      date,
      clock_in: clockIn?.timestamp,
      clock_out: clockOut?.timestamp,
      status: deriveDayStatus(clockIn, clockOut, lateMinutes),
      late_minutes: lateMinutes,
      punch_count: sorted.length,
    });
  }

  return rows.sort((a, b) =>
    a.date.localeCompare(b.date) || a.employee_id.localeCompare(b.employee_id)
  );
}

/**
 * Minimal deterministic payroll from punch volume and tenant thresholds.
 */
export function buildSimplePayrollReport(
  punches: CanonicalPunch[],
  config: TenantConfig,
  employees: PayrollEmployeeInput[]
): SimplePayrollRow[] {
  const expected = config.payroll.expected_punches_per_period;
  const { overtime_rate, penalty_rate, iess_rate } = config.payroll;

  const punchCountByEmployee = punches.reduce<Map<string, number>>(
    (acc, punch) => {
      acc.set(punch.employee_id, (acc.get(punch.employee_id) ?? 0) + 1);
      return acc;
    },
    new Map()
  );

  return employees.map((employee) => {
    const punchCount = punchCountByEmployee.get(employee.id) ?? 0;
    const baseSalary = employee.baseSalary ?? 500;

    let overtime = 0;
    let penalty = 0;

    if (punchCount > expected) {
      overtime = (punchCount - expected) * overtime_rate;
    } else if (punchCount > 0 && punchCount < expected) {
      penalty = (expected - punchCount) * penalty_rate;
    }

    const iess = baseSalary * iess_rate;
    const net = baseSalary + overtime - iess - penalty;

    return {
      employee_id: employee.id,
      punch_count: punchCount,
      base_salary: baseSalary,
      overtime,
      penalty,
      iess,
      net,
    };
  });
}
