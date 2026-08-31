import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { createSchedule, listSchedules, normalizeScheduleInput } from '@/lib/scheduleService';
import { assertTenantAccess, requireModuleAccess } from '@/lib/sessionAuth';

export async function GET(req: NextRequest) {
  try {
    const user = await requireModuleAccess('workforce-ai');
    if (user instanceof NextResponse) return user;

    const url = new URL(req.url);
    const requestedCompany = url.searchParams.get('companyId');
    const tenantDenied = assertTenantAccess(user, requestedCompany);
    if (tenantDenied) return tenantDenied;

    const limit = Number(url.searchParams.get('limit') || '200');
    const schedules = await listSchedules(db, { limit });
    const companyId =
      user.role === 'superadmin' && requestedCompany ? requestedCompany : user.companyId;
    const filtered =
      user.role === 'superadmin' && !requestedCompany
        ? schedules
        : schedules.filter((s) => !s.companyId || s.companyId === companyId);

    return NextResponse.json({ schedules: filtered });
  } catch (error) {
    console.error('Error fetching schedules:', error);
    return NextResponse.json({ error: 'Failed to fetch schedules' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireModuleAccess('workforce-ai');
    if (user instanceof NextResponse) return user;

    const body = await req.json();
    const tenantDenied = assertTenantAccess(user, body.companyId);
    if (tenantDenied) return tenantDenied;

    const input = normalizeScheduleInput({
      ...body,
      companyId:
        user.role === 'superadmin' && body.companyId ? body.companyId : user.companyId,
    });
    if (!input) {
      return NextResponse.json({ error: 'Invalid schedule payload' }, { status: 400 });
    }
    const schedule = await createSchedule(db, input);
    return NextResponse.json({ schedule }, { status: 201 });
  } catch (error) {
    console.error('Error creating schedule:', error);
    return NextResponse.json({ error: 'Failed to create schedule' }, { status: 500 });
  }
}
