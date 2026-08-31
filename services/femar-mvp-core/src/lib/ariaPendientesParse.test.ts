import { parsePendienteIntent } from '@/lib/ariaPendientesParse';

describe('ariaPendientesParse', () => {
  it('detects save intent in Spanish', () => {
    const intent = parsePendienteIntent('guarda esto como pendiente: wire AG-52 PDF en ISKCON Desk');
    expect(intent?.kind).toBe('save');
    if (intent?.kind === 'save') {
      expect(intent.title).toContain('wire AG-52');
    }
  });

  it('detects list intent', () => {
    expect(parsePendienteIntent('cuáles son los pendientes')?.kind).toBe('list');
    expect(parsePendienteIntent('mis pendientes')?.kind).toBe('list');
  });

  it('detects complete by index', () => {
    expect(parsePendienteIntent('marca pendiente 2 como listo')?.kind).toBe('complete');
  });

  it('ignores unrelated prompts', () => {
    expect(parsePendienteIntent('presupuesto panihati resumen')).toBeNull();
  });
});
