/**
 * @jest-environment node
 */
import { buildMinimalPdf } from '@/lib/minimalPdf';

describe('minimalPdf', () => {
  it('returns a PDF buffer with header', () => {
    const buf = buildMinimalPdf('Test', ['line one', 'line two']);
    expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(buf.length).toBeGreaterThan(200);
  });
});
