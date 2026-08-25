import { distanceMeters, evaluateGeofence, validateCoordinates } from './checkinPolicy';

describe('mobile check-in policy', () => {
  test('accepts valid coordinates and accuracy', () => {
    expect(validateCoordinates(-2.17, -79.9, 12)).toEqual({
      latitude: -2.17,
      longitude: -79.9,
      accuracyMeters: 12,
    });
  });

  test('rejects missing or implausible GPS accuracy', () => {
    expect(() => validateCoordinates(-2.17, -79.9, undefined)).toThrow('invalid_accuracy');
    expect(() => validateCoordinates(-2.17, -79.9, 6000)).toThrow('invalid_accuracy');
  });

  test('returns not_configured when tenant has no geofence', () => {
    expect(evaluateGeofence(-2.17, -79.9, null)).toEqual({ status: 'not_configured' });
  });

  test('verifies inside configured geofence and rejects outside', () => {
    const config = { latitude: -2.17, longitude: -79.9, radiusMeters: 150 };
    expect(evaluateGeofence(-2.1702, -79.9002, config).status).toBe('verified');
    expect(evaluateGeofence(-2.18, -79.91, config).status).toBe('outside');
  });

  test('distance calculation is deterministic', () => {
    const first = distanceMeters(-2.17, -79.9, -2.171, -79.901);
    const second = distanceMeters(-2.17, -79.9, -2.171, -79.901);
    expect(first).toBe(second);
    expect(first).toBeGreaterThan(0);
  });
});
