import { NextRequest, NextResponse } from 'next/server';
import { authErrorResponse, requireSession, tenantForRequest } from '@/lib/auth/server';
import { loadPayrollPreview } from '@/lib/payroll/server';

export async function GET(req: NextRequest) {
  try {
    const principal = await requireSession(req);
    const url = new URL(req.url);
    const tenantId = tenantForRequest(principal, url.searchParams.get('companyId'));
    const period = url.searchParams.get('period') || undefined;
    if (period && !/^\d{4}-\d{2}$/.test(period)) {
      return NextResponse.json({ error: 'Invalid period. Use YYYY-MM.' }, { status: 400 });
    }
    const preview = await loadPayrollPreview(tenantId, period);
    return NextResponse.json(preview);
  } catch (error) {
    const auth = authErrorResponse(error);
    if (auth) return NextResponse.json(auth.body, { status: auth.status });
    console.error('Prepayroll summary error:', error);
    return NextResponse.json({ error: 'Failed to calculate prepayroll summary' }, { status: 500 });
  }
}
