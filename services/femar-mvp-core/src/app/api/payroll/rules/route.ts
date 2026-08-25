import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { authErrorResponse, requireAnyRole, requireSession, tenantForRequest } from '@/lib/auth/server';
import { validatePayrollRules, type PayrollRules } from '@/lib/payroll/engine';

export async function GET(req: NextRequest) {
  try {
    const principal = await requireSession(req);
    const tenantId = tenantForRequest(principal, new URL(req.url).searchParams.get('companyId'));
    const snap = await db.collection('payroll_rules').doc(tenantId).get();
    return NextResponse.json({ success: true, tenantId, configured: snap.exists, rules: snap.exists ? snap.data() : null });
  } catch (error) {
    const auth = authErrorResponse(error);
    if (auth) return NextResponse.json(auth.body, { status: auth.status });
    console.error('Payroll rules GET error:', error);
    return NextResponse.json({ error: 'Failed to load payroll rules' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const principal = await requireSession(req);
    requireAnyRole(principal, ['tenant_admin', 'hr', 'payroll_approver']);
    const body = await req.json();
    const tenantId = tenantForRequest(principal, body.companyId ? String(body.companyId) : null);
    const currentRef = db.collection('payroll_rules').doc(tenantId);
    const currentSnap = await currentRef.get();
    const currentVersion = currentSnap.exists ? Number(currentSnap.data()?.version || 0) : 0;

    const rules: PayrollRules = {
      version: currentVersion + 1,
      overtimeHourlyMultiplier: Number(body.overtimeHourlyMultiplier ?? 0),
      lateMinuteDeductionRate: Number(body.lateMinuteDeductionRate ?? 0),
      earlyDepartureMinuteDeductionRate: Number(body.earlyDepartureMinuteDeductionRate ?? 0),
      employeeContributionRate: Number(body.employeeContributionRate ?? 0),
      employerContributionRate: Number(body.employerContributionRate ?? 0),
      currency: String(body.currency || 'USD').trim().toUpperCase(),
    };
    validatePayrollRules(rules);

    const now = new Date().toISOString();
    const record = { ...rules, tenantId, updatedAt: now, updatedBy: principal.userId };
    await currentRef.set(record);
    await db.collection('payroll_rule_versions').doc(`${tenantId}:v${rules.version}`).set({ ...record, createdAt: now });
    await db.collection('audit_events').add({
      type: 'PAYROLL_RULES_UPDATED',
      actorUserId: principal.userId,
      actorTenantId: principal.tenantId,
      targetTenantId: tenantId,
      rulesVersion: rules.version,
      createdAt: now,
    });

    return NextResponse.json({ success: true, tenantId, rules: record });
  } catch (error) {
    const auth = authErrorResponse(error);
    if (auth) return NextResponse.json(auth.body, { status: auth.status });
    const message = error instanceof Error ? error.message : 'Failed to update payroll rules';
    const status = message.startsWith('rules_') || message === 'currency_required' ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
