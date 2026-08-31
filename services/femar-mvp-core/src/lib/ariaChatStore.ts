import { db } from '@/lib/firebase';

export type StoredAriaMessage = {
  id: string;
  role: 'user' | 'aria';
  text: string;
  actionStatus?: string;
};

export type AriaChatSessionRecord = {
  id: string;
  userId: string;
  companyId: string;
  moduleId: string;
  title: string;
  messages: StoredAriaMessage[];
  updatedAt: string;
  createdAt: string;
};

const COLLECTION = 'aria_chat_sessions';

function sessionTitle(messages: StoredAriaMessage[], fallback: string): string {
  const first = messages.find((m) => m.role === 'user' && m.id !== '0');
  if (!first) return fallback;
  return first.text.slice(0, 48) + (first.text.length > 48 ? '…' : '');
}

export async function listAriaSessions(
  userId: string,
  moduleId: string,
  limit = 20
): Promise<AriaChatSessionRecord[]> {
  const snap = await db
    .collection(COLLECTION)
    .where('userId', '==', userId)
    .orderBy('updatedAt', 'desc')
    .limit(50)
    .get();

  return snap.docs
    .map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        companyId: data.companyId,
        moduleId: data.moduleId,
        title: data.title || 'Chat',
        messages: data.messages || [],
        updatedAt: data.updatedAt,
        createdAt: data.createdAt,
      };
    })
    .filter((s) => s.moduleId === moduleId)
    .slice(0, limit);
}

export async function getAriaSession(sessionId: string, userId: string): Promise<AriaChatSessionRecord | null> {
  const doc = await db.collection(COLLECTION).doc(sessionId).get();
  if (!doc.exists) return null;
  const data = doc.data()!;
  if (data.userId !== userId) return null;
  return {
    id: doc.id,
    userId: data.userId,
    companyId: data.companyId,
    moduleId: data.moduleId,
    title: data.title || 'Chat',
    messages: data.messages || [],
    updatedAt: data.updatedAt,
    createdAt: data.createdAt,
  };
}

export async function saveAriaSession(input: {
  sessionId?: string;
  userId: string;
  companyId: string;
  moduleId: string;
  messages: StoredAriaMessage[];
  titleFallback?: string;
}): Promise<AriaChatSessionRecord> {
  const now = new Date().toISOString();
  const title = sessionTitle(input.messages, input.titleFallback || 'ARIA chat');
  const payload = {
    userId: input.userId,
    companyId: input.companyId,
    moduleId: input.moduleId,
    title,
    messages: input.messages,
    updatedAt: now,
  };

  if (input.sessionId) {
    const existing = await getAriaSession(input.sessionId, input.userId);
    if (existing) {
      await db.collection(COLLECTION).doc(input.sessionId).set(payload, { merge: true });
      return { ...existing, ...payload, id: input.sessionId, createdAt: existing.createdAt };
    }
  }

  const ref = db.collection(COLLECTION).doc();
  await ref.set({ ...payload, createdAt: now });
  return { id: ref.id, ...payload, createdAt: now };
}
