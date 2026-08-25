import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { AuthError, authErrorResponse, requireSession, tenantForRequest } from '@/lib/auth/server';
import { loadPayrollPreview } from '@/lib/payroll/server';
import { assertMakerChecker, assertValidPeriod, canClosePeriod, canPreparePeriod, canReopenPeriod } from '@/lib/payroll/period';

function periodDocId(tenantId: string, period: string) {
  return `${tenantId}:${period}`;
}

function snapshotHash(value: unknown) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export async function GET(req: NextRequest) {
  try {
    const principal = await requireSession(req);
    const url = new URL(req.url);
    const tenantId = tenantForRequest(principal, url.searchParams.get('companyId'));
    const period = url.searchParams.get('period');

    if (period) {
      assertValidPeriod(period);
      const snap = await db.collection('payroll_periods').doc(periodDocId(tenantId, period)).get();
      if (!snap.exists) return NextResponse.json({ success: true, period: null });
      return NextResponse.json({ success: true, period: { id: snap.id, ...snap.data() } });
    }

    const snapshot = await db.collection('payroll_periods').where('tenantId', '==', tenantId).get();
    const periods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    periods.sort((a, b) => String((b as { period?: string }).period || '').localeCompare(String((a as { period?: string }).period || '')));
    return NextResponse.json({ success: true, periods });
  } catch (error) {
    const auth = authErrorResponse(error);
    if (auth) return NextResponse.json(auth.body, { status: auth.status });
    const message = error instanceof Error ? error.message : 'Failed to load payroll periods';
    return NextResponse.json({ error: message }, { status: message === 'period_invalid' ? 400 : 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const principal = await requireSession(req);
    const body = await req.json();
    const action = String(body.action || '');
    const period = String(body.period || '');
    assertValidPeriod(period);
    const tenantId = tenantForRequest(principal, body.companyId ? String(body.companyId) : null);
    const ref = db.collection('payroll_periods').doc(periodDocId(tenantId, period));
    const existingSnap = await ref.get();
    const existing = existingSnap.exists ? existingSnap.data() || {} : {};
    const now = new Date().toISOString();

    if (action === 'prepare') {
      if (!canPreparePeriod(principal.role)) throw new AuthError(403, 'payroll_prepare_forbidden', 'No tienes permisos para preparar nómina');
      if (existing.status === 'closed') throw new AuthError(409, 'period_closed', 'El período está cerrado; debe reabrirse antes de recalcular');

      const preview = await loadPayrollPreview(tenantId, period);
      if (!preview.rules.monetaryAdjustmentsConfigured) {
        throw new AuthError(409, 'payroll_rules_missing', 'Configura reglas monetarias antes de preparar el período');
      }

      const revision = Number(existing.revision || 0) + 1;
      for (const row of preview.rows) {
        await db.collection('payroll_period_rows').doc(`${tenantId}:${period}:${row.employeeId}`).set({
          tenantId,
          period,
          revision,
          employeeId: row.employeeId,
          snapshot: row,
          preparedAt: now,
          preparedBy: principal.userId,
        });
      }

      const integrityHash = snapshotHash({ period, revision, totals: preview.totals, rules: preview.rules, rows: preview.rows });
      const record = {
        tenantId,
        period,
        status: 'prepared',
        revision,
        rulesVersion: preview.rules.version,
        currency: preview.rules.currency,
        employeeCount: preview.rows.length,
        totals: preview.totals,
        integrityHash,
        preparedAt: now,
        preparedBy: principal.userId,
        closedAt: null,
        closedBy: null,
        reopenReason: existing.reopenReason || null,
        updatedAt: now,
      };
      await ref.set(record);
      await db.collection('audit_events').add({ type: 'PAYROLL_PERIOD_PREPARED', actorUserId: principal.userId, actorTenantId: principal.tenantId, targetTenantId: tenantId, period, revision, integrityHash, createdAt: now });
      return NextResponse.json({ success: true, period: record });
    }

    if (action === 'close') {
      if (!canClosePeriod(principal.role)) throw new AuthError(403, 'payroll_close_forbidden', 'No tienes permisos para cerrar nómina');
      if (!existingSnap.exists || existing.status !== 'prepared') throw new AuthError(409, 'period_not_prepared', 'El período debe estar preparado antes de cerrarse');
      assertMakerChecker(String(existing.preparedBy || ''), principal.userId, principal.role, body.overrideReason ? String(body.overrideReason) : undefined);
      const update = { status: 'closed', closedAt: now, closedBy: principal.userId, closeOverrideReason: body.overrideReason ? String(body.overrideReason) : null, updatedAt: now };
      await ref.update(update);
      await db.collection('audit_events').add({ type: 'PAYROLL_PERIOD_CLOSED', actorUserId: principal.userId, actorTenantId: principal.tenantId, targetTenantId: tenantId, period, revision: existing.revision, integrityHash: existing.integrityHash, overrideReason: update.closeOverrideReason, createdAt: now });
      return NextResponse.json({ success: true, period: { ...existing, ...update } });
    }

    if (action === 'reopen') {
      if (!canReopenPeriod(principal.role)) throw new AuthError(403, 'payroll_reopen_forbidden', 'No tienes permisos para reabrir nómina');
      if (!existingSnap.exists || existing.status !== 'closed') throw new AuthError(409, 'period_not_closed', 'Sólo un período cerrado puede reabrirse');
      const reason = String(body.reason || '').trim();
      if (!reason) return NextResponse.json({ error: 'reopen_reason_required' }, { status: 400 });
      const update = { status: 'reopened', reopenedAt: now, reopenedBy: principal.userId, reopenReason: reason, updatedAt: now };
      await ref.update(update);
      await db.collection('audit_events').add({ type: 'PAYROLL_PERIOD_REOPENED', actorUserId: principal.userId, actorTenantId: principal.tenantId, targetTenantId: tenantId, period, revision: existing.revision, reason, createdAt: now });
      return NextResponse.json({ success: true, period: { ...existing, ...update } });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error) {
    const auth = authErrorResponse(error);
    if (auth) return NextResponse.json(auth.body, { status: auth.status });
    const message = error instanceof Error ? error.message : 'Payroll period operation failed';
    const status = ['period_invalid', 'maker_checker_required'].includes(message) ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
