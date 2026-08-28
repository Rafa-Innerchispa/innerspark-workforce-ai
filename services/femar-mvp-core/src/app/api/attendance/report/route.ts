import { NextRequest, NextResponse } from 'next/server';
import {
  buildTenantAttendanceReport,
  processDeviceAttlog,
} from '@/lib/workforce/attendanceRuntime';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawLog = typeof body.raw_log === 'string' ? body.raw_log : '';
    const deviceId =
      typeof body.device_id === 'string' && body.device_id.trim()
        ? body.device_id.trim()
        : 'UNKNOWN_DEVICE';
    const tenantId =
      typeof body.tenant_id === 'string' && body.tenant_id.trim()
        ? body.tenant_id.trim()
        : undefined;
    const includePayroll = body.include_payroll === true;

    if (!rawLog.trim()) {
      return NextResponse.json(
        { error: 'raw_log is required (ZKTeco ATTLOG batch)' },
        { status: 400 }
      );
    }

    if (includePayroll) {
      const result = processDeviceAttlog(deviceId, rawLog, tenantId);
      return NextResponse.json({
        tenant_id: result.tenant.tenant_id,
        punch_count: result.punches.length,
        attendance: result.attendance,
        payroll: result.payroll,
      });
    }

    const attendance = buildTenantAttendanceReport(deviceId, rawLog, tenantId);
    return NextResponse.json({
      tenant_id: tenantId ?? process.env.WORKFORCE_DEFAULT_TENANT?.trim() ?? 'femar',
      punch_count: attendance.reduce((sum, row) => sum + row.punch_count, 0),
      attendance,
    });
  } catch (error) {
    console.error('Attendance report error:', error);
    return NextResponse.json(
      { error: 'Failed to build attendance report' },
      { status: 500 }
    );
  }
}
