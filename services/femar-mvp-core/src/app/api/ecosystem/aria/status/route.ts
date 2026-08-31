import { NextResponse } from 'next/server';
import { geminiConfigured, resolveGeminiModel } from '@/lib/geminiConfig';

export async function GET() {
  const configured = geminiConfigured();
  let reachable = false;
  let error: string | null = null;

  if (configured) {
    const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const model = resolveGeminiModel();
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key! },
        body: JSON.stringify({ contents: [{ parts: [{ text: 'ping' }] }] }),
        signal: AbortSignal.timeout(8000),
      });
      const body = await res.json();
      reachable = res.ok && Boolean(body.candidates?.length);
      if (!reachable) error = body.error?.message || `HTTP ${res.status}`;
    } catch (e) {
      error = e instanceof Error ? e.message : 'unreachable';
    }
  }

  return NextResponse.json({
    ok: configured && reachable,
    mode: configured && reachable ? 'gemini' : 'local',
    configured,
    reachable,
    model: resolveGeminiModel(),
    error,
  });
}
