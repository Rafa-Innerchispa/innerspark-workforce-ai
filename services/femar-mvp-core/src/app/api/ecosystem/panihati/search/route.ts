import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/sessionAuth';
import { formatPanihatiSearchText, formatPanihatiSummaryText, getPanihatiSummary, searchPanihati } from '@/lib/panihatiStore';

export async function GET(req: Request) {
  const user = await requireSession();
  if (user instanceof NextResponse) return user;

  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.trim() || '';
  const lang = url.searchParams.get('lang') === 'en' ? 'en' : 'es';

  try {
    if (q) {
      const results = await searchPanihati(q);
      return NextResponse.json({
        ok: true,
        query: q,
        text: formatPanihatiSearchText(results, lang),
        results,
      });
    }

    const summary = await getPanihatiSummary();
    return NextResponse.json({
      ok: true,
      text: formatPanihatiSummaryText(summary, lang),
      summary,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
