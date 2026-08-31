import { parsePanihatiIntent } from '@/lib/panihatiParse';

describe('parsePanihatiIntent', () => {
  it('detects summary intent', () => {
    expect(parsePanihatiIntent('resumen presupuesto panihati')?.kind).toBe('summary');
  });

  it('detects search intent', () => {
    const intent = parsePanihatiIntent('buscar sonido panihati');
    expect(intent?.kind).toBe('search');
    if (intent?.kind === 'search') expect(intent.query).toContain('sonido');
  });

  it('parses budget registration with amount', () => {
    const intent = parsePanihatiIntent('registrar gasto sonido 250 usd proveedor René');
    expect(intent?.kind).toBe('budget');
    if (intent?.kind === 'budget') {
      expect(intent.entry.montoReal).toBe(250);
      expect(intent.entry.proveedor).toMatch(/ren/i);
    }
  });

  it('parses sponsor registration', () => {
    const intent = parsePanihatiIntent('registrar patrocinador oro Empresa XYZ 500 panihati');
    expect(intent?.kind).toBe('sponsor');
  });
});
