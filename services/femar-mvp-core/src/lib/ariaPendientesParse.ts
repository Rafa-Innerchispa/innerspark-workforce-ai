export type PendienteIntent =
  | { kind: 'save'; title: string; body: string; priority: 'normal' | 'high' }
  | { kind: 'list' }
  | { kind: 'complete'; index?: number; titleMatch?: string }
  | { kind: 'help' };

function stripQuotes(text: string): string {
  return text.replace(/^["'«]|["'»]$/g, '').trim();
}

function extractSavePayload(prompt: string): { title: string; body: string; priority: 'normal' | 'high' } {
  const priority: 'normal' | 'high' = /\b(urgente|prioridad alta|importante|p0|p1)\b/i.test(prompt) ? 'high' : 'normal';
  let rest = prompt.trim();

  const patterns = [
    /\b(guarda|guardar|anota|anotar|registra|registrar|recuerda|apunta)\b[^:.\n]{0,40}\b(como\s+)?pendiente\b\s*[:\-]?\s*/i,
    /\b(queda|quedó|quedo)\s+pendiente\b\s*[:\-]?\s*/i,
    /\bpendiente\s*[:\-]\s*/i,
    /\b(save|remember)\b[^:.\n]{0,30}\b(as\s+)?pending\b\s*[:\-]?\s*/i,
    /\bpending\s*[:\-]\s*/i,
  ];

  for (const re of patterns) {
    const m = rest.match(re);
    if (m && m.index !== undefined) {
      rest = rest.slice(m.index + m[0].length).trim();
      break;
    }
  }

  rest = stripQuotes(rest);
  if (!rest) {
    return { title: 'Pendiente sin detalle', body: prompt.trim(), priority };
  }

  const firstLine = rest.split(/\n/)[0].trim();
  const title = firstLine.slice(0, 160);
  const body = rest.length > title.length ? rest : firstLine;
  return { title, body, priority };
}

export function parsePendienteIntent(prompt: string): PendienteIntent | null {
  const raw = prompt.trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();

  if (
    /\b(ayuda pendientes|help pending|como guardo pendientes|cómo guardo pendientes|agente pendientes)\b/i.test(
      lower
    )
  ) {
    return { kind: 'help' };
  }

  if (
    /\b(guarda|guardar|anota|anotar|registra|registrar|recuerda|apunta)\b/i.test(lower) &&
    /\b(como\s+)?pendiente\b/i.test(lower)
  ) {
    const payload = extractSavePayload(raw);
    return { kind: 'save', ...payload };
  }

  if (/\b(queda|quedó|quedo)\s+pendiente\b/i.test(lower) && !/\b(cu[aá]les?|lista|mis)\b/i.test(lower)) {
    const payload = extractSavePayload(raw);
    return { kind: 'save', ...payload };
  }

  if (/^(pendiente|pending)\s*[:\-]/i.test(raw)) {
    const payload = extractSavePayload(raw);
    return { kind: 'save', ...payload };
  }

  if (
    /\b(cu[aá]les?\s+(son\s+)?(los\s+|mis\s+)?pendientes|lista(r)?\s+(mis\s+)?pendientes|mis\s+pendientes|qu[eé]\s+queda\s+pendiente|show\s+(my\s+)?pending|list\s+pending)\b/i.test(
      lower
    )
  ) {
    return { kind: 'list' };
  }

  const doneEs = lower.match(/\b(marca|marcar|cerrar|completar|listo|hecho)\b.*\bpendiente\b\s*(\d+)/i);
  if (doneEs) {
    return { kind: 'complete', index: Number(doneEs[2]) };
  }

  const doneEn = lower.match(/\b(mark|close|complete|done)\b.*\bpending\b\s*(\d+)/i);
  if (doneEn) {
    return { kind: 'complete', index: Number(doneEn[2]) };
  }

  const doneTitle = lower.match(/\b(marca|cerrar|completar)\b\s+pendiente\s+(.{3,80})$/i);
  if (doneTitle) {
    return { kind: 'complete', titleMatch: stripQuotes(doneTitle[2]) };
  }

  return null;
}
