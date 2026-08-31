import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/sessionAuth';
import type { PanihatiBudgetEntryInput, PanihatiSponsorEntryInput } from '@/lib/panihatiRegistry';
import {
  createBudgetEntry,
  createSponsorEntry,
  formatPanihatiSummaryText,
  getPanihatiSummary,
  listBudgetEntries,
  listDocumentEntries,
  listSponsorEntries,
  listTaskEntries,
} from '@/lib/panihatiStore';

export async function GET(req: Request) {
  const user = await requireSession();
  if (user instanceof NextResponse) return user;

  const url = new URL(req.url);
  const kind = url.searchParams.get('kind') || 'summary';
  const lang = url.searchParams.get('lang') === 'en' ? 'en' : 'es';

  try {
    if (kind === 'budget') {
      const items = await listBudgetEntries();
      return NextResponse.json({ ok: true, kind, items });
    }
    if (kind === 'sponsors') {
      const items = await listSponsorEntries();
      return NextResponse.json({ ok: true, kind, items });
    }
    if (kind === 'tasks') {
      const items = await listTaskEntries();
      return NextResponse.json({ ok: true, kind, items });
    }
    if (kind === 'documents') {
      const items = await listDocumentEntries();
      return NextResponse.json({ ok: true, kind, items });
    }

    const summary = await getPanihatiSummary();
    return NextResponse.json({
      ok: true,
      kind: 'summary',
      text: formatPanihatiSummaryText(summary, lang),
      summary,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}

export async function POST(req: Request) {
  const user = await requireSession();
  if (user instanceof NextResponse) return user;

  const body = await req.json().catch(() => ({}));
  const kind = String(body.kind || 'budget');
  const lang = body.lang === 'en' ? 'en' : 'es';

  try {
    if (kind === 'sponsor') {
      const entry = body.entry as PanihatiSponsorEntryInput;
      if (!entry?.nombre) {
        return NextResponse.json(
          { ok: false, error: lang === 'es' ? 'Falta nombre del patrocinador.' : 'Missing sponsor name.' },
          { status: 400 }
        );
      }
      const row = await createSponsorEntry({ ...entry, source: 'desk' });
      if (!row) return NextResponse.json({ ok: false, error: 'store_unavailable' }, { status: 502 });
      return NextResponse.json({ ok: true, kind, row });
    }

    const entry = body.entry as PanihatiBudgetEntryInput;
    if (!entry?.concepto) {
      return NextResponse.json(
        { ok: false, error: lang === 'es' ? 'Falta concepto del gasto/ingreso.' : 'Missing budget concept.' },
        { status: 400 }
      );
    }

    const row = await createBudgetEntry({ ...entry, source: 'desk' });
    if (!row) return NextResponse.json({ ok: false, error: 'store_unavailable' }, { status: 502 });
    return NextResponse.json({ ok: true, kind: 'budget', row });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
