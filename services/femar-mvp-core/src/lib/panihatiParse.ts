import type { PanihatiBudgetEntryInput, PanihatiSponsorEntryInput } from '@/lib/panihatiRegistry';

export type PanihatiParsedIntent =
  | { kind: 'summary' }
  | { kind: 'search'; query: string }
  | { kind: 'budget'; entry: PanihatiBudgetEntryInput }
  | { kind: 'sponsor'; entry: PanihatiSponsorEntryInput }
  | { kind: 'tasks' }
  | { kind: 'info' };

function extractAmount(text: string): number | undefined {
  const m = text.match(/(?:\$|usd|us\$|dolares|dólares)?\s*(\d+(?:[.,]\d{1,2})?)/i);
  if (!m) return undefined;
  return Number(m[1].replace(',', '.'));
}

function extractAfterKeyword(text: string, keywords: RegExp): string {
  const m = text.match(keywords);
  if (!m || m.index === undefined) return text.trim();
  return text.slice(m.index + m[0].length).trim();
}

export function parsePanihatiIntent(prompt: string): PanihatiParsedIntent | null {
  const lower = prompt.toLowerCase().trim();
  if (!lower) return null;

  const isPanihati =
    /\bpanihati\b/.test(lower) ||
    /\bpresupuesto festival\b/.test(lower) ||
    /\bfestival panihati\b/.test(lower) ||
    (/\b(festival|presupuesto|cotizaci[oó]n|gasto|recaud|colect)\b/.test(lower) &&
      /\b(2026|iskcon|ffl|urdesa)\b/.test(lower));

  const isBudgetAction =
    /\b(registrar|registra|anotar|agregar|cotizaci[oó]n|cotizar|gasto|donaci[oó]n|ingreso|presupuesto|buscar|search|resumen|tareas)\b/.test(
      lower
    );

  if (!isPanihati && !isBudgetAction) return null;

  if (/\b(resumen|summary|balance|cuanto llevamos|cuánto llevamos|total gastado|total recaud)\b/.test(lower)) {
    return { kind: 'summary' };
  }

  if (/\b(tareas|tasks|calendario|pendientes)\b/.test(lower)) {
    return { kind: 'tasks' };
  }

  if (/\b(buscar|search|encuentra|d[oó]nde est[aá]|info de)\b/.test(lower)) {
    const query = extractAfterKeyword(lower, /\b(buscar|search|encuentra|info de)\b/i).replace(/^["']|["']$/g, '');
    if (query.length >= 2) return { kind: 'search', query };
  }

  if (/\b(registrar|registra|anotar|agregar|nuevo|cotizaci[oó]n|cotizar|gasto|pago|donaci[oó]n|ingreso)\b/.test(lower)) {
    const amount = extractAmount(lower);
    const isIncome = /\b(ingreso|recaud|colect|donaci[oó]n)\b/.test(lower);
    const isQuote = /\b(cotizaci[oó]n|cotizar|cotizado)\b/.test(lower);
    const isSponsor = /\b(sponsor|patrocinador|donante)\b/.test(lower);

    let concepto = extractAfterKeyword(
      lower,
      /\b(registrar|registra|anotar|agregar|nuevo|cotizaci[oó]n|cotizar|gasto|pago|donaci[oó]n|ingreso)\b/i
    )
      .replace(/\$?\d+(?:[.,]\d+)?/g, '')
      .replace(/\b(usd|dolares|dólares|proveedor|de|para)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const proveedorMatch = lower.match(/\bproveedor\s+([a-záéíóúñ0-9 .-]{2,40})/i);
    const proveedor = proveedorMatch?.[1]?.trim();

    if (isSponsor) {
      return {
        kind: 'sponsor',
        entry: {
          nombre: concepto || 'Patrocinador Panihati',
          montoUsd: amount,
          estado: isQuote ? 'Cotizado' : 'Confirmado',
          notas: prompt.trim(),
        },
      };
    }

    if (!concepto) concepto = isIncome ? 'Ingreso Panihati' : 'Gasto Panihati';

    return {
      kind: 'budget',
      entry: {
        concepto: concepto.charAt(0).toUpperCase() + concepto.slice(1),
        tipo: isIncome ? 'Ingreso' : /\bespecie\b/.test(lower) ? 'Especie' : isQuote ? 'Gasto' : 'Gasto',
        montoEstimado: isQuote ? amount : undefined,
        montoReal: !isQuote ? amount : undefined,
        proveedor,
        estado: isQuote ? 'Cotizado' : amount ? 'Pagado' : 'Estimado',
        notas: prompt.trim(),
      },
    };
  }

  if (/\b(fecha|donde|dónde|cuando|cuándo|meta|asistentes|ffl|cuentas|info)\b/.test(lower)) {
    return { kind: 'info' };
  }

  if (/\bpanihati\b/.test(lower)) {
    return { kind: 'summary' };
  }

  return null;
}
