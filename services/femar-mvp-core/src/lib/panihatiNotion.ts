import {
  PANIHATI_2026_FACTS,
  PANIHATI_NOTION,
  type PanihatiBudgetEntryInput,
  type PanihatiSponsorEntryInput,
} from '@/lib/panihatiRegistry';

const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

type NotionProp = Record<string, unknown>;

export type PanihatiBudgetRow = {
  id: string;
  url?: string;
  concepto: string;
  tipo: string;
  categoria: string;
  estado: string;
  montoEstimado: number;
  montoReal: number;
  proveedor: string;
  notas: string;
  fecha: string;
};

export type PanihatiSponsorRow = {
  id: string;
  url?: string;
  nombre: string;
  tipo: string;
  nivel: string;
  montoUsd: number;
  contacto: string;
  telefono: string;
  email: string;
  estado: string;
  notas: string;
};

export type PanihatiTaskRow = {
  id: string;
  url?: string;
  tarea: string;
  area: string;
  responsable: string;
  estado: string;
  fechaLimite: string;
  notas: string;
};

export type PanihatiSummary = {
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
  hubUrl: string;
};

function notionToken(): string | null {
  return process.env.NOTION_API_TOKEN?.trim() || process.env.NOTION_SECRET?.trim() || null;
}

export function panihatiNotionConfigured(): boolean {
  return Boolean(notionToken());
}

function richText(text: string): NotionProp {
  return { rich_text: [{ type: 'text', text: { content: text.slice(0, 1800) } }] };
}

function titleText(text: string): NotionProp {
  return { title: [{ type: 'text', text: { content: text.slice(0, 1800) } }] };
}

function select(name: string): NotionProp {
  return { select: { name } };
}

function numberProp(value?: number): NotionProp {
  return { number: typeof value === 'number' && Number.isFinite(value) ? value : null };
}

function dateProp(iso?: string): NotionProp {
  if (!iso) return { date: null };
  return { date: { start: iso.slice(0, 10) } };
}

