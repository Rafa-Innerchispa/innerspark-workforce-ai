import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { processCheckinNovelty } from '@/lib/noveltyService';

export async function POST(req: NextRequest) {
  try {
    const rawData = await req.text();
    if (!rawData || rawData.trim() === '') {
      return new NextResponse('BAD REQUEST', { status: 400, headers: { 'Content-Type': 'text/plain' } });
    }
    const url = new URL(req.url);
    const sn = url.searchParams.get('SN') || 'UNKNOWN_DEVICE';
    
    // Parse ADMS log format: UID \t ID \t Timestamp \t State \t Type ...
    const lines = rawData.split('\n').filter(line => line.trim() !== '');
    
    const batch = db.batch();
    const admsLogsRef = db.collection('adms_logs');

    for (const line of lines) {
      const parts = line.split('\t');
      if (parts.length >= 3) {
        const docRef = admsLogsRef.doc();
        batch.set(docRef, {
          serial_number: sn,
          user_id: parts[0],
          timestamp: parts[1],
          state: parts[2] || '',
          type: parts[3] || '',
          raw: line,
          created_at: new Date().toISOString()
        });
        
        // Asynchronously process the novelty
        processCheckinNovelty(parts[0], parts[1], 'ADMS').catch(e => console.error('Novelty processing error:', e));
      }
    }

    await batch.commit();

    return new NextResponse('OK', { status: 200, headers: { 'Content-Type': 'text/plain' } });
  } catch (error) {
    console.error('Error parsing cdata:', error);
    return new NextResponse('ERROR', { status: 500, headers: { 'Content-Type': 'text/plain' } });
  }
}
