import { PANIHATI_2026_FACTS } from '@/lib/panihatiRegistry';
import type { PanihatiBudgetEntryInput, PanihatiSponsorEntryInput } from '@/lib/panihatiRegistry';

const ISKCON_DESK_BASE = process.env.ISKCON_DESK_INTERNAL_URL || 'http://127.0.0.1:2027';

export type PanihatiBudgetRow = {
  id: string;
  concepto: string;
  tipo: string;
  categoria: string;
  estado: string;
  monto_estimado: number;
  monto_real: number;
  proveedor: string;
  notas: string;
  fecha: string;
  document_ids?: string[];
  created_at?: string;
  source?: string;
};

export type PanihatiSponsorRow = {
  id: string;
  nombre: string;
  tipo: string;
  nivel: string;
  monto_usd: number;
  contacto: string;
  telefono: string;
  email: string;
  estado: string;
  notas: string;
};

export type PanihatiTaskRow = {
  id: string;
  tarea: string;
  area: string;
  responsable: string;
  estado: string;
  fecha_limite: string;
  notas: string;
};

export type PanihatiDocumentRow = {
  id: string;
  filename: string;
  mime: string;
  size_bytes: number;
  linked_concepto: string;
  uploaded_at: string;
};

export type PanihatiSummary = {
  store: string;
  notionConnected: boolean;
  facts: typeof PANIHATI_2026_FACTS;
  budget: {
    lineCount: number;
    totalEstimatedExpenses: number;
    totalRealExpenses: number;
    totalIncome: number;
    totalDonations: number;
    balance: number;
    targetGap: number;
    byCategory: Record<string, number>;
  };
  sponsors: { count: number; totalUsd: number };
  tasks: { total: number; pending: number; done: number };
  documents: { count: number };
};

