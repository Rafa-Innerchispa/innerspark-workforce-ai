import { NextRequest, NextResponse } from 'next/server';
import { db, storage } from '@/lib/firebase';
import { authErrorResponse, requireSession, tenantForRequest } from '@/lib/auth/server';

async function signedPhotoUrl(ref: string | undefined) {
  if (!ref || !ref.startsWith('gs://')) return null;
  const withoutScheme = ref.slice(5);
  const slash = withoutScheme.indexOf('/');
  if (slash < 1) return null;
  const bucket = withoutScheme.slice(0, slash);
  const path = withoutScheme.slice(slash + 1);
  try {
    const [url] = await storage.bucket(bucket).file(path).getSignedUrl({
      action: 'read',
      expires: Date.now() + 10 * 60 * 1000,
    });
    return url;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const principal = await requireSession(req);
    const tenantId = tenantForRequest(principal, new URL(req.url).searchParams.get('companyId'));
    const snapshot = await db.collection('mobile_logs').where('companyId', '==', tenantId).limit(100).get();
    const rows = await Promise.all(snapshot.docs.map(async doc => {
      const data = doc.data();
      const photoRef = String(data.photo_ref || data.photo_url || '');
      return {
        id: doc.id,
        user_id: data.user_id || null,
        event_at: data.event_at || data.timestamp || data.created_at || null,
        device_timestamp: data.device_timestamp || null,
        location: data.location || null,
        verification: data.verification || null,
        photo_url: await signedPhotoUrl(photoRef),
        photo_available: Boolean(photoRef),
      };
    }));
    rows.sort((a, b) => Date.parse(String(b.event_at || 0)) - Date.parse(String(a.event_at || 0)));
    return NextResponse.json({ success: true, tenantId, logs: rows });
  } catch (error) {
    const auth = authErrorResponse(error);
    if (auth) return NextResponse.json(auth.body, { status: auth.status });
    console.error('Mobile logs error:', error);
    return NextResponse.json({ error: 'Failed to load mobile evidence' }, { status: 500 });
  }
}
