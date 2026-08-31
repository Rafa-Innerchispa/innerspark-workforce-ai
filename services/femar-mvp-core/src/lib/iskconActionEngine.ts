import type { ModuleActionDef } from '@/lib/moduleActions';
import { hubById, subActionById, type IskconHub } from '@/lib/iskconDeskHub';
import { PANIHATI_NOTION } from '@/lib/panihatiRegistry';
import {
  formatPanihatiSummaryText,
  getPanihatiSummary,
  listTaskEntries,
} from '@/lib/panihatiStore';
import { dispatchIskconModuleAction } from '@/lib/ralfiaMcpBridge';

async function runAg52DocumentAction(input: {
  action: string;
  prompt: string;
  lang: 'es' | 'en';
  hub: IskconHub;
  subActionId: string;
  artifactName: string;
  fallbackText: string;
}): Promise<ModuleActionResult> {
  const ag52 = await dispatchIskconModuleAction(input.action, input.prompt, false);
  if (ag52.ok === false) {
    return {
      ok: true,
      status: 'PARTIAL',
      actionId: input.hub.actionId,
      hubId: input.hub.id,
      subActionId: input.subActionId,
      text: `${input.fallbackText}\n\nAG-52/MCP no respondió; merge Codex pendiente.`,
    };
  }

  const artifacts: ModuleActionResult['artifacts'] = [];
  const download =
    (typeof ag52.download_url === 'string' && ag52.download_url) ||
    (typeof ag52.public_url === 'string' && ag52.public_url) ||
    (typeof ag52.artifact_url === 'string' && ag52.artifact_url) ||
    '';

  if (download && /^https:\/\//i.test(download)) {
    artifacts.push({ name: input.artifactName, mime: 'application/pdf', url: download });
  }

  if (!artifacts.length) {
    const params = new URLSearchParams({
      title: input.artifactName.replace(/\.pdf$/i, ''),
      body: input.fallbackText.slice(0, 4000),
      filename: input.artifactName,
    });
    artifacts.push({
      name: input.artifactName,
      mime: 'application/pdf',
      url: `/api/ecosystem/iskcon/artifact?${params.toString()}`,
    });
  }

  const summary =
    typeof ag52.summary === 'string'
      ? ag52.summary
      : typeof ag52.text === 'string'
        ? ag52.text
        : input.lang === 'es'
          ? `Documento generado vía AG-52 (${input.action}).`
          : `Document generated via AG-52 (${input.action}).`;

  return {
    ok: true,
    status: download && /^https:\/\//i.test(download) ? 'LIVE' : 'PARTIAL',
    actionId: input.hub.actionId,
    hubId: input.hub.id,
    subActionId: input.subActionId,
    text: summary,
    artifacts: artifacts.length ? artifacts : undefined,
    data: ag52,
  };
}

const ISKCON_DESK_BASE = process.env.ISKCON_DESK_INTERNAL_URL || 'http://127.0.0.1:2027';

export type ModuleActionResult = {
  ok: boolean;
  status: 'LIVE' | 'PARTIAL' | 'NOT_READY';
  actionId: string;
  subActionId?: string;
  hubId?: string;
  text: string;
  artifacts?: Array<{ name: string; mime: string; url: string }>;
  data?: unknown;
  view?: 'list' | 'table' | 'timeline' | 'summary' | 'form';
};

