import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { authErrorResponse, requireSession } from '@/lib/auth/server';

type AttendanceLog = Record<string, unknown> & { user_id?: string };

export async function GET(req: Request) {
  try {
    const principal = await requireSession(req);

    const employeesSnapshot = await db.collection('employees')
      .where('companyId', '==', principal.tenantId)
      .get();
    const employeeIds = new Set(employeesSnapshot.docs.map((doc) => doc.id));

    if (employeeIds.size === 0) {
      return NextResponse.json({ success: true, logs: [] });
    }

    // Historical ADMS logs do not all carry companyId, so tenant isolation is
    // enforced server-side through the employee membership set.
    const snapshot = await db.collection('adms_logs')
      .orderBy('timestamp', 'desc')
      .limit(250)
      .get();

    const logs = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() } as AttendanceLog & { id: string }))
      .filter((log) => employeeIds.has(String(log.user_id || '')))
      .slice(0, 50);

    return NextResponse.json({ success: true, logs });
  } catch (error) {
    const auth = authErrorResponse(error);
    if (auth) return NextResponse.json(auth.body, { status: auth.status });
    console.error('Error fetching realtime logs:', error);
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
  }
}
