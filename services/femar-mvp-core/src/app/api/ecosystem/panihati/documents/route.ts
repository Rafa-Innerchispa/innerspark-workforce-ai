import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/sessionAuth';

const ISKCON_DESK_BASE = process.env.ISKCON_DESK_INTERNAL_URL || 'http://127.0.0.1:2027';

export async function POST(req: Request) {
  const user = await requireSession();
  if (user instanceof NextResponse) return user;

  const form = await req.formData();
  const file = form.get('file');
  const linkedConcepto = String(form.get('linked_concepto') || '');

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ ok: false, error: 'missing_file' }, { status: 400 });
  }

  const upstream = new FormData();
  upstream.append('file', file);
  upstream.append('linked_concepto', linkedConcepto);

  try {
    const res = await fetch(`${ISKCON_DESK_BASE}/api/panihati/documents`, {
      method: 'POST',
      body: upstream,
      signal: AbortSignal.timeout(30000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: data.detail || 'upload_failed' }, { status: res.status });
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ ok: false, error: 'store_unavailable' }, { status: 502 });
  }
}

export async function GET(req: Request) {
  const user = await requireSession();
  if (user instanceof NextResponse) return user;

  try {
    const res = await fetch(`${ISKCON_DESK_BASE}/api/panihati/documents`, {
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ ok: false, error: 'store_unavailable' }, { status: 502 });
  }
}
