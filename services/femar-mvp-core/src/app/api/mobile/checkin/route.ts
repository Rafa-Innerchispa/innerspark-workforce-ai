import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { db, storage } from '@/lib/firebase';
import { processCheckinNovelty } from '@/lib/noveltyService';
import { authErrorResponse, requireSession } from '@/lib/auth/server';
import { evaluateGeofence, validateCoordinates, type GeofenceConfig } from '@/lib/mobile/checkinPolicy';

function photoFromDataUrl(photo: unknown) {
  if (typeof photo !== 'string') throw new Error('invalid_photo');
  const matches = photo.match(/^data:(image\/(?:jpeg|png));base64,(.+)$/);
  if (!matches) throw new Error('invalid_photo');
  const buffer = Buffer.from(matches[2], 'base64');
  if (!buffer.length || buffer.length > 5 * 1024 * 1024) throw new Error('invalid_photo_size');
  return { contentType: matches[1], buffer };
}

function idempotencyDocumentId(tenantId: string, userId: string, requestId: string) {
  return crypto.createHash('sha256').update(`${tenantId}:${userId}:${requestId}`).digest('hex');
}

async function loadTenantGeofence(tenantId: string): Promise<GeofenceConfig | null> {
  const snap = await db.collection('tenant_settings').doc(tenantId).get();
  const raw = snap.exists ? snap.data()?.mobileGeofence : null;
  if (!raw) return null;
  const latitude = Number(raw.latitude);
  const longitude = Number(raw.longitude);
  const radiusMeters = Number(raw.radiusMeters);
  if (![latitude, longitude, radiusMeters].every(Number.isFinite)) return null;
  return { latitude, longitude, radiusMeters };
}

export async function POST(req: NextRequest) {
  let reservationRef: FirebaseFirestore.DocumentReference | null = null;
  try {
    const principal = await requireSession(req);
    const data = await req.json();
    const requestId = String(req.headers.get('idempotency-key') || data.request_id || '');
    if (!requestId || requestId.length > 160) {
      return NextResponse.json({ error: 'A valid idempotency key is required' }, { status: 400 });
    }

    const { latitude, longitude, accuracyMeters } = validateCoordinates(data.lat, data.lng, data.accuracy);
    const photo = photoFromDataUrl(data.photo);
    const idempotencyId = idempotencyDocumentId(principal.tenantId, principal.userId, requestId);
    reservationRef = db.collection('mobile_checkin_idempotency').doc(idempotencyId);
    const existing = await reservationRef.get();
    if (existing.exists) {
      const previous = existing.data() || {};
      return NextResponse.json({
        success: previous.status === 'completed',
        duplicate: true,
        id: previous.checkinId || null,
        status: previous.status || 'processing',
      }, { status: previous.status === 'completed' ? 200 : 409 });
    }

    const serverTimestamp = new Date().toISOString();
    await reservationRef.create({
      status: 'processing',
      userId: principal.userId,
      tenantId: principal.tenantId,
      requestId,
      createdAt: serverTimestamp,
    });

    const geofence = evaluateGeofence(latitude, longitude, await loadTenantGeofence(principal.tenantId));
    const extension = photo.contentType === 'image/png' ? 'png' : 'jpg';
    const filename = `mobile_checkins/${principal.tenantId}/${principal.userId}/${idempotencyId}.${extension}`;
    const bucketName = process.env.GCS_BUCKET_NAME || 'innerspark-workforce-ai-photos';
    const file = storage.bucket(bucketName).file(filename);
    await file.save(photo.buffer, { metadata: { contentType: photo.contentType } });
    const privatePath = `gs://${bucketName}/${filename}`;

    const logRef = db.collection('mobile_logs').doc();
    const normalizedEvent = {
      user_id: principal.userId,
      companyId: principal.tenantId,
      tenantId: principal.tenantId,
      source: 'MOBILE',
      event_at: serverTimestamp,
      device_timestamp: data.device_timestamp || data.timestamp || null,
      location: { lat: latitude, lng: longitude, accuracy: accuracyMeters },
      photo_ref: privatePath,
      verification: {
        geofence,
        mock_location: 'not_attested',
        liveness: 'not_verified',
        capture_source: 'browser_camera',
        server_time: 'verified',
      },
      request_id: requestId,
      created_at: serverTimestamp,
      user_agent: req.headers.get('user-agent') || null,
    };
    await logRef.set(normalizedEvent);
    await reservationRef.update({ status: 'completed', checkinId: logRef.id, completedAt: new Date().toISOString() });

    processCheckinNovelty(principal.userId, serverTimestamp, 'MOBILE', principal.tenantId)
      .catch(error => console.error('Novelty processing error:', error));

    return NextResponse.json({
      success: true,
      id: logRef.id,
      event_at: serverTimestamp,
      geofence,
      duplicate: false,
    });
  } catch (error) {
    if (reservationRef) {
      await reservationRef.update({ status: 'failed', failedAt: new Date().toISOString() }).catch(() => undefined);
    }
    const auth = authErrorResponse(error);
    if (auth) return NextResponse.json(auth.body, { status: auth.status });
    const message = error instanceof Error ? error.message : 'unknown_error';
    if (message.startsWith('invalid_')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error('Error processing mobile check-in:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
