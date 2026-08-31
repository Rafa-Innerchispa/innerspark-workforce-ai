import {
  clearLocalAriaSessions,
  loadLocalAriaSessions,
  saveLocalAriaSession,
  sessionTitleFromMessages,
  type LocalAriaMessage,
  type LocalAriaSession,
} from '@/lib/ariaChatStorage';

describe('ariaChatStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saves and loads sessions per module', () => {
    const session: LocalAriaSession = {
      id: 's1',
      title: 'Hola',
      updatedAt: new Date().toISOString(),
      messages: [{ id: '1', role: 'user', text: 'Hola' }],
    };
    saveLocalAriaSession('portal', session, 'user-1');
    const loaded = loadLocalAriaSessions('portal', 'user-1');
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe('s1');
  });

  it('clears module history', () => {
    saveLocalAriaSession('desk', { id: 's1', title: 'x', updatedAt: 'now', messages: [] }, 'u');
    clearLocalAriaSessions('desk', 'u');
    expect(loadLocalAriaSessions('desk', 'u')).toHaveLength(0);
  });

  it('builds title from first user message', () => {
    const messages: LocalAriaMessage[] = [
      { id: '0', role: 'aria', text: 'welcome' },
      { id: '1', role: 'user', text: 'presupuesto panihati resumen completo del festival' },
    ];
    expect(sessionTitleFromMessages(messages, 'ARIA')).toContain('presupuesto');
  });
});
