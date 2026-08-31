import { NextResponse } from 'next/server';

const LEMONADE_BASE = (process.env.LEMONADE_HOST || 'http://127.0.0.1:13305').replace(/\/$/, '');

/** Proxies to local Lemonade (kokoro) — guest login ARIA also uses this. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const text = String(body.text || '').trim();
  const lang = body.lang === 'en' ? 'en' : 'es';
  const voice = String(body.voice || 'shimmer');

  if (!text) {
    return NextResponse.json({ ok: false, error: 'missing_text' }, { status: 400 });
  }

  const input = text.slice(0, 500);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const apiKey = process.env.LEMONADE_API_KEY?.trim();
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  try {
    const res = await fetch(`${LEMONADE_BASE}/api/v1/audio/speech`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: 'kokoro-v1',
        input,
        voice,
        response_format: 'mp3',
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      return NextResponse.json(
        { ok: false, error: 'lemonade_tts_failed', detail: detail.slice(0, 200), lang },
        { status: 502 }
      );
    }

    const audio = await res.arrayBuffer();
    return new NextResponse(audio, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: 'tts_unreachable', message }, { status: 502 });
  }
}
