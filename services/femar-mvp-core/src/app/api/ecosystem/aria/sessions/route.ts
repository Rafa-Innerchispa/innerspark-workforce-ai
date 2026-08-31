import { NextResponse } from 'next/server';
import { listAriaSessions, saveAriaSession, type StoredAriaMessage } from '@/lib/ariaChatStore';
import { requireSession } from '@/lib/sessionAuth';

export async function GET(req: Request) {
  const user = await requireSession();
  if (user instanceof NextResponse) return user;

  const url = new URL(req.url);
  const moduleId = url.searchParams.get('moduleId') || 'portal';

  const sessions = await listAriaSessions(user.id, moduleId);
  return NextResponse.json({ ok: true, moduleId, sessions });
}

export async function POST(req: Request) {
  const user = await requireSession();
  if (user instanceof NextResponse) return user;

  const body = await req.json().catch(() => ({}));
  const moduleId = String(body.moduleId || 'portal');
  const sessionId = body.sessionId ? String(body.sessionId) : undefined;
  const messages = Array.isArray(body.messages) ? (body.messages as StoredAriaMessage[]) : [];

  const saved = await saveAriaSession({
    sessionId,
    userId: user.id,
    companyId: user.companyId,
    moduleId,
    messages,
    titleFallback: moduleId === 'iskcon-desk' ? 'ISKCON Desk' : 'InnerOS',
  });

  return NextResponse.json({ ok: true, session: saved });
}
