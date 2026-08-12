import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';

export async function GET() {
  try {
    const logsRef = db.collection('adms_logs')
      .orderBy('timestamp', 'desc')
      .limit(15);
      
    const snapshot = await logsRef.get();
    
    const logs: any[] = [];
    snapshot.forEach(doc => {
      logs.push({ id: doc.id, ...doc.data() });
    });

    return NextResponse.json({ success: true, logs });
  } catch (error) {
    console.error('Error fetching realtime logs:', error);
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
  }
}
