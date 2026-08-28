import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { processCheckinNovelty } from '@/lib/noveltyService';
import { processDeviceAttlog } from '@/lib/workforce/attendanceRuntime';

// Handle ZKTeco Initialization (Handshake)
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const sn = url.searchParams.get('SN') || url.searchParams.get('sn');
    
    if (sn) {
      // Register or update device in Firestore
      const deviceRef = db.collection('devices').doc(sn);
      const doc = await deviceRef.get();
      const clientIp = req.headers.get('x-forwarded-for') || 'Unknown';

      if (!doc.exists) {
        await deviceRef.set({
          id: sn,
          status: 'pendiente',
          ip: clientIp,
          lastSync: new Date().toISOString(),
          created_at: new Date().toISOString()
        });
      } else {
        await deviceRef.update({
          lastSync: new Date().toISOString(),
          ip: clientIp
        });
      }
    }

    // Required ZKTeco Handshake Response Options
    const optionsResponse = `GET OPTION FROM: ${sn}\r\nErrorDelay=60\r\nDelay=10\r\nTransTimes=00:00;14:00\r\nTransInterval=1\r\nTransFlag=1111000000\r\nRealtime=1\r\nEncrypt=0\r\n`;
    
    return new NextResponse(optionsResponse, { 
      status: 200, 
      headers: { 'Content-Type': 'text/plain' } 
    });
  } catch (error) {
    console.error('Error handling ZKTeco GET handshake:', error);
    return new NextResponse('ERROR', { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const rawData = await req.text();
    if (!rawData || rawData.trim() === '') {
      return new NextResponse('BAD REQUEST', { status: 400, headers: { 'Content-Type': 'text/plain' } });
    }
    const url = new URL(req.url);
    const sn = url.searchParams.get('SN') || url.searchParams.get('sn') || 'UNKNOWN_DEVICE';
    
    const table = url.searchParams.get('table') || 'ATTLOG';
    const lines = rawData.split('\n').filter(line => line.trim() !== '');
    
    const batch = db.batch();

    if (table === 'ATTLOG') {
      let pipelineResult: ReturnType<typeof processDeviceAttlog> | null = null;
      try {
        pipelineResult = processDeviceAttlog(sn, rawData);
      } catch (pipelineErr) {
        console.error('Attendance pipeline parse error:', pipelineErr);
      }

      const admsLogsRef = db.collection('adms_logs');
      for (const line of lines) {
        const parts = line.split('\t');
        if (parts.length >= 2) {
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

      if (pipelineResult && pipelineResult.punches.length > 0) {
        const snapshot = {
          device_id: sn,
          tenant_id: pipelineResult.tenant.tenant_id,
          punch_count: pipelineResult.punches.length,
          attendance: pipelineResult.attendance,
          created_at: new Date().toISOString(),
        };
        void db
          .collection('attendance_pipeline_runs')
          .doc()
          .set(snapshot)
          .catch((err) =>
            console.error('Attendance pipeline snapshot persist error:', err)
          );
      }
    } else if (table === 'FINGERTMP') {
      const fingerprintRef = db.collection('fingerprints');
      for (const line of lines) {
        // ZKTeco format for FINGERTMP: PIN \t FID \t Size \t Valid \t TemplateData
        const parts = line.split('\t');
        if (parts.length >= 5) {
          const docRef = fingerprintRef.doc();
          batch.set(docRef, {
            serial_number: sn,
            user_id: parts[0],
            finger_id: parts[1],
            size: parts[2],
            valid: parts[3],
            template: parts[4],
            created_at: new Date().toISOString()
          });
        }
      }
    } else {
      // OPERLOG, USERPIC, etc.
      console.log(`Received table ${table} from ${sn}, ignoring for now.`);
    }

    await batch.commit();

    return new NextResponse('OK', { status: 200, headers: { 'Content-Type': 'text/plain' } });
  } catch (error) {
    console.error('Error parsing cdata:', error);
    return new NextResponse('ERROR', { status: 500, headers: { 'Content-Type': 'text/plain' } });
  }
}
