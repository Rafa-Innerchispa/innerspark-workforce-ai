import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { GoogleGenAI } from '@google/genai';

import { buildMinimalPdf } from '@/lib/minimalPdf';
import { geminiConfigured, resolveGeminiApiKey, resolveGeminiModel } from '@/lib/geminiConfig';
import type { McpBridgeResult } from '@/lib/ralfiaMcpBridge';

const ARTIFACT_DIR =
  process.env.JUDGE_ARTIFACT_DIR || '/home/rlopez/data/judge/artifacts';

function localFallbackLines(nonce: string): string[] {
  return [
    `InnerOS Judge emergency plan (LOCAL FALLBACK — Gemini unavailable)`,
    `Verification nonce: ${nonce}`,
    `Generated at: ${new Date().toISOString()}`,
    '1. Secure the perimeter and notify festival leads.',
    '2. Open medical and security channels on radio channel 2.',
    '3. Pause crowd ingress at main gates until all-clear.',
    '4. Log incident in InnerOS ops trace with correlation ID.',
  ];
}

export async function runGeminiEmergencyPdfProof(
  correlationId: string
): Promise<McpBridgeResult> {
  const nonce = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const startedAt = Date.now();
  const title = `Emergency Operations Plan · ${nonce}`;

  let text = '';
  let provider = 'Google Gemini';
  let model = resolveGeminiModel();
  let geminiFallback = false;

  if (geminiConfigured()) {
    try {
      const ai = new GoogleGenAI({ apiKey: resolveGeminiApiKey()! });
      const prompt = `Write a concise emergency operations plan for an ISKCON festival crowd incident.
Use 4-6 numbered bullet points. Include verification nonce ${nonce} and ISO timestamp ${new Date().toISOString()}.
Keep under 130 words. Professional tone.`;
      const response = await ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });
      text = String(response.text || '').trim();
    } catch {
      text = '';
    }
  }

  if (!text) {
    geminiFallback = true;
    provider = 'InnerOS local artifact engine';
    model = 'local-fallback';
    text = localFallbackLines(nonce).join('\n');
  }

  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  const pdf = buildMinimalPdf(title, lines);
  await mkdir(ARTIFACT_DIR, { recursive: true });
  const artifactId = `judge-gemini-pdf-${nonce}`;
  await writeFile(path.join(ARTIFACT_DIR, `${artifactId}.pdf`), pdf);

  const latency_ms = Date.now() - startedAt;

  return {
    ok: true,
    correlation_id: correlationId,
    status: geminiFallback ? 'PARTIAL' : 'PASS',
    provider,
    model,
    latency_ms,
    nonce,
    gemini_excerpt: text.slice(0, 320),
    gemini_fallback: geminiFallback,
    text,
    pdf_url: `/api/ecosystem/judge/artifact?id=${artifactId}`,
    pdf_filename: `${artifactId}.pdf`,
    content_type: 'application/pdf',
    artifacts: [
      {
        name: `${artifactId}.pdf`,
        mime: 'application/pdf',
        url: `/api/ecosystem/judge/artifact?id=${artifactId}`,
      },
    ],
  };
}
