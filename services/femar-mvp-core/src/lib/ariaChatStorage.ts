/** Client-side ARIA chat persistence (localStorage). */

export type LocalAriaMessage = {
  id: string;
  role: 'user' | 'aria';
  text: string;
  actionStatus?: string;
};

export type LocalAriaSession = {
  id: string;
  title: string;
  updatedAt: string;
  messages: LocalAriaMessage[];
};

const STORAGE_VERSION = 'inneros_aria_v1';

function storageKey(moduleId: string, userId?: string): string {
  return `${STORAGE_VERSION}:${userId || 'guest'}:${moduleId}`;
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function loadLocalAriaSessions(moduleId: string, userId?: string): LocalAriaSession[] {
  if (typeof window === 'undefined') return [];
  const key = storageKey(moduleId, userId);

  // Judge mode is intentionally ephemeral: every fresh page load starts from a
  // clean ARIA conversation so stale demo errors/history cannot confuse judges.
  if (moduleId === 'judge') {
    localStorage.removeItem(key);
    return [];
  }

  return safeParse<LocalAriaSession[]>(localStorage.getItem(key), []);
}

export function saveLocalAriaSession(
  moduleId: string,
  session: LocalAriaSession,
  userId?: string,
  maxSessions = 20
): void {
  if (typeof window === 'undefined') return;

  // Judge chat is a recording/demo surface, not a durable inbox.
  if (moduleId === 'judge') return;

  const key = storageKey(moduleId, userId);
  const list = loadLocalAriaSessions(moduleId, userId).filter((s) => s.id !== session.id);
  list.unshift(session);
  localStorage.setItem(key, JSON.stringify(list.slice(0, maxSessions)));
}

export function clearLocalAriaSessions(moduleId: string, userId?: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(storageKey(moduleId, userId));
}

export function sessionTitleFromMessages(messages: LocalAriaMessage[], fallback: string): string {
  const first = messages.find((m) => m.role === 'user' && m.id !== '0');
  if (!first) return fallback;
  return first.text.slice(0, 48) + (first.text.length > 48 ? '…' : '');
}
