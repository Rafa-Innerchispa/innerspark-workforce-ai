export type GeofenceConfig = {
  latitude: number;
  longitude: number;
  radiusMeters: number;
};

export type GeofenceResult = {
  status: 'verified' | 'outside' | 'not_configured';
  distanceMeters?: number;
  radiusMeters?: number;
};

export function validateCoordinates(lat: unknown, lng: unknown, accuracy: unknown) {
  const latitude = Number(lat);
  const longitude = Number(lng);
  const accuracyMeters = Number(accuracy);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) throw new Error('invalid_latitude');
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) throw new Error('invalid_longitude');
  if (!Number.isFinite(accuracyMeters) || accuracyMeters < 0 || accuracyMeters > 5000) throw new Error('invalid_accuracy');
  return { latitude, longitude, accuracyMeters };
}

function toRadians(value: number) {
  return value * Math.PI / 180;
}

export function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number) {
  const earth = 6371000;
  const dLat = toRadians(bLat - aLat);
  const dLng = toRadians(bLng - aLng);
  const x = Math.sin(dLat / 2) ** 2
    + Math.cos(toRadians(aLat)) * Math.cos(toRadians(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * earth * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export function evaluateGeofence(
  latitude: number,
  longitude: number,
  config?: GeofenceConfig | null,
): GeofenceResult {
  if (!config) return { status: 'not_configured' };
  if (!Number.isFinite(config.radiusMeters) || config.radiusMeters <= 0) return { status: 'not_configured' };
  const distance = distanceMeters(latitude, longitude, config.latitude, config.longitude);
  return {
    status: distance <= config.radiusMeters ? 'verified' : 'outside',
    distanceMeters: Math.round(distance),
    radiusMeters: config.radiusMeters,
  };
}
