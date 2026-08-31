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

  let reply;
  try {
    reply = await handleJudgeAriaPrompt(prompt, lang, correlationId);
  } catch (error) {
    console.error('Judge ARIA backend error:', error);
    const safeCorrelation = correlationId || `judge-aria-${Date.now()}`;
    return NextResponse.json({
      text:
        lang === 'es'
          ? `Estoy aquí contigo. Una conexión interna falló, pero no voy a mostrar detalles técnicos en el chat. Puedes intentar de nuevo o ejecutar una prueba del Judge. Referencia: ${safeCorrelation}.`
          : `I am here with you. An internal connection failed, but I will not show technical details in the chat. You can try again or run a Judge test. Reference: ${safeCorrelation}.`,
      source: 'judge_aria',
      correlation_id: safeCorrelation,
      action: { id: 'ask_aria', status: 'PARTIAL' },
      ok: false,
    });
  }

  return NextResponse.json({
    text: reply.text,
    source: reply.source,
    correlation_id: reply.correlation_id,
    action: reply.action ? { id: reply.action, status: reply.actionStatus || (reply.ok ? 'LIVE' : 'NOT_READY') } : undefined,
    ok: reply.ok,
  });
}