async function fetchIskcon<T = unknown>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${ISKCON_DESK_BASE}${path}`, {
      signal: AbortSignal.timeout(8000),
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function unavailable(lang: 'es' | 'en'): string {
  return lang === 'es'
    ? 'Servicio ISKCON Desk (:2027) no responde. Reintenta en unos minutos.'
    : 'ISKCON Desk service (:2027) unavailable. Retry shortly.';
}

function fmtMoney(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency }).format(amount);
}

export async function executeModuleAction(
  action: ModuleActionDef,
  lang: 'es' | 'en',
  prompt: string,
  options?: { hubId?: string; subActionId?: string }
): Promise<ModuleActionResult> {
  const hubId = options?.hubId || action.id.replace(/_list$/, '').replace(/_generate$/, '');
  const hub = hubById(hubId) || hubById(action.id) || ISKCON_HUBS_FALLBACK(action);
  const subActionId = options?.subActionId;

  if (subActionId && hub) {
    return executeHubSubAction(hub, subActionId, lang, prompt);
  }

  if (hub && !subActionId) {
    const sub = hub.subActions[0];
    if (sub) return executeHubSubAction(hub, sub.id, lang, prompt);
  }

  return executeLegacyAction(action, lang);
}

function ISKCON_HUBS_FALLBACK(action: ModuleActionDef): IskconHub | undefined {
  const map: Record<string, string> = {
    sponsors_list: 'sponsors',
    letter_generate: 'sponsors',
    dossier_generate: 'documents',
    whatsapp_draft: 'community',
    budget_panihati: 'festivals',
    tasks_calendar: 'festivals',
    emergency_plan: 'documents',
  };
  return hubById(map[action.id] || action.id);
}

async function executeHubSubAction(
  hub: IskconHub,
  subActionId: string,
  lang: 'es' | 'en',
  prompt: string
): Promise<ModuleActionResult> {
  const sub = subActionById(hub.id, subActionId);
  if (!sub) {
    return {
      ok: false,
      status: 'NOT_READY',
      actionId: hub.actionId,
      hubId: hub.id,
      subActionId,
      text: lang === 'es' ? 'Sub-acción no encontrada.' : 'Sub-action not found.',
    };
  }

  if (sub.status === 'NOT_READY') {
    return {
      ok: false,
      status: 'NOT_READY',
      actionId: hub.actionId,
      hubId: hub.id,
      subActionId,
      text:
        lang === 'es'
          ? `${sub.titleEs} — en desarrollo (AG-52 / Codex).`
          : `${sub.titleEn} — in development (AG-52 / Codex).`,
    };
  }

  switch (hub.id) {
    case 'sponsors':
      return sponsorsSubAction(subActionId, lang, hub, prompt);
    case 'food_for_life':
      return fflSubAction(subActionId, lang, hub);
    case 'festivals':
      return festivalsSubAction(subActionId, lang, hub);
    case 'yoga_education':
      return yogaSubAction(subActionId, lang, hub);
    case 'donations':
      return donationsSubAction(subActionId, lang, hub);
    case 'community':
      return communitySubAction(subActionId, lang, hub);
    case 'documents':
      return documentsSubAction(subActionId, lang, hub, prompt);
    default:
      return executeLegacyAction({ ...hub, id: hub.actionId, moduleId: 'iskcon-desk', keywords: [] } as ModuleActionDef, lang);
  }
}

async function sponsorsSubAction(
  subId: string,
  lang: 'es' | 'en',
  hub: IskconHub,
  prompt: string
): Promise<ModuleActionResult> {
  const body = await fetchIskcon<{ items?: Array<{ name: string; tier?: string; status?: string; contact?: string }> }>(
    '/api/sponsors'
  );
  if (!body?.items) {
    return { ok: false, status: 'PARTIAL', actionId: hub.actionId, hubId: hub.id, subActionId: subId, text: unavailable(lang) };
  }
  const items = body.items;

  if (subId === 'list') {
    const lines = items.map((s) => `• ${s.name} — ${s.tier || '?'} (${s.status || '?'})`).join('\n');
    return {
      ok: true,
      status: 'LIVE',
      actionId: hub.actionId,
      hubId: hub.id,
      subActionId: subId,
      view: 'list',
      text: lang === 'es' ? `Patrocinadores registrados (${items.length}):\n${lines}` : `Registered sponsors (${items.length}):\n${lines}`,
      data: body,
    };
  }

  if (subId === 'pipeline') {
    const groups = items.reduce<Record<string, typeof items>>((acc, s) => {
      const key = s.status || 'unknown';
      acc[key] = acc[key] || [];
      acc[key].push(s);
      return acc;
    }, {});
    const lines = Object.entries(groups)
      .map(([status, group]) => `${status.toUpperCase()}:\n${group.map((s) => `  • ${s.name} (${s.tier})`).join('\n')}`)
      .join('\n\n');
    return {
      ok: true,
      status: 'LIVE',
      actionId: hub.actionId,
      hubId: hub.id,
      subActionId: subId,
      view: 'table',
      text: lang === 'es' ? `Pipeline de patrocinio:\n\n${lines}` : `Sponsor pipeline:\n\n${lines}`,
      data: { groups },
    };
  }

  if (subId === 'register') {
    return {
      ok: true,
      status: 'LIVE',
      actionId: hub.actionId,
      hubId: hub.id,
      subActionId: subId,
      view: 'form',
      text:
        lang === 'es'
          ? 'Completa el formulario para registrar el patrocinador en almacenamiento local Panihati.'
          : 'Complete the form to register the sponsor in local Panihati storage.',
    };
  }

  if (subId === 'letter') {
    return runAg52DocumentAction({
      action: 'letter',
      prompt: prompt || 'carta patrocinador ISKCON Guayaquil Panihati 2026',
      lang,
      hub,
      subActionId: subId,
      artifactName: 'carta-patrocinador.pdf',
      fallbackText:
        lang === 'es'
          ? 'Carta patrocinador (borrador local):\n\nEstimado patrocinador,\n\nAgradecemos su apoyo a ISKCON Guayaquil.'
          : 'Sponsor letter (local draft):\n\nDear sponsor,\n\nThank you for supporting ISKCON Guayaquil.',
    });
  }

  if (subId === 'dossier') {
    return runAg52DocumentAction({
      action: 'dossier',
      prompt: prompt || 'dossier patrocinio Panihati 2026 Food for Life',
      lang,
      hub,
      subActionId: subId,
      artifactName: 'dossier-patrocinio.pdf',
      fallbackText:
        lang === 'es'
          ? 'Dossier: misión, impacto FFL, tiers patrocinio, calendario festivales.'
          : 'Dossier: mission, FFL impact, sponsor tiers, festival calendar.',
    });
  }

  if (subId === 'whatsapp') {
    return runAg52DocumentAction({
      action: 'whatsapp_draft',
      prompt: prompt || 'borrador WhatsApp patrocinadores Panihati avances programa',
      lang,
      hub,
      subActionId: subId,
      artifactName: 'whatsapp-borrador.txt',
      fallbackText:
        lang === 'es'
          ? 'Borrador WhatsApp:\n"Hare Krishna 🙏 Queridos patrocinadores: avances del programa — ISKCON Guayaquil"'
          : 'WhatsApp draft:\n"Hare Krishna 🙏 Dear sponsors: program updates — ISKCON Guayaquil"',
    });
  }

  return sponsorsSubAction('list', lang, hub, prompt);
}

async function fflSubAction(subId: string, lang: 'es' | 'en', hub: IskconHub): Promise<ModuleActionResult> {
  if (subId === 'summary') {
    const body = await fetchIskcon<{ summary?: Record<string, unknown> }>('/api/ffl/summary');
    const s = body?.summary as Record<string, number | string> | undefined;
    if (!s) return { ok: false, status: 'PARTIAL', actionId: hub.actionId, hubId: hub.id, subActionId: subId, text: unavailable(lang) };
    const text =
      lang === 'es'
        ? `Food for Life — semana ${s.week_start} → ${s.week_end}\n\n🍛 Comidas servidas: ${s.meals_served}\n👥 Personas alcanzadas: ${s.people_reached}\n📍 Puntos de entrega: ${s.locations}\n⏱ Horas voluntariado: ${s.volunteer_hours}\n💵 Donaciones semana: ${fmtMoney(Number(s.donations_week || 0))}`
        : `Food for Life — week ${s.week_start} → ${s.week_end}\n\n🍛 Meals served: ${s.meals_served}\n👥 People reached: ${s.people_reached}\n📍 Delivery points: ${s.locations}\n⏱ Volunteer hours: ${s.volunteer_hours}\n💵 Weekly donations: ${fmtMoney(Number(s.donations_week || 0))}`;
    return { ok: true, status: 'LIVE', actionId: hub.actionId, hubId: hub.id, subActionId: subId, view: 'summary', text, data: s };
  }

  if (subId === 'reasons') {
    const body = await fetchIskcon<{ items?: Array<{ label_es: string; label_en: string; meals_week: number; description_es: string }> }>(
      '/api/ffl/reasons'
    );
    if (!body?.items) return { ok: false, status: 'PARTIAL', actionId: hub.actionId, hubId: hub.id, subActionId: subId, text: unavailable(lang) };
    const lines = body.items
      .map((r) => `• ${lang === 'es' ? r.label_es : r.label_en}: ${r.meals_week} comidas/semana\n  ${lang === 'es' ? r.description_es : r.description_es}`)
      .join('\n\n');
    return { ok: true, status: 'LIVE', actionId: hub.actionId, hubId: hub.id, subActionId: subId, view: 'table', text: lines, data: body };
  }

  if (subId === 'donors') {
    const body = await fetchIskcon<{ items?: Array<{ name: string; type: string; amount?: number; purpose: string; status: string; description?: string }> }>(
      '/api/ffl/donors'
    );
    if (!body?.items) return { ok: false, status: 'PARTIAL', actionId: hub.actionId, hubId: hub.id, subActionId: subId, text: unavailable(lang) };
    const lines = body.items
      .map((d) => {
        const amt = d.amount ? fmtMoney(d.amount) : d.description || 'seva';
        return `• ${d.name} — ${d.type} — ${amt}\n  ${d.purpose} (${d.status})`;
      })
      .join('\n\n');
    return {
      ok: true,
      status: 'LIVE',
      actionId: hub.actionId,
      hubId: hub.id,
      subActionId: subId,
      view: 'list',
      text: lang === 'es' ? `Donantes y ayudantes FFL:\n\n${lines}` : `FFL donors & helpers:\n\n${lines}`,
      data: body,
    };
  }

  if (subId === 'timeline') {
    const body = await fetchIskcon<{ items?: Array<{ date: string; meals: number; people: number; location: string; category: string; volunteers: string[] }> }>(
      '/api/ffl/timeline'
    );
    if (!body?.items) return { ok: false, status: 'PARTIAL', actionId: hub.actionId, hubId: hub.id, subActionId: subId, text: unavailable(lang) };
    const lines = body.items
      .map((t) => `📅 ${t.date} — ${t.location}\n   ${t.meals} comidas · ${t.people} personas · ${t.category}\n   Voluntarios: ${t.volunteers.join(', ')}`)
      .join('\n\n');
    return { ok: true, status: 'LIVE', actionId: hub.actionId, hubId: hub.id, subActionId: subId, view: 'timeline', text: lines, data: body };
  }

  if (subId === 'schedules') {
    const body = await fetchIskcon<{ items?: Array<{ day: string; day_en: string; time: string; activity_es: string; activity_en: string; lead: string }> }>(
      '/api/ffl/schedules'
    );
    if (!body?.items) return { ok: false, status: 'PARTIAL', actionId: hub.actionId, hubId: hub.id, subActionId: subId, text: unavailable(lang) };
    const lines = body.items
      .map((s) => `• ${lang === 'es' ? s.day : s.day_en} ${s.time}\n  ${lang === 'es' ? s.activity_es : s.activity_en}\n  Responsable: ${s.lead}`)
      .join('\n\n');
    return {
      ok: true,
      status: 'LIVE',
      actionId: hub.actionId,
      hubId: hub.id,
      subActionId: subId,
      view: 'table',
      text: lang === 'es' ? `Horarios Food for Life:\n\n${lines}` : `Food for Life schedule:\n\n${lines}`,
      data: body,
    };
  }

  if (subId === 'log_meal') {
    return {
      ok: true,
      status: 'PARTIAL',
      actionId: hub.actionId,
      hubId: hub.id,
      subActionId: subId,
      text:
        lang === 'es'
          ? 'Registro de comidas — PARTIAL.\n\nDi a ARIA: "registrar 120 platos hoy en Centro Guayaquil" cuando AG-52 FFL log esté conectado.\nDatos demo disponibles en Resumen e Historial.'
          : 'Meal logging — PARTIAL.\n\nTell ARIA: "log 120 meals today at Downtown" when AG-52 FFL log is wired.\nDemo data available in Summary and Timeline.',
    };
  }

  return fflSubAction('summary', lang, hub);
}

async function festivalsSubAction(subId: string, lang: 'es' | 'en', hub: IskconHub): Promise<ModuleActionResult> {
  type FestivalEvent = {
    id: string;
    name: string;
    date: string;
    status: string;
    year?: number;
    devotees_registered: number;
    schedule_canonical?: string;
    schedule_note_es?: string;
    schedule_note_en?: string;
    sections?: Record<string, unknown>;
    milestones?: Array<{ date: string; label_es: string; label_en: string }>;
  };

  const body = await fetchIskcon<{ items?: FestivalEvent[] }>('/api/festivals');
  if (!body?.items) return { ok: false, status: 'PARTIAL', actionId: hub.actionId, hubId: hub.id, subActionId: subId, text: unavailable(lang) };

  const formatPanihatiEvent = (evt: FestivalEvent): ModuleActionResult => {
    const milestones = (evt.milestones || [])
      .map((m) => `  • ${m.date} — ${lang === 'es' ? m.label_es : m.label_en}`)
      .join('\n');
    const scheduleNote =
      evt.schedule_canonical === 'NEEDS_CANONICAL_CONFIRMATION'
        ? `\n\n⚠ ${lang === 'es' ? evt.schedule_note_es : evt.schedule_note_en}`
        : '';
    return {
      ok: true,
      status: 'LIVE',
      actionId: hub.actionId,
      hubId: hub.id,
      subActionId: subId,
      text:
        lang === 'es'
          ? `${evt.name} (${evt.year || '?'}) — ${evt.date}\nEstado: ${evt.status}\nDevotos: ${evt.devotees_registered}${scheduleNote}\n\nHitos:\n${milestones}`
          : `${evt.name} (${evt.year || '?'}) — ${evt.date}\nStatus: ${evt.status}\nDevotees: ${evt.devotees_registered}${scheduleNote}\n\nMilestones:\n${milestones}`,
      data: evt,
    };
  };

  const formatExpediente = (evt: FestivalEvent): ModuleActionResult => {
    const sections = evt.sections || {};
    const lines = Object.entries(sections).map(([key, val]) => {
      if (val && typeof val === 'object' && 'status' in (val as object)) {
        const row = val as { status?: string; source?: string };
        return `• ${key}: ${row.status || 'LIVE'}${row.source ? ` (${row.source})` : ''}`;
      }
      if (val && typeof val === 'object' && ('es' in (val as object) || 'en' in (val as object))) {
        const row = val as { es?: string; en?: string };
        return `• ${key}: ${lang === 'es' ? row.es : row.en}`;
      }
      return `• ${key}: ${JSON.stringify(val).slice(0, 80)}`;
    });
    return {
      ok: true,
      status: 'LIVE',
      actionId: hub.actionId,
      hubId: hub.id,
      subActionId: subId,
      view: 'summary',
      text:
        lang === 'es'
          ? `Expediente ${evt.name}\n\nSecciones:\n${lines.join('\n')}`
          : `Dossier ${evt.name}\n\nSections:\n${lines.join('\n')}`,
      data: evt,
    };
  };

  if (subId === 'all') {
    const lines = body.items
      .map((e) => `• ${e.name} — ${e.date} (${e.status})\n  Devotos: ${e.devotees_registered}`)
      .join('\n\n');
    return {
      ok: true,
      status: 'LIVE',
      actionId: hub.actionId,
      hubId: hub.id,
      subActionId: subId,
      view: 'list',
      text: lang === 'es' ? `Festivales y eventos (${body.items.length}):\n\n${lines}` : `Festivals & events (${body.items.length}):\n\n${lines}`,
      data: body,
    };
  }

  if (subId === 'panihati_2025') {
    const evt = body.items.find((e) => e.id === 'evt-panihati-2025');
    if (!evt) return { ok: false, status: 'PARTIAL', actionId: hub.actionId, hubId: hub.id, subActionId: subId, text: 'Panihati 2025 not found.' };
    return formatPanihatiEvent(evt);
  }

  if (subId === 'panihati_2026' || subId === 'panihati') {
    const evt = body.items.find((e) => e.id === 'evt-panihati-2026');
    if (!evt) return { ok: false, status: 'PARTIAL', actionId: hub.actionId, hubId: hub.id, subActionId: subId, text: 'Panihati 2026 not found.' };
    return formatPanihatiEvent(evt);
  }

  if (subId === 'expediente') {
    const evt = body.items.find((e) => e.id === 'evt-panihati-2026');
    if (!evt) return { ok: false, status: 'PARTIAL', actionId: hub.actionId, hubId: hub.id, subActionId: subId, text: unavailable(lang) };
    return formatExpediente(evt);
  }

  if (subId === 'emergency') {
    const evt = body.items.find((e) => e.id === 'evt-panihati-2026');
    const scenario = evt
      ? lang === 'es'
        ? `Plan de emergencia ${evt.name} — ${evt.date}`
        : `Emergency plan ${evt.name} — ${evt.date}`
      : 'Panihati 2026 emergency plan';
    return runAg52DocumentAction({
      action: 'emergency_plan',
      prompt: scenario,
      lang,
      hub,
      subActionId: subId,
      artifactName: 'plan-emergencia-panihati-2026.pdf',
      fallbackText:
        lang === 'es'
          ? `${scenario}\n\n1. Activar equipo de respuesta\n2. Evacuación por zonas\n3. Contacto: Coordinación ISKCON\n4. Primeros auxilios y punto de reunión\n5. Comunicación a devotos y autoridades\n\n⚠ Horario canónico 2026: NEEDS_CANONICAL_CONFIRMATION`
          : `${scenario}\n\n1. Activate response team\n2. Zone evacuation\n3. Contact: ISKCON coordination\n4. First aid and rally point\n5. Devotee and authority comms\n\n⚠ 2026 schedule: NEEDS_CANONICAL_CONFIRMATION`,
    });
  }

  if (subId === 'budget') {
    try {
      const summary = await getPanihatiSummary();
      return {
        ok: true,
        status: 'LIVE',
        actionId: hub.actionId,
        hubId: hub.id,
        subActionId: subId,
        view: 'summary',
        text: formatPanihatiSummaryText(summary, lang),
        data: summary,
        artifacts: [{ name: 'Datos locales Panihati', mime: 'application/json', url: '/api/ecosystem/panihati/entries?kind=summary' }],
      };
    } catch {
      return { ok: false, status: 'PARTIAL', actionId: hub.actionId, hubId: hub.id, subActionId: subId, text: unavailable(lang) };
    }
  }

  if (subId === 'tasks') {
    try {
      const tasks = await listTaskEntries();
      const lines = tasks
        .slice(0, 15)
        .map((t) => `• ${t.tarea}${t.responsable ? ` — ${t.responsable}` : ''} (${t.estado || '?'})`)
        .join('\n');
      return {
        ok: true,
        status: 'LIVE',
        actionId: hub.actionId,
        hubId: hub.id,
        subActionId: subId,
        view: 'table',
        text:
          lang === 'es'
            ? `Tareas Panihati 2026 (${tasks.length}):\n\n${lines || '(sin tareas)'}`
            : `Panihati 2026 tasks (${tasks.length}):\n\n${lines || '(no tasks)'}`,
        data: { items: tasks },
      };
    } catch {
      return { ok: false, status: 'PARTIAL', actionId: hub.actionId, hubId: hub.id, subActionId: subId, text: unavailable(lang) };
    }
  }

  if (subId === 'search') {
    return {
      ok: true,
      status: 'LIVE',
      actionId: hub.actionId,
      hubId: hub.id,
      subActionId: subId,
      text:
        lang === 'es'
          ? 'Buscar en Panihati 2026.\n\nDi a ARIA, por ejemplo:\n• "buscar sonido panihati"\n• "buscar carpas"\n• "buscar René"\n\nTambién puedes escribir en ARIA cualquier palabra clave del presupuesto, sponsors o tareas.'
          : 'Search Panihati 2026.\n\nTell ARIA, for example:\n• "search sound panihati"\n• "search tents"\n• "search René"\n\nYou can also ask ARIA any budget, sponsor, or task keyword.',
    };
  }

  if (subId === 'register') {
    return {
      ok: true,
      status: 'LIVE',
      actionId: hub.actionId,
      hubId: hub.id,
      subActionId: subId,
      view: 'form',
      text:
        lang === 'es'
          ? 'Formulario de registro Panihati 2026 — gastos, cotizaciones, ingresos y documentos (almacenamiento local).'
          : 'Panihati 2026 registration form — expenses, quotes, income, and documents (local storage).',
    };
  }

  if (subId === 'notion') {
    return {
      ok: true,
      status: 'PARTIAL',
      actionId: hub.actionId,
      hubId: hub.id,
      subActionId: subId,
      text:
        lang === 'es'
          ? `Notion ya no es la fuente principal.\n\nLos datos viven en el servidor local ISKCON Desk (:2027).\nReferencia histórica (solo lectura opcional): ${PANIHATI_NOTION.hubUrl}`
          : `Notion is no longer the primary source.\n\nData lives on the local ISKCON Desk server (:2027).\nHistorical reference (optional read-only): ${PANIHATI_NOTION.hubUrl}`,
    };
  }

  return festivalsSubAction('all', lang, hub);
}

async function yogaSubAction(subId: string, lang: 'es' | 'en', hub: IskconHub): Promise<ModuleActionResult> {
  const body = await fetchIskcon<{ items?: Array<{ name_es: string; name_en: string; schedule: string; instructor: string; location: string; capacity: number; enrolled: number; status: string }> }>(
    '/api/yoga/classes'
  );
  if (!body?.items) return { ok: false, status: 'PARTIAL', actionId: hub.actionId, hubId: hub.id, subActionId: subId, text: unavailable(lang) };

  const fmtClass = (c: (typeof body.items)[0]) =>
    `• ${lang === 'es' ? c.name_es : c.name_en}\n  ${c.schedule} · ${c.instructor}\n  ${c.location} · ${c.enrolled}/${c.capacity} inscritos`;

  if (subId === 'classes' || subId === 'schedule') {
    const lines = body.items.map(fmtClass).join('\n\n');
    return {
      ok: true,
      status: 'LIVE',
      actionId: hub.actionId,
      hubId: hub.id,
      subActionId: subId,
      view: 'table',
      text: lang === 'es' ? `Clases y talleres (${body.items.length}):\n\n${lines}` : `Classes & workshops (${body.items.length}):\n\n${lines}`,
      data: body,
    };
  }

  if (subId === 'enroll') {
    const lines = body.items.map((c) => `• ${lang === 'es' ? c.name_es : c.name_en}: ${c.enrolled}/${c.capacity} (${c.status})`).join('\n');
    return { ok: true, status: 'PARTIAL', actionId: hub.actionId, hubId: hub.id, subActionId: subId, text: lines, data: body };
  }

  if (subId === 'campaign') {
    return {
      ok: true,
      status: 'PARTIAL',
      actionId: hub.actionId,
      hubId: hub.id,
      subActionId: subId,
      text:
        lang === 'es'
          ? 'Campaña WhatsApp educación:\n"Hare Krishna 🙏 Clases de yoga y estudio de Gita esta semana. Consulta horarios en el templo. — ISKCON Guayaquil"'
          : 'Education WhatsApp campaign:\n"Hare Krishna 🙏 Yoga and Gita study classes this week. Check schedules at the temple. — ISKCON Guayaquil"',
    };
  }

  return yogaSubAction('classes', lang, hub);
}

async function donationsSubAction(subId: string, lang: 'es' | 'en', hub: IskconHub): Promise<ModuleActionResult> {
  const body = await fetchIskcon<{ items?: Array<{ label_es: string; label_en: string; amount: number; currency: string; status: string; campaign: string }>; totals?: { confirmed: number; pending: number } }>(
    '/api/donations'
  );
  if (!body?.items) return { ok: false, status: 'PARTIAL', actionId: hub.actionId, hubId: hub.id, subActionId: subId, text: unavailable(lang) };

  if (subId === 'ledger') {
    const lines = body.items
      .map((d) => `• ${lang === 'es' ? d.label_es : d.label_en}: ${fmtMoney(d.amount, d.currency)} — ${d.status}`)
      .join('\n');
    const totals = body.totals;
    return {
      ok: true,
      status: 'LIVE',
      actionId: hub.actionId,
      hubId: hub.id,
      subActionId: subId,
      text:
        lang === 'es'
          ? `Libro de donaciones:\n\n${lines}\n\n✅ Confirmado: ${fmtMoney(totals?.confirmed || 0)}\n⏳ Pendiente: ${fmtMoney(totals?.pending || 0)}`
          : `Donation ledger:\n\n${lines}\n\n✅ Confirmed: ${fmtMoney(totals?.confirmed || 0)}\n⏳ Pending: ${fmtMoney(totals?.pending || 0)}`,
      data: body,
    };
  }

  if (subId === 'campaigns') {
    const groups = body.items.reduce<Record<string, number>>((acc, d) => {
      acc[d.campaign] = (acc[d.campaign] || 0) + d.amount;
      return acc;
    }, {});
    const lines = Object.entries(groups).map(([k, v]) => `• ${k}: ${fmtMoney(v)}`).join('\n');
    return { ok: true, status: 'LIVE', actionId: hub.actionId, hubId: hub.id, subActionId: subId, text: lines, data: groups };
  }

  if (subId === 'register') {
    return {
      ok: true,
      status: 'PARTIAL',
      actionId: hub.actionId,
      hubId: hub.id,
      subActionId: subId,
      text: lang === 'es' ? 'Registro de donación — PARTIAL. Integración Contifico pendiente.' : 'Donation registration — PARTIAL. Contifico integration pending.',
    };
  }

  return donationsSubAction('ledger', lang, hub);
}

async function communitySubAction(subId: string, lang: 'es' | 'en', hub: IskconHub): Promise<ModuleActionResult> {
  if (subId === 'contacts') {
    return {
      ok: true,
      status: 'PARTIAL',
      actionId: hub.actionId,
      hubId: hub.id,
      subActionId: subId,
      text:
        lang === 'es'
          ? 'Directorio (seed):\n• Coordinación — coordinacion@iskconguayaquil.org\n• Cocina FFL — cocina@iskconguayaquil.org\n• WhatsApp devotos — import preview disponible'
          : 'Directory (seed):\n• Coordination — coordinacion@iskconguayaquil.org\n• FFL kitchen — cocina@iskconguayaquil.org\n• Devotee WhatsApp — import preview available',
    };
  }
  if (subId === 'whatsapp') {
    return {
      ok: true,
      status: 'PARTIAL',
      actionId: hub.actionId,
      hubId: hub.id,
      subActionId: subId,
      text:
        lang === 'es'
          ? 'Borrador WhatsApp devotos:\n"Hare Krishna 🙏 Recordatorio de programas esta semana. Confirmen seva. — ISKCON Guayaquil"'
          : 'Devotee WhatsApp draft:\n"Hare Krishna 🙏 Weekly program reminder. Please confirm seva. — ISKCON Guayaquil"',
    };
  }
  if (subId === 'import') {
    const body = await fetchIskcon<{ inbox_count?: number; fixture_sample_ready?: boolean }>('/api/imports/whatsapp/status');
    if (!body) return { ok: false, status: 'PARTIAL', actionId: hub.actionId, hubId: hub.id, subActionId: subId, text: unavailable(lang) };
    return {
      ok: true,
      status: 'PARTIAL',
      actionId: hub.actionId,
      hubId: hub.id,
      subActionId: subId,
      text:
        lang === 'es'
          ? `Import WhatsApp — preview\nInbox: ${body.inbox_count} archivos\nFixture demo: ${body.fixture_sample_ready ? 'listo' : 'no'}`
          : `WhatsApp import — preview\nInbox: ${body.inbox_count} files\nFixture demo: ${body.fixture_sample_ready ? 'ready' : 'no'}`,
      data: body,
    };
  }
  return communitySubAction('contacts', lang, hub);
}

async function documentsSubAction(
  subId: string,
  lang: 'es' | 'en',
  hub: IskconHub,
  prompt: string
): Promise<ModuleActionResult> {
  const templates =
    lang === 'es'
      ? '• Carta patrocinador v1\n• Dossier festival\n• Checklist emergencia templo'
      : '• Sponsor letter v1\n• Festival dossier\n• Temple emergency checklist';

  if (subId === 'templates') {
    return { ok: true, status: 'PARTIAL', actionId: hub.actionId, hubId: hub.id, subActionId: subId, text: templates };
  }
  if (subId === 'dossier') {
    return runAg52DocumentAction({
      action: 'dossier',
      prompt: prompt || 'dossier documentos templo ISKCON',
      lang,
      hub,
      subActionId: subId,
      artifactName: 'dossier-documentos.pdf',
      fallbackText:
        lang === 'es'
          ? 'Dossier: misión, impacto FFL, tiers patrocinio.'
          : 'Dossier: mission, FFL impact, sponsor tiers.',
    });
  }
  if (subId === 'emergency') {
    return runAg52DocumentAction({
      action: 'emergency_plan',
      prompt: prompt || 'plan emergencia templo ISKCON Guayaquil',
      lang,
      hub,
      subActionId: subId,
      artifactName: 'plan-emergencia.pdf',
      fallbackText:
        lang === 'es'
          ? 'Plan de emergencia (borrador):\n1. Activar equipo\n2. Evacuación\n3. Contacto coordinación\n4. Primeros auxilios\n5. Punto reunión exterior'
          : 'Emergency plan (draft):\n1. Activate team\n2. Evacuation\n3. Coordination\n4. First aid\n5. Rally point',
    });
  }
  return documentsSubAction('templates', lang, hub, prompt);
}

async function executeLegacyAction(action: ModuleActionDef, lang: 'es' | 'en'): Promise<ModuleActionResult> {
  const hub = hubById(action.id) || ISKCON_HUBS_FALLBACK(action);
  if (hub) return executeHubSubAction(hub, hub.subActions[0]?.id || 'list', lang, '');
  return {
    ok: false,
    status: 'NOT_READY',
    actionId: action.id,
    text: lang === 'es' ? `${action.titleEs} — NOT_READY.` : `${action.titleEn} — NOT_READY.`,
  };
}
