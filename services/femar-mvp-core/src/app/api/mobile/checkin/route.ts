import { NextRequest, NextResponse } from 'next/server';
import { db, storage } from '@/lib/firebase';
import { processCheckinNovelty } from '@/lib/noveltyService';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { lat, lng, photo, timestamp } = data;

    if (!lat || !lng || !photo) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Extract base64 payload
    const matches = photo.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return NextResponse.json({ error: 'Invalid photo format' }, { status: 400 });
    }
    
    const buffer = Buffer.from(matches[2], 'base64');
    const filename = `mobile_checkins/${uuidv4()}.jpg`;

    // Try to get default bucket, or fallback to a custom GCS bucket
    let bucketName = process.env.GCS_BUCKET_NAME || 'innerspark-workforce-ai-photos';
    const bucket = storage.bucket(bucketName);
    
    const file = bucket.file(filename);
    await file.save(buffer, {
      metadata: { contentType: 'image/jpeg' }
    });

    // Keep the object private in GCS and only save the internal reference.
    // The frontend or client will request a signed URL when they need to view it.
    const privatePath = `gs://${bucketName}/${filename}`;

    const logRef = db.collection('mobile_logs').doc();
    await logRef.set({
      location: { lat, lng },
      photo_url: privatePath,
      timestamp: timestamp || new Date().toISOString(),
      created_at: new Date().toISOString()
    });

    // Extract user ID from auth context (mocked as 'mobile-user' for MVP if missing)
    const userId = data.user_id || 'mobile-user';
    processCheckinNovelty(userId, timestamp || new Date().toISOString(), 'MOBILE').catch(e => console.error('Novelty processing error:', e));

    return NextResponse.json({ success: true, id: logRef.id });
  } catch (error) {
    console.error('Error processing mobile check-in:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