async function deskFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(`${ISKCON_DESK_BASE}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init?.headers || {}),
      },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function mapSummary(raw: Record<string, unknown>): PanihatiSummary {
  const byCategory = (raw.by_category as Record<string, number>) || {};
  return {
    store: 'local_json',
    notionConnected: false,
    facts: PANIHATI_2026_FACTS,
    budget: {
      lineCount: Number(raw.budget_lines || 0),
      totalEstimatedExpenses: Number(raw.total_estimated_expenses || 0),
      totalRealExpenses: Number(raw.total_real_expenses || 0),
      totalIncome: Number(raw.total_income || 0),
      totalDonations: Number(raw.total_donations || 0),
      balance: Number(raw.balance_usd || 0),
      targetGap: Number(raw.target_gap_usd || 0),
      byCategory,
    },
    sponsors: {
      count: Number(raw.sponsors_count || 0),
      totalUsd: Number(raw.sponsor_total_usd || 0),
    },
    tasks: {
      total: Number(raw.tasks_total || 0),
      pending: Number(raw.tasks_pending || 0),
      done: Math.max(0, Number(raw.tasks_total || 0) - Number(raw.tasks_pending || 0)),
    },
    documents: { count: Number(raw.documents_count || 0) },
  };
}

export function panihatiStoreAvailable(): boolean {
  return Boolean(ISKCON_DESK_BASE);
}

export async function getPanihatiSummary(): Promise<PanihatiSummary> {
  const body = await deskFetch<{ summary?: Record<string, unknown> }>('/api/panihati/summary');
  if (!body?.summary) {
    return {
      store: 'unavailable',
      notionConnected: false,
      facts: PANIHATI_2026_FACTS,
      budget: {
        lineCount: 0,
        totalEstimatedExpenses: 0,
        totalRealExpenses: 0,
        totalIncome: 0,
        totalDonations: 0,
        balance: 0,
        targetGap: PANIHATI_2026_FACTS.budgetTargetUsd,
        byCategory: {},
      },
      sponsors: { count: 0, totalUsd: 0 },
      tasks: { total: 0, pending: 0, done: 0 },
      documents: { count: 0 },
    };
  }
  return mapSummary(body.summary);
}

export async function listBudgetEntries(): Promise<PanihatiBudgetRow[]> {
  const body = await deskFetch<{ items?: PanihatiBudgetRow[] }>('/api/panihati/budget');
  return body?.items || [];
}

export async function listSponsorEntries(): Promise<PanihatiSponsorRow[]> {
  const body = await deskFetch<{ items?: PanihatiSponsorRow[] }>('/api/panihati/sponsors');
  return body?.items || [];
}

export async function listTaskEntries(): Promise<PanihatiTaskRow[]> {
  const body = await deskFetch<{ items?: PanihatiTaskRow[] }>('/api/panihati/tasks');
  return body?.items || [];
}

export async function listDocumentEntries(): Promise<PanihatiDocumentRow[]> {
  const body = await deskFetch<{ items?: PanihatiDocumentRow[] }>('/api/panihati/documents');
  return body?.items || [];
}

export async function createBudgetEntry(entry: PanihatiBudgetEntryInput & { source?: string }): Promise<PanihatiBudgetRow | null> {
  const body = await deskFetch<{ item?: PanihatiBudgetRow }>('/api/panihati/budget', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      concepto: entry.concepto,
      tipo: entry.tipo,
      categoria: entry.categoria || 'Otros',
      estado: entry.estado || 'Estimado',
      monto_estimado: entry.montoEstimado || 0,
      monto_real: entry.montoReal || 0,
      proveedor: entry.proveedor || '',
      notas: entry.notas || '',
      source: entry.source || 'desk',
    }),
  });
  return body?.item || null;
}

export async function createSponsorEntry(entry: PanihatiSponsorEntryInput & { source?: string }): Promise<PanihatiSponsorRow | null> {
  const body = await deskFetch<{ item?: PanihatiSponsorRow }>('/api/panihati/sponsors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nombre: entry.nombre,
      tipo: entry.tipo || 'Devoto',
      nivel: entry.nivel || 'Voluntario',
      monto_usd: entry.montoUsd || 0,
      contacto: entry.contacto || '',
      telefono: entry.telefono || '',
      email: entry.email || '',
      estado: entry.estado || 'Confirmado',
      notas: entry.notas || '',
      source: entry.source || 'desk',
    }),
  });
  return body?.item || null;
}

export async function uploadPanihatiDocument(file: File, linkedConcepto = ''): Promise<PanihatiDocumentRow | null> {
  const form = new FormData();
  form.append('file', file);
  form.append('linked_concepto', linkedConcepto);
  try {
    const res = await fetch(`${ISKCON_DESK_BASE}/api/panihati/documents`, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { item?: PanihatiDocumentRow };
    return data.item || null;
  } catch {
    return null;
  }
}

export async function searchPanihati(query: string): Promise<{
  query: string;
  budget: PanihatiBudgetRow[];
  sponsors: PanihatiSponsorRow[];
  tasks: PanihatiTaskRow[];
  documents: PanihatiDocumentRow[];
}> {
  const q = encodeURIComponent(query.trim());
  const body = await deskFetch<{
    query?: string;
    budget?: PanihatiBudgetRow[];
    sponsors?: PanihatiSponsorRow[];
    tasks?: PanihatiTaskRow[];
    documents?: PanihatiDocumentRow[];
  }>(`/api/panihati/search?q=${q}`);
  return {
    query: body?.query || query,
    budget: body?.budget || [],
    sponsors: body?.sponsors || [],
    tasks: body?.tasks || [],
    documents: body?.documents || [],
  };
}

export function formatPanihatiSummaryText(summary: PanihatiSummary, lang: 'es' | 'en'): string {
  const f = summary.facts;
  const b = summary.budget;
  const money = (n: number) =>
    new Intl.NumberFormat(lang === 'es' ? 'es-EC' : 'en-US', { style: 'currency', currency: 'USD' }).format(n);

  if (summary.store === 'unavailable') {
    return lang === 'es'
      ? `Panihati 2026 — servicio local (:2027) no responde.\nMeta presupuesto: ${money(f.budgetTargetUsd)}.`
      : `Panihati 2026 — local service (:2027) unavailable.\nBudget target: ${money(f.budgetTargetUsd)}.`;
  }

  const topCats = Object.entries(b.byCategory)
    .sort((a, c) => c[1] - a[1])
    .slice(0, 5)
    .map(([cat, amt]) => `  • ${cat}: ${money(amt)}`)
    .join('\n');

  return lang === 'es'
    ? `${f.name}\n📅 ${f.date} · ${f.time}\n📍 ${f.venue}\n\n💾 Almacenamiento: local (servidor ISKCON Desk)\n💰 Meta: ${money(f.budgetTargetUsd)}\n📊 Líneas: ${b.lineCount}\n💸 Gastos estimados: ${money(b.totalEstimatedExpenses)}\n💵 Gastos reales: ${money(b.totalRealExpenses)}\n📥 Ingresos + donaciones: ${money(b.totalIncome + b.totalDonations)}\n🤝 Sponsors (${summary.sponsors.count}): ${money(summary.sponsors.totalUsd)}\n📎 Documentos: ${summary.documents.count}\n⚖️ Balance: ${money(b.balance)}\n📋 Tareas: ${summary.tasks.pending} pendientes / ${summary.tasks.total} total\n\nTop rubros:\n${topCats || '  (sin gastos aún)'}`
    : `${f.name}\n📅 ${f.date} · ${f.time}\n📍 ${f.venue}\n\n💾 Storage: local (ISKCON Desk server)\n💰 Target: ${money(f.budgetTargetUsd)}\n📊 Lines: ${b.lineCount}\n💸 Estimated expenses: ${money(b.totalEstimatedExpenses)}\n💵 Real expenses: ${money(b.totalRealExpenses)}\n📥 Income + donations: ${money(b.totalIncome + b.totalDonations)}\n🤝 Sponsors (${summary.sponsors.count}): ${money(summary.sponsors.totalUsd)}\n📎 Documents: ${summary.documents.count}\n⚖️ Balance: ${money(b.balance)}\n📋 Tasks: ${summary.tasks.pending} pending / ${summary.tasks.total} total\n\nTop categories:\n${topCats || '  (no expenses yet)'}`;
}

export function formatPanihatiSearchText(
  results: Awaited<ReturnType<typeof searchPanihati>>,
  lang: 'es' | 'en'
): string {
  const money = (n: number) =>
    new Intl.NumberFormat(lang === 'es' ? 'es-EC' : 'en-US', { style: 'currency', currency: 'USD' }).format(n);

  if (!results.query) {
    return lang === 'es' ? 'Escribe qué buscar (ej. sonido, carpas, René).' : 'Type what to search (e.g. sound, tents, René).';
  }

  const parts: string[] = [];
  if (results.budget.length) {
    parts.push(
      (lang === 'es' ? 'Presupuesto:' : 'Budget:') +
        '\n' +
        results.budget
          .map((r) => `• ${r.concepto} — ${r.tipo} ${money(r.monto_real || r.monto_estimado || 0)} (${r.estado})`)
          .join('\n')
    );
  }
  if (results.sponsors.length) {
    parts.push(
      (lang === 'es' ? 'Sponsors:' : 'Sponsors:') +
        '\n' +
        results.sponsors.map((r) => `• ${r.nombre} — ${money(r.monto_usd || 0)} (${r.estado})`).join('\n')
    );
  }
  if (results.tasks.length) {
    parts.push(
      (lang === 'es' ? 'Tareas:' : 'Tasks:') +
        '\n' +
        results.tasks.map((r) => `• ${r.tarea} — ${r.responsable || '?'} (${r.estado})`).join('\n')
    );
  }
  if (results.documents.length) {
    parts.push(
      (lang === 'es' ? 'Documentos:' : 'Documents:') +
        '\n' +
        results.documents.map((r) => `• ${r.filename}${r.linked_concepto ? ` → ${r.linked_concepto}` : ''}`).join('\n')
    );
  }

  if (!parts.length) {
    return lang === 'es'
      ? `Sin resultados para "${results.query}" en Panihati 2026.`
      : `No results for "${results.query}" in Panihati 2026.`;
  }

  return `${lang === 'es' ? 'Resultados' : 'Results'} "${results.query}":\n\n${parts.join('\n\n')}`;
}
