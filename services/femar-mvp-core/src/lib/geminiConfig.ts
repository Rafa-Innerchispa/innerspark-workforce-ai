/** Resolve Gemini credentials from platform env (supports legacy GOOGLE_API_KEY). */
export function resolveGeminiApiKey(): string | null {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  return key?.trim() || null;
}

/** Use local-first; Gemini only when key is healthy. */
export function resolveGeminiModel(): string {
  return (
    process.env.GEMINI_TEXT_MODEL?.trim() ||
    process.env.GOOGLE_GEMINI_MODEL?.trim() ||
    'gemini-2.5-flash'
  );
}

export function geminiConfigured(): boolean {
  return Boolean(resolveGeminiApiKey());
}

export function isGeminiAuthError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return /403|401|PERMISSION_DENIED|API key|leaked|invalid/i.test(msg);
}
