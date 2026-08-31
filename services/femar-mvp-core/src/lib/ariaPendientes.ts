import { parsePendienteIntent } from '@/lib/ariaPendientesParse';
import {
  completePendiente,
  createPendienteWithMirror,
  formatPendientesList,
  listPendientes,
} from '@/lib/ariaPendientesStore';

export type AriaPendientesReply = {
  text: string;
  source: 'pendientes_agent';
  data?: {
    action: 'saved' | 'listed' | 'completed' | 'help';
    pendienteId?: string;
    count?: number;
  };
};

export async function tryAriaPendientesReply(
  prompt: string,
  lang: 'es' | 'en',
  ctx: { userId: string; companyId: string; moduleId?: string }
): Promise<AriaPendientesReply | null> {
  const intent = parsePendienteIntent(prompt);
  if (!intent) return null;

  if (intent.kind === 'help') {
    return {
      text:
        lang === 'es'
          ? 'Agente de pendientes ARIA:\n\n• «guarda esto como pendiente: conectar AG-52 PDF»\n• «queda pendiente revisar Judge Console UI»\n• «cuáles son los pendientes» / «mis pendientes»\n• «marca pendiente 1 como listo»\n\nSe guardan en Google Cloud Firestore (proyecto innerspark-workforce-ai), no en archivos locales. También se reflejan en el backlog RalfIA cuando el MCP está disponible.'
          : 'ARIA pending agent:\n\n• «save this as pending: wire AG-52 PDF»\n• «what are my pending items»\n• «mark pending 1 as done»\n\nStored in Google Cloud Firestore (innerspark-workforce-ai project), not local files. Mirrored to RalfIA backlog when MCP is available.',
      source: 'pendientes_agent',
      data: { action: 'help' },
    };
  }

  if (intent.kind === 'list') {
    const items = await listPendientes({ userId: ctx.userId, status: 'open' });
    return {
      text: formatPendientesList(items, lang),
      source: 'pendientes_agent',
      data: { action: 'listed', count: items.length },
    };
  }

  if (intent.kind === 'save') {
    const saved = await createPendienteWithMirror({
      userId: ctx.userId,
      companyId: ctx.companyId,
      title: intent.title,
      body: intent.body,
      moduleId: ctx.moduleId,
      priority: intent.priority,
      tags: ['inneros', 'aria', ctx.moduleId || 'portal'].filter(Boolean),
    });
    const shortId = saved.id.slice(0, 8);
    return {
      text:
        lang === 'es'
          ? `✅ Guardado como pendiente (#${shortId}):\n«${saved.title}»\n\nPregúntame «cuáles son los pendientes» cuando quieras revisarlos.`
          : `✅ Saved as pending (#${shortId}):\n«${saved.title}»\n\nAsk «what are my pending items» anytime to review.`,
      source: 'pendientes_agent',
      data: { action: 'saved', pendienteId: saved.id },
    };
  }

  if (intent.kind === 'complete') {
    const done = await completePendiente({
      userId: ctx.userId,
      index: intent.index,
      titleMatch: intent.titleMatch,
    });
    if (!done) {
      return {
        text:
          lang === 'es'
            ? 'No encontré ese pendiente abierto. Di «mis pendientes» para ver la lista numerada.'
            : 'Could not find that open pending item. Say «list my pending items» for the numbered list.',
        source: 'pendientes_agent',
        data: { action: 'completed' },
      };
    }
    return {
      text:
        lang === 'es'
          ? `✅ Pendiente cerrado: «${done.title}»`
          : `✅ Pending item closed: «${done.title}»`,
      source: 'pendientes_agent',
      data: { action: 'completed', pendienteId: done.id },
    };
  }

  return null;
}
