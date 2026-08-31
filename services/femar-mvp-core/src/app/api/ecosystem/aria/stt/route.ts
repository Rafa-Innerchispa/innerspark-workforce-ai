import { NextResponse } from 'next/server';

const LEMONADE_BASE = (process.env.LEMONADE_HOST || 'http://127.0.0.1:13305').replace(/\/$/, '');

/** Local-first STT via Lemonade Whisper-Tiny (16kHz mono WAV). */
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof Blob) || file.size === 0) {
    return NextResponse.json({ ok: false, error: 'missing_audio' }, { status: 400 });
  }

  const headers: Record<string, string> = {};
  const apiKey = process.env.LEMONADE_API_KEY?.trim();
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const body = new FormData();
  body.append('file', file, 'audio.wav');
  body.append('model', 'Whisper-Tiny');

  try {
    const res = await fetch(`${LEMONADE_BASE}/api/v1/audio/transcriptions`, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(45000),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      return NextResponse.json(
        { ok: false, error: 'lemonade_stt_failed', detail: detail.slice(0, 200) },
        { status: 502 }
      );
    }
    const data = (await res.json()) as { text?: string };
    return NextResponse.json({ ok: true, text: String(data.text || '').trim(), source: 'lemonade' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: 'stt_unreachable', message }, { status: 502 });
  }
}
