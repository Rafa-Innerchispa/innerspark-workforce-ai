import { parsePanihatiIntent } from '@/lib/panihatiParse';
import { PANIHATI_2026_FACTS } from '@/lib/panihatiRegistry';
import {
  createBudgetEntry,
  createSponsorEntry,
  formatPanihatiSearchText,
  formatPanihatiSummaryText,
  getPanihatiSummary,
  listTaskEntries,
  searchPanihati,
} from '@/lib/panihatiStore';

export type PanihatiAriaReply = {
  text: string;
  source: 'panihati_local';
  data?: unknown;
};

export async function tryPanihatiAriaReply(prompt: string, lang: 'es' | 'en'): Promise<PanihatiAriaReply | null> {
  const intent = parsePanihatiIntent(prompt);
  if (!intent) return null;

  try {
    if (intent.kind === 'summary') {
      const summary = await getPanihatiSummary();
      return { source: 'panihati_local', text: formatPanihatiSummaryText(summary, lang), data: summary };
    }

    if (intent.kind === 'search') {
      const results = await searchPanihati(intent.query);
      return { source: 'panihati_local', text: formatPanihatiSearchText(results, lang), data: results };
    }

    if (intent.kind === 'budget') {
      const row = await createBudgetEntry({ ...intent.entry, source: 'aria' });
      if (!row) {
        return {
          source: 'panihati_local',
          text: lang === 'es' ? 'No pude guardar el registro local.' : 'Could not save local entry.',
        };
      }
      const money = new Intl.NumberFormat(lang === 'es' ? 'es-EC' : 'en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(row.monto_real || row.monto_estimado || 0);
      return {
        source: 'panihati_local',
        text:
          lang === 'es'
            ? `✅ Guardado localmente (Panihati 2026)\n• ${row.concepto}\n• ${row.tipo} · ${money}\n• Estado: ${row.estado}${row.proveedor ? `\n• Proveedor: ${row.proveedor}` : ''}`
            : `✅ Saved locally (Panihati 2026)\n• ${row.concepto}\n• ${row.tipo} · ${money}\n• Status: ${row.estado}${row.proveedor ? `\n• Vendor: ${row.proveedor}` : ''}`,
        data: row,
      };
    }

    if (intent.kind === 'sponsor') {
      const row = await createSponsorEntry({ ...intent.entry, source: 'aria' });
      if (!row) {
        return {
          source: 'panihati_local',
          text: lang === 'es' ? 'No pude guardar el patrocinador.' : 'Could not save sponsor.',
        };
      }
      return {
        source: 'panihati_local',
        text:
          lang === 'es'
            ? `✅ Patrocinador guardado localmente: ${row.nombre}${row.monto_usd ? ` — $${row.monto_usd}` : ''}`
            : `✅ Sponsor saved locally: ${row.nombre}${row.monto_usd ? ` — $${row.monto_usd}` : ''}`,
        data: row,
      };
    }

    if (intent.kind === 'tasks') {
      const tasks = await listTaskEntries();
      const lines = tasks
        .slice(0, 12)
        .map((t) => `• ${t.tarea}${t.responsable ? ` — ${t.responsable}` : ''} (${t.estado || '?'})`)
        .join('\n');
      return {
        source: 'panihati_local',
        text:
          lang === 'es'
            ? `Tareas Panihati 2026 (${tasks.length}):\n\n${lines || '(sin tareas)'}`
            : `Panihati 2026 tasks (${tasks.length}):\n\n${lines || '(no tasks)'}`,
        data: tasks,
      };
    }

    const f = PANIHATI_2026_FACTS;
    return {
      source: 'panihati_local',
      text:
        lang === 'es'
          ? `${f.name}\n📅 ${f.date} · ${f.time}\n📍 ${f.venue}\n👥 Meta asistentes: ${f.attendeesTarget}\n🍛 FFL: ${f.fflMealsTarget}+ platos\n💰 Meta presupuesto: $${f.budgetTargetUsd}\n📧 ${f.email}\n\nCuentas:\n${f.donationAccounts.map((a) => `• ${a}`).join('\n')}`
          : `${f.name}\n📅 ${f.date} · ${f.time}\n📍 ${f.venue}\n👥 Attendee target: ${f.attendeesTarget}\n🍛 FFL: ${f.fflMealsTarget}+ meals\n💰 Budget target: $${f.budgetTargetUsd}\n📧 ${f.email}\n\nAccounts:\n${f.donationAccounts.map((a) => `• ${a}`).join('\n')}`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      source: 'panihati_local',
      text: lang === 'es' ? `Error Panihati local: ${msg}` : `Panihati local error: ${msg}`,
    };
  }
}
