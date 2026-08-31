import { NextResponse } from 'next/server';
import { listAriaSessions, saveAriaSession, type StoredAriaMessage } from '@/lib/ariaChatStore';
import { requireSession } from '@/lib/sessionAuth';

export async function GET(req: Request) {
  const user = await requireSession();
  if (user instanceof NextResponse) return user;

  const url = new URL(req.url);
  const moduleId = url.searchParams.get('moduleId') || 'portal';

  if (user.companyId === 'hackathon') {
    return NextResponse.json({ ok: true, moduleId, sessions: [], storage: 'local_browser_only' });
  }

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

  if (user.companyId === 'hackathon') {
    return NextResponse.json({
      ok: true,
      session: {
        id: sessionId || `judge-${Date.now()}`,
        title: moduleId === 'judge' ? 'Judge ARIA' : 'InnerOS',
        updatedAt: new Date().toISOString(),
        messages,
      },
      storage: 'local_browser_only',
    });
  }

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
