import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';

export async function GET(req: Request) {
  try {
    const snapshot = await db.collection('users').where('status', '==', 'PENDING').get();
    const pendingUsers: any[] = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const { password, ...userSafe } = data; // Don't return passwords
      pendingUsers.push({ id: doc.id, ...userSafe });
    });

    return NextResponse.json({ success: true, users: pendingUsers });
  } catch (error) {
    console.error('Error fetching pending users:', error);
    return NextResponse.json({ success: false, message: 'Error interno' }, { status: 500 });
  }
}
