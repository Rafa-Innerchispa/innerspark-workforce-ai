import {
  createCanonicalPunch,
  isValidCanonicalPunch,
  normalizePunchTimestamp,
} from './canonicalPunch';
import { ZKTecoPunchAdapter, zktecoPunchAdapter } from './punchAdapter';

describe('canonicalPunch', () => {
  describe('normalizePunchTimestamp', () => {
    it('normalizes ADMS local timestamps to Guayaquil offset', () => {
      expect(normalizePunchTimestamp('2026-08-05 09:15:00')).toBe(
        '2026-08-05T09:15:00-05:00'
      );
    });

    it('preserves ISO timestamps with offset', () => {
      expect(normalizePunchTimestamp('2026-08-05T14:15:00.000Z')).toBe(
        '2026-08-05T14:15:00.000Z'
      );
    });
  });

  describe('isValidCanonicalPunch', () => {
    it('accepts a fully populated punch', () => {
      const punch = createCanonicalPunch({
        employee_id: '42',
        timestamp: '2026-08-05 08:55:00',
        event_type: 'clock_in',
        source: 'zkteco',
        device_id: 'SN123',
        evidence: { raw: '42\t2026-08-05 08:55:00\t0' },
      });

      expect(isValidCanonicalPunch(punch)).toBe(true);
    });

    it('rejects punches missing required fields', () => {
      expect(
        isValidCanonicalPunch({
          employee_id: '42',
          timestamp: '2026-08-05T08:55:00-05:00',
          event_type: 'clock_in',
          source: 'zkteco',
        })
      ).toBe(false);
    });
  });

  describe('createCanonicalPunch', () => {
    it('mirrors raw_ref into evidence when only top-level ref is provided', () => {
      const punch = createCanonicalPunch({
        employee_id: '7',
        timestamp: '2026-08-05 17:30:00',
        event_type: 'clock_out',
        source: 'mobile',
        device_id: 'mobile-app',
        raw_ref: 'gs://bucket/evidence/7.jpg',
      });

      expect(punch.raw_ref).toBe('gs://bucket/evidence/7.jpg');
      expect(punch.evidence?.raw_ref).toBe('gs://bucket/evidence/7.jpg');
    });
  });
});

describe('ZKTecoPunchAdapter', () => {
  const adapter = new ZKTecoPunchAdapter();
  const context = { device_id: 'ZK-DEVICE-001' };

  it('parses a check-in ATTLOG line', () => {
    const punch = adapter.parse('1001\t2026-08-05 08:55:00\t0\t1', context);

    expect(punch).toMatchObject({
      employee_id: '1001',
      timestamp: '2026-08-05T08:55:00-05:00',
      event_type: 'clock_in',
      source: 'zkteco',
      device_id: 'ZK-DEVICE-001',
    });
    expect(punch?.evidence?.raw).toBe('1001\t2026-08-05 08:55:00\t0\t1');
    expect(punch?.raw_ref).toContain('zkteco:ZK-DEVICE-001:1001');
  });

  it('parses a check-out ATTLOG line', () => {
    const punch = adapter.parse('1001\t2026-08-05 17:30:00\t1', context);

    expect(punch?.event_type).toBe('clock_out');
  });

  it('returns null for malformed lines', () => {
    expect(adapter.parse('', context)).toBeNull();
    expect(adapter.parse('only-one-column', context)).toBeNull();
    expect(adapter.parse(null, context)).toBeNull();
  });

  it('parses newline-delimited batches', () => {
    const batch = adapter.parseBatch(
      '1001\t2026-08-05 08:55:00\t0\n1001\t2026-08-05 17:30:00\t1\n',
      context
    );

    expect(batch).toHaveLength(2);
    expect(batch[0].event_type).toBe('clock_in');
    expect(batch[1].event_type).toBe('clock_out');
  });

  it('exports a singleton adapter instance', () => {
    expect(zktecoPunchAdapter.vendor).toBe('zkteco');
  });
});
