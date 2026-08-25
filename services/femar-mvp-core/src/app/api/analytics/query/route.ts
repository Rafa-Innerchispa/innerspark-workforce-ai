import { NextRequest, NextResponse } from 'next/server';
import { authErrorResponse, requireSession, tenantForRequest } from '@/lib/auth/server';
import { loadTenantAnalytics } from '@/lib/analytics/server';
import { answerDeterministicIntent, type DeterministicIntent } from '@/lib/analytics/workforceAnalytics';

const intents = new Set<DeterministicIntent>([
  'employees',
  'late_arrivals',
  'incomplete_punches',
  'monthly_cost',
  'annual_cost',
  'department_cost',
]);

export async function GET(req: NextRequest) {
  try {
    const principal = await requireSession(req);
    const url = new URL(req.url);
    const intent = String(url.searchParams.get('intent') || '') as DeterministicIntent;
    if (!intents.has(intent)) {
      return NextResponse.json({ error: 'Unsupported analytics intent' }, { status: 400 });
    }
    const tenantId = tenantForRequest(principal, url.searchParams.get('companyId'));
    const summary = await loadTenantAnalytics(
      tenantId,
      url.searchParams.get('from') || undefined,
      url.searchParams.get('to') || undefined,
    );
    return NextResponse.json({ success: true, tenantId, result: answerDeterministicIntent(intent, summary), summaryVersion: 1 });
  } catch (error) {
    const auth = authErrorResponse(error);
    if (auth) return NextResponse.json(auth.body, { status: auth.status });
    console.error('Analytics query error:', error);
    return NextResponse.json({ error: 'Analytics query failed' }, { status: 500 });
  }
}
