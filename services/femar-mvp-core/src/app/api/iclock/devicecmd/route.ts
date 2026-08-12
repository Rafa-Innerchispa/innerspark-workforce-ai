import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const sn = url.searchParams.get('SN') || url.searchParams.get('sn');
    
    if (!sn) {
      return new NextResponse('OK', { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }

    // The device posts the result of executed commands in the body
    // Format: ID&Return=0 (where 0 means success)
    const rawData = await req.text();
    const lines = rawData.split('\n').filter(line => line.trim() !== '');

    for (const line of lines) {
      // Parse line e.g., "cmdId&Return=0"
      const parts = line.split('&');
      if (parts.length > 0) {
        const cmdId = parts[0].trim();
        const returnCode = parts.find(p => p.startsWith('Return='))?.split('=')[1] || '-1';
        
        if (cmdId) {
          const cmdRef = db.collection('device_commands').doc(cmdId);
          await cmdRef.update({
            status: 'completed',
            returnCode: returnCode,
            completedAt: new Date().toISOString()
          }).catch(err => console.error(`Failed to update cmd ${cmdId}:`, err));
        }
      }
    }

    return new NextResponse('OK', { status: 200, headers: { 'Content-Type': 'text/plain' } });
  } catch (error) {
    console.error('Error handling ZKTeco devicecmd:', error);
    return new NextResponse('ERROR', { status: 500 });
  }
}
