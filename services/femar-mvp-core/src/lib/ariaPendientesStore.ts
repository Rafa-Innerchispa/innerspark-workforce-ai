import { db } from '@/lib/firebase';

/** User pendientes live in Google Cloud Firestore (project innerspark-workforce-ai), not on local disk. */

export type PendienteStatus = 'open' | 'done' | 'cancelled';

export type PendienteRecord = {
  id: string;
  userId: string;
  companyId: string;
  moduleId?: string;
  title: string;
  body: string;
  status: PendienteStatus;
  priority: 'normal' | 'high';
  source: 'aria' | 'api';
  tags: string[];
  createdAt: string;
  updatedAt: string;
  doneAt?: string;
};

const COLLECTION = 'inneros_pendientes';

function docToRecord(id: string, data: FirebaseFirestore.DocumentData): PendienteRecord {
  return {
    id,
    userId: String(data.userId || ''),
    companyId: String(data.companyId || ''),
    moduleId: data.moduleId ? String(data.moduleId) : undefined,
    title: String(data.title || 'Pendiente'),
    body: String(data.body || ''),
    status: (data.status as PendienteStatus) || 'open',
    priority: data.priority === 'high' ? 'high' : 'normal',
    source: data.source === 'api' ? 'api' : 'aria',
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    createdAt: String(data.createdAt || ''),
    updatedAt: String(data.updatedAt || ''),
    doneAt: data.doneAt ? String(data.doneAt) : undefined,
  };
}

export async function listPendientes(input: {
  userId: string;
  status?: PendienteStatus | 'all';
  limit?: number;
}): Promise<PendienteRecord[]> {
  const limit = input.limit ?? 30;
  const snap = await db
    .collection(COLLECTION)
    .where('userId', '==', input.userId)
    .orderBy('updatedAt', 'desc')
    .limit(80)
    .get();

  const statusFilter = input.status && input.status !== 'all' ? input.status : null;
  return snap.docs
    .map((doc) => docToRecord(doc.id, doc.data()))
    .filter((item) => (statusFilter ? item.status === statusFilter : item.status === 'open'))
    .slice(0, limit);
}

export async function createPendiente(input: {
  userId: string;
  companyId: string;
  title: string;
  body?: string;
  moduleId?: string;
  priority?: 'normal' | 'high';
  tags?: string[];
}): Promise<PendienteRecord> {
  const now = new Date().toISOString();
  const title = input.title.trim().slice(0, 160) || 'Pendiente sin título';
  const body = (input.body || input.title).trim().slice(0, 4000);
  const ref = db.collection(COLLECTION).doc();
  const payload = {
    userId: input.userId,
    companyId: input.companyId,
    moduleId: input.moduleId || null,
    title,
    body,
    status: 'open' as PendienteStatus,
    priority: input.priority === 'high' ? 'high' : 'normal',
    source: 'aria' as const,
    tags: input.tags || ['inneros', 'aria'],
    createdAt: now,
    updatedAt: now,
  };
  await ref.set(payload);
  const record = docToRecord(ref.id, payload);
  return record;
}

export async function createPendienteWithMirror(input: Parameters<typeof createPendiente>[0]): Promise<PendienteRecord> {
  const record = await createPendiente(input);
  const { mirrorPendienteToDevBacklog } = await import('@/lib/ralfiaMcpBridge');
  void mirrorPendienteToDevBacklog({
    title: record.title,
    body: record.body,
    moduleId: input.moduleId,
    pendienteId: record.id,
  });
  return record;
}

export async function completePendiente(input: {
  userId: string;
  pendienteId?: string;
  index?: number;
  titleMatch?: string;
}): Promise<PendienteRecord | null> {
  const open = await listPendientes({ userId: input.userId, status: 'open', limit: 50 });
  if (open.length === 0) return null;

  let target: PendienteRecord | undefined;
  if (input.pendienteId) {
    target = open.find((p) => p.id === input.pendienteId || p.id.startsWith(input.pendienteId!));
  } else if (typeof input.index === 'number' && input.index >= 1 && input.index <= open.length) {
    target = open[input.index - 1];
  } else if (input.titleMatch) {
    const q = input.titleMatch.toLowerCase();
    target = open.find((p) => p.title.toLowerCase().includes(q) || p.body.toLowerCase().includes(q));
  }

  if (!target) return null;

  const now = new Date().toISOString();
  await db.collection(COLLECTION).doc(target.id).set(
    { status: 'done', updatedAt: now, doneAt: now },
    { merge: true }
  );
  return { ...target, status: 'done', updatedAt: now, doneAt: now };
}

export function formatPendientesList(items: PendienteRecord[], lang: 'es' | 'en'): string {
  if (items.length === 0) {
    return lang === 'es'
      ? 'No tienes pendientes abiertos. Di «guarda esto como pendiente: …» para anotar uno.'
      : 'You have no open items. Say «save this as pending: …» to add one.';
  }

  const header =
    lang === 'es'
      ? `Tus pendientes (${items.length}):\n`
      : `Your pending items (${items.length}):\n`;

  const lines = items.map((item, i) => {
    const pri = item.priority === 'high' ? ' ⚡' : '';
    const mod = item.moduleId ? ` · ${item.moduleId}` : '';
    const snippet = item.body && item.body !== item.title ? `\n   ${item.body.slice(0, 120)}` : '';
    return `${i + 1}. ${item.title}${pri}${mod}${snippet}`;
  });

  const footer =
    lang === 'es'
      ? '\n\nDi «marca pendiente 1 como listo» para cerrar uno.'
      : '\n\nSay «mark pending 1 as done» to close one.';

  return header + lines.join('\n') + footer;
}
