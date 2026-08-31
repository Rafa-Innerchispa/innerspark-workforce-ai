import { NextResponse } from 'next/server';
import { handleJudgeAriaPrompt } from '@/lib/judgeAriaEngine';
import { requireJudgeConsoleAccess } from '@/lib/sessionAuth';

export async function POST(req: Request) {
  const user = await requireJudgeConsoleAccess();
  if (user instanceof NextResponse) return user;

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const prompt = String(body.prompt || '').trim();
  if (!prompt) {
    return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
  }

  const lang = body.lang === 'es' ? 'es' : 'en';
  const correlationId =
    typeof body.correlation_id === 'string' && body.correlation_id.trim()
      ? body.correlation_id.trim()
      : undefined;

  const reply = await handleJudgeAriaPrompt(prompt, lang, correlationId);

  return NextResponse.json({
    text: reply.text,
    source: reply.source,
    correlation_id: reply.correlation_id,
    action: reply.action ? { id: reply.action, status: reply.actionStatus || (reply.ok ? 'LIVE' : 'NOT_READY') } : undefined,
    ok: reply.ok,
  });
}
