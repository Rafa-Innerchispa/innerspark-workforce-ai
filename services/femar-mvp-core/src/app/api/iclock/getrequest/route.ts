import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const sn = url.searchParams.get('SN') || url.searchParams.get('sn');

    if (sn) {
      // Update last sync time
      const deviceRef = db.collection('devices').doc(sn);
      const doc = await deviceRef.get();
      if (doc.exists) {
        await deviceRef.update({
          lastSync: new Date().toISOString(),
          ip: req.headers.get('x-forwarded-for') || 'Unknown'
        });

        // Only send commands to active (approved) devices
        const deviceData = doc.data();
        if (deviceData?.status === 'aprobado' || deviceData?.status === 'activo') {
          const commandsRef = db.collection('device_commands')
            .where('deviceId', '==', sn)
            .where('status', '==', 'pending')
            .limit(10); // Fetch up to 10 commands at a time

          const commandsSnapshot = await commandsRef.get();
          if (!commandsSnapshot.empty) {
            let responseBody = '';
            for (const cmdDoc of commandsSnapshot.docs) {
              const cmdData = cmdDoc.data();
              // Format: C:<id>:<command>\n
              responseBody += `C:${cmdDoc.id}:${cmdData.command}\n`;
              
              // Mark as sent so we don't send it again on the next poll if device hasn't ACKed yet
              // We will rely on devicecmd endpoint to mark as 'completed'
              await cmdDoc.ref.update({ status: 'sent', sentAt: new Date().toISOString() });
            }
            return new NextResponse(responseBody, { status: 200, headers: { 'Content-Type': 'text/plain' } });
          }
        }

      } else {
        await deviceRef.set({
          id: sn,
          status: 'pendiente',
          ip: req.headers.get('x-forwarded-for') || 'Unknown',
          lastSync: new Date().toISOString(),
          created_at: new Date().toISOString()
        });
      }
    }

    return new NextResponse('OK', { status: 200, headers: { 'Content-Type': 'text/plain' } });
  } catch (error) {
    console.error('Error handling ZKTeco getrequest:', error);
    return new NextResponse('ERROR', { status: 500 });
  }
}