async function notionRequest<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const token = notionToken();
  if (!token) throw new Error('NOTION_API_TOKEN no configurado');

  const res = await fetch(`${NOTION_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    signal: AbortSignal.timeout(15000),
  });

  const data = (await res.json().catch(() => ({}))) as T & { message?: string };
  if (!res.ok) {
    throw new Error(data.message || `Notion HTTP ${res.status}`);
  }
  return data;
}

function plainTitle(props: Record<string, { type: string; title?: Array<{ plain_text: string }> }>): string {
  const key = Object.keys(props).find((k) => props[k]?.type === 'title');
  if (!key) return '';
  return props[key].title?.[0]?.plain_text || '';
}

function propSelect(props: Record<string, { type: string; select?: { name?: string } | null }>, key: string): string {
  const p = props[key];
  if (!p || p.type !== 'select') return '';
  return p.select?.name || '';
}

function propNumber(props: Record<string, { type: string; number?: number | null }>, key: string): number {
  const p = props[key];
  if (!p || p.type !== 'number') return 0;
  return typeof p.number === 'number' ? p.number : 0;
}

function propRich(props: Record<string, { type: string; rich_text?: Array<{ plain_text: string }> }>, key: string): string {
  const p = props[key];
  if (!p || p.type !== 'rich_text') return '';
  return p.rich_text?.map((t) => t.plain_text).join('') || '';
}

function propDate(props: Record<string, { type: string; date?: { start?: string } | null }>, key: string): string {
  const p = props[key];
  if (!p || p.type !== 'date') return '';
  return p.date?.start || '';
}

function mapBudgetRow(page: { id: string; url?: string; properties: Record<string, unknown> }): PanihatiBudgetRow {
  const props = page.properties as Record<string, never>;
  return {
    id: page.id,
    url: page.url,
    concepto: plainTitle(props),
    tipo: propSelect(props, 'Tipo'),
    categoria: propSelect(props, 'Categoria'),
    estado: propSelect(props, 'Estado'),
    montoEstimado: propNumber(props, 'Monto estimado USD'),
    montoReal: propNumber(props, 'Monto real USD'),
    proveedor: propRich(props, 'Proveedor'),
    notas: propRich(props, 'Notas'),
    fecha: propDate(props, 'Fecha'),
  };
}

function mapSponsorRow(page: { id: string; url?: string; properties: Record<string, unknown> }): PanihatiSponsorRow {
  const props = page.properties as Record<string, never>;
  return {
    id: page.id,
    url: page.url,
    nombre: plainTitle(props),
    tipo: propSelect(props, 'Tipo'),
    nivel: propSelect(props, 'Nivel'),
    montoUsd: propNumber(props, 'Monto USD'),
    contacto: propRich(props, 'Contacto'),
    telefono: propRich(props, 'Telefono'),
    email: propRich(props, 'Email'),
    estado: propSelect(props, 'Estado'),
    notas: propRich(props, 'Notas'),
  };
}

function mapTaskRow(page: { id: string; url?: string; properties: Record<string, unknown> }): PanihatiTaskRow {
  const props = page.properties as Record<string, never>;
  return {
    id: page.id,
    url: page.url,
    tarea: plainTitle(props),
    area: propSelect(props, 'Area'),
    responsable: propRich(props, 'Responsable'),
    estado: propSelect(props, 'Estado'),
    fechaLimite: propDate(props, 'Fecha limite'),
    notas: propRich(props, 'Notas'),
  };
}

async function queryDatabase<T>(
  databaseId: string,
  mapper: (page: { id: string; url?: string; properties: Record<string, unknown> }) => T,
  filter?: Record<string, unknown>
): Promise<T[]> {
  const items: T[] = [];
  let cursor: string | undefined;

  do {
    const body: Record<string, unknown> = { page_size: 100 };
    if (filter) body.filter = filter;
    if (cursor) body.start_cursor = cursor;

    const data = await notionRequest<{ results: Array<{ id: string; url?: string; properties: Record<string, unknown> }>; has_more?: boolean; next_cursor?: string | null }>(
      `/databases/${databaseId}/query`,
      { method: 'POST', body: JSON.stringify(body) }
    );

    for (const page of data.results || []) {
      items.push(mapper(page));
    }
    cursor = data.has_more ? data.next_cursor || undefined : undefined;
  } while (cursor);

  return items;
}

export async function listBudgetEntries(): Promise<PanihatiBudgetRow[]> {
  return queryDatabase(PANIHATI_NOTION.databases.budget, mapBudgetRow);
}

export async function listSponsorEntries(): Promise<PanihatiSponsorRow[]> {
  return queryDatabase(PANIHATI_NOTION.databases.sponsors, mapSponsorRow);
}

export async function listTaskEntries(): Promise<PanihatiTaskRow[]> {
  return queryDatabase(PANIHATI_NOTION.databases.tasks, mapTaskRow);
}

function normalizeCategory(raw?: string): string {
  const map: Record<string, string> = {
    logistica: 'Logistica',
    logistic: 'Logistica',
    sonido: 'Sonido y luces',
    luces: 'Sonido y luces',
    ffl: 'Alimentacion FFL',
    alimentacion: 'Alimentacion FFL',
    marketing: 'Marketing',
    permisos: 'Permisos',
    permos: 'Permisos',
    fotografia: 'Fotografia',
    foto: 'Fotografia',
    transporte: 'Transporte',
    otros: 'Otros',
  };
  if (!raw) return 'Otros';
  const key = raw.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
  return map[key] || raw;
}

export async function createBudgetEntry(input: PanihatiBudgetEntryInput): Promise<PanihatiBudgetRow> {
  const properties: Record<string, NotionProp> = {
    Concepto: titleText(input.concepto),
    Tipo: select(input.tipo),
    Categoria: select(normalizeCategory(input.categoria)),
    Estado: select(input.estado || 'Estimado'),
    'Monto estimado USD': numberProp(input.montoEstimado),
    'Monto real USD': numberProp(input.montoReal),
    Proveedor: richText(input.proveedor || ''),
    Notas: richText(input.notas || ''),
    Fecha: dateProp(new Date().toISOString()),
  };

  const page = await notionRequest<{ id: string; url?: string; properties: Record<string, unknown> }>('/pages', {
    method: 'POST',
    body: JSON.stringify({
      parent: { database_id: PANIHATI_NOTION.databases.budget },
      properties,
    }),
  });

  return mapBudgetRow(page);
}

export async function createSponsorEntry(input: PanihatiSponsorEntryInput): Promise<PanihatiSponsorRow> {
  const properties: Record<string, NotionProp> = {
    Nombre: titleText(input.nombre),
    Tipo: select(input.tipo || 'Devoto'),
    Nivel: select(input.nivel || 'Voluntario'),
    'Monto USD': numberProp(input.montoUsd),
    Contacto: richText(input.contacto || ''),
    Telefono: richText(input.telefono || ''),
    Email: richText(input.email || ''),
    Estado: select(input.estado || 'Confirmado'),
    Notas: richText(input.notas || ''),
  };

  const page = await notionRequest<{ id: string; url?: string; properties: Record<string, unknown> }>('/pages', {
    method: 'POST',
    body: JSON.stringify({
      parent: { database_id: PANIHATI_NOTION.databases.sponsors },
      properties,
    }),
  });

  return mapSponsorRow(page);
}

export async function seedBudgetLinesIfEmpty(): Promise<{ seeded: number; skipped: boolean }> {
  const existing = await listBudgetEntries();
  if (existing.length > 0) return { seeded: 0, skipped: true };

  let seeded = 0;
  for (const line of PANIHATI_2026_FACTS.budgetLines) {
    const mid = Math.round((line.min + line.max) / 2);
    await createBudgetEntry({
      concepto: line.concepto,
      tipo: 'Gasto',
      categoria: line.categoria,
      montoEstimado: mid,
      estado: 'Estimado',
      notas: line.notas,
    });
    seeded += 1;
  }
  return { seeded, skipped: false };
}

export async function getPanihatiSummary(seedIfEmpty = true): Promise<PanihatiSummary> {
  if (!panihatiNotionConfigured()) {
    return {
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
      hubUrl: PANIHATI_NOTION.hubUrl,
    };
  }

  if (seedIfEmpty) {
    await seedBudgetLinesIfEmpty().catch(() => undefined);
  }

  const [budgetRows, sponsorRows, taskRows] = await Promise.all([
    listBudgetEntries(),
    listSponsorEntries(),
    listTaskEntries(),
  ]);

  let totalEstimatedExpenses = 0;
  let totalRealExpenses = 0;
  let totalIncome = 0;
  let totalDonations = 0;
  const byCategory: Record<string, number> = {};

  for (const row of budgetRows) {
    const est = row.montoEstimado;
    const real = row.montoReal;
    if (row.tipo === 'Gasto') {
      totalEstimatedExpenses += est;
      totalRealExpenses += real || est;
      byCategory[row.categoria || 'Otros'] = (byCategory[row.categoria || 'Otros'] || 0) + (real || est);
    } else if (row.tipo === 'Ingreso') {
      totalIncome += real || est;
    } else if (row.tipo === 'Donacion' || row.tipo === 'Especie') {
      totalDonations += real || est;
    }
  }

  const collected = totalIncome + totalDonations + sponsorRows.reduce((acc, s) => acc + s.montoUsd, 0);
  const spent = totalRealExpenses;
  const balance = collected - spent;

  const pendingTasks = taskRows.filter((t) => !/listo|done|complet/i.test(t.estado)).length;
  const doneTasks = taskRows.length - pendingTasks;

  return {
    notionConnected: true,
    facts: PANIHATI_2026_FACTS,
    budget: {
      lineCount: budgetRows.length,
      totalEstimatedExpenses,
      totalRealExpenses,
      totalIncome,
      totalDonations,
      balance,
      targetGap: PANIHATI_2026_FACTS.budgetTargetUsd - collected,
      byCategory,
    },
    sponsors: {
      count: sponsorRows.length,
      totalUsd: sponsorRows.reduce((acc, s) => acc + s.montoUsd, 0),
    },
    tasks: { total: taskRows.length, pending: pendingTasks, done: doneTasks },
    hubUrl: PANIHATI_NOTION.hubUrl,
  };
}

function matchesQuery(text: string, q: string): boolean {
  return text.toLowerCase().includes(q.toLowerCase());
}

export async function searchPanihati(query: string): Promise<{
  query: string;
  budget: PanihatiBudgetRow[];
  sponsors: PanihatiSponsorRow[];
  tasks: PanihatiTaskRow[];
}> {
  const q = query.trim();
  if (!q) {
    return { query: q, budget: [], sponsors: [], tasks: [] };
  }

  const [budget, sponsors, tasks] = await Promise.all([
    listBudgetEntries(),
    listSponsorEntries(),
    listTaskEntries(),
  ]);

  const inBudget = budget.filter((row) =>
    [row.concepto, row.categoria, row.proveedor, row.notas, row.tipo, row.estado].some((f) => matchesQuery(f, q))
  );
  const inSponsors = sponsors.filter((row) =>
    [row.nombre, row.contacto, row.email, row.notas, row.nivel, row.tipo].some((f) => matchesQuery(f, q))
  );
  const inTasks = tasks.filter((row) =>
    [row.tarea, row.area, row.responsable, row.notas, row.estado].some((f) => matchesQuery(f, q))
  );

  return { query: q, budget: inBudget, sponsors: inSponsors, tasks: inTasks };
}

export function formatPanihatiSummaryText(summary: PanihatiSummary, lang: 'es' | 'en'): string {
  const f = summary.facts;
  const b = summary.budget;
  const money = (n: number) =>
    new Intl.NumberFormat(lang === 'es' ? 'es-EC' : 'en-US', { style: 'currency', currency: 'USD' }).format(n);

  if (!summary.notionConnected) {
    return lang === 'es'
      ? `Panihati 2026 — ${f.date} · ${f.venue}\nNotion no configurado (NOTION_API_TOKEN). Meta presupuesto: ${money(f.budgetTargetUsd)}.`
      : `Panihati 2026 — ${f.date} · ${f.venue}\nNotion not configured (NOTION_API_TOKEN). Budget target: ${money(f.budgetTargetUsd)}.`;
  }

  const topCats = Object.entries(b.byCategory)
    .sort((a, c) => c[1] - a[1])
    .slice(0, 5)
    .map(([cat, amt]) => `  • ${cat}: ${money(amt)}`)
    .join('\n');

  return lang === 'es'
    ? `${f.name}\n📅 ${f.date} · ${f.time}\n📍 ${f.venue}\n\n💰 Presupuesto meta: ${money(f.budgetTargetUsd)}\n📊 Líneas registradas: ${b.lineCount}\n💸 Gastos estimados: ${money(b.totalEstimatedExpenses)}\n💵 Gastos reales: ${money(b.totalRealExpenses)}\n📥 Ingresos + donaciones: ${money(b.totalIncome + b.totalDonations)}\n🤝 Sponsors (${summary.sponsors.count}): ${money(summary.sponsors.totalUsd)}\n⚖️ Balance: ${money(b.balance)}\n📋 Tareas: ${summary.tasks.pending} pendientes / ${summary.tasks.total} total\n\nTop rubros:\n${topCats || '  (sin gastos aún)'}\n\nNotion: ${summary.hubUrl}`
    : `${f.name}\n📅 ${f.date} · ${f.time}\n📍 ${f.venue}\n\n💰 Budget target: ${money(f.budgetTargetUsd)}\n📊 Registered lines: ${b.lineCount}\n💸 Estimated expenses: ${money(b.totalEstimatedExpenses)}\n💵 Real expenses: ${money(b.totalRealExpenses)}\n📥 Income + donations: ${money(b.totalIncome + b.totalDonations)}\n🤝 Sponsors (${summary.sponsors.count}): ${money(summary.sponsors.totalUsd)}\n⚖️ Balance: ${money(b.balance)}\n📋 Tasks: ${summary.tasks.pending} pending / ${summary.tasks.total} total\n\nTop categories:\n${topCats || '  (no expenses yet)'}\n\nNotion: ${summary.hubUrl}`;
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
          .map((r) => `• ${r.concepto} — ${r.tipo} ${money(r.montoReal || r.montoEstimado)} (${r.estado})`)
          .join('\n')
    );
  }
  if (results.sponsors.length) {
    parts.push(
      (lang === 'es' ? 'Sponsors:' : 'Sponsors:') +
        '\n' +
        results.sponsors.map((r) => `• ${r.nombre} — ${money(r.montoUsd)} (${r.estado})`).join('\n')
    );
  }
  if (results.tasks.length) {
    parts.push(
      (lang === 'es' ? 'Tareas:' : 'Tasks:') +
        '\n' +
        results.tasks.map((r) => `• ${r.tarea} — ${r.responsable || '?'} (${r.estado})`).join('\n')
    );
  }

  if (!parts.length) {
    return lang === 'es'
      ? `Sin resultados para "${results.query}" en Panihati 2026.`
      : `No results for "${results.query}" in Panihati 2026.`;
  }

  return `${lang === 'es' ? 'Resultados' : 'Results'} "${results.query}":\n\n${parts.join('\n\n')}`;
}
