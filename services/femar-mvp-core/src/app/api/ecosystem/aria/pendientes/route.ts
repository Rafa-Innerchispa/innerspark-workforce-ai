import { NextResponse } from 'next/server';
import {
  completePendiente,
  createPendienteWithMirror,
  listPendientes,
} from '@/lib/ariaPendientesStore';
import { requireSession } from '@/lib/sessionAuth';

export async function GET(req: Request) {
  const user = await requireSession();
  if (user instanceof NextResponse) return user;

  const url = new URL(req.url);
  const status = url.searchParams.get('status') === 'all' ? 'all' : 'open';
  const items = await listPendientes({ userId: user.id, status, limit: 50 });
  return NextResponse.json({ ok: true, count: items.length, items });
}

export async function POST(req: Request) {
  const user = await requireSession();
  if (user instanceof NextResponse) return user;

  const body = await req.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  if (!title) {
    return NextResponse.json({ ok: false, error: 'title required' }, { status: 400 });
  }

  const saved = await createPendienteWithMirror({
    userId: user.id,
    companyId: user.companyId,
    title,
    body: String(body.body || title),
    moduleId: body.moduleId ? String(body.moduleId) : undefined,
    priority: body.priority === 'high' ? 'high' : 'normal',
    tags: Array.isArray(body.tags) ? body.tags.map(String) : undefined,
  });

  return NextResponse.json({ ok: true, item: saved });
}

export async function PATCH(req: Request) {
  const user = await requireSession();
  if (user instanceof NextResponse) return user;

  const body = await req.json().catch(() => ({}));
  const action = String(body.action || 'complete');
  if (action !== 'complete') {
    return NextResponse.json({ ok: false, error: 'unsupported action' }, { status: 400 });
  }

  const done = await completePendiente({
    userId: user.id,
    pendienteId: body.id ? String(body.id) : undefined,
    index: typeof body.index === 'number' ? body.index : undefined,
    titleMatch: body.titleMatch ? String(body.titleMatch) : undefined,
  });

  if (!done) {
    return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, item: done });
}
