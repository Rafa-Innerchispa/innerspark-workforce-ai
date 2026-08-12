import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';

export async function GET() {
  try {
    const commandsRef = db.collection('device_commands')
      .orderBy('createdAt', 'desc')
      .limit(30);
      
    const snapshot = await commandsRef.get();
    
    const commands: any[] = [];
    snapshot.forEach(doc => {
      commands.push({ id: doc.id, ...doc.data() });
    });

    return NextResponse.json({ success: true, commands });
  } catch (error) {
    console.error('Error fetching command logs:', error);
    return NextResponse.json({ error: 'Failed to fetch commands' }, { status: 500 });
  }
}
