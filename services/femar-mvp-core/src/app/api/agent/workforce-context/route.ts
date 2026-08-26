import { NextResponse } from 'next/server';
import { authErrorResponse, requireSession, tenantForRequest } from '@/lib/auth/server';
import { readAriaWorkforceContext } from '@/lib/ariaWorkforceBridge';

export async function POST(req: Request) {
  try {
    const principal = await requireSession(req);
    const body = await req.json();
    const employeeId = String(body?.employeeId || '').trim();
    const date = String(body?.date || '').trim();
    const requestedTenant = body?.companyId ? String(body.companyId) : null;

    if (!employeeId) {
      return NextResponse.json({ error: 'employee_id_required' }, { status: 400 });
    }
    if (!date) {
      return NextResponse.json({ error: 'date_required' }, { status: 400 });
    }

    const companyId = tenantForRequest(principal, requestedTenant);
    const context = await readAriaWorkforceContext({
      companyId,
      employeeId,
      date,
      noveltyLimit: body?.noveltyLimit,
    });

    return NextResponse.json({
      success: true,
      assistant: 'ARIA',
      route: 'workforce_context',
      provenance: 'measured',
      context,
    });
  } catch (error) {
    const auth = authErrorResponse(error);
    if (auth) return NextResponse.json(auth.body, { status: auth.status });
    console.error('ARIA Workforce context API error:', error);
    return NextResponse.json({ error: 'workforce_context_unavailable' }, { status: 500 });
  }
}
