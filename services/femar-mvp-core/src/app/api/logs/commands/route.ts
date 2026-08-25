import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { authErrorResponse, requireSession } from '@/lib/auth/server';

type DeviceCommand = Record<string, unknown> & { deviceId?: string };

export async function GET(req: Request) {
  try {
    const principal = await requireSession(req);

    const devicesSnapshot = await db.collection('devices')
      .where('companyId', '==', principal.tenantId)
      .get();
    const deviceIds = new Set(devicesSnapshot.docs.map((doc) => doc.id));

    if (deviceIds.size === 0) {
      return NextResponse.json({ success: true, commands: [] });
    }

    const snapshot = await db.collection('device_commands')
      .orderBy('createdAt', 'desc')
      .limit(250)
      .get();

    const commands = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() } as DeviceCommand & { id: string }))
      .filter((command) => deviceIds.has(String(command.deviceId || '')))
      .slice(0, 50);

    return NextResponse.json({ success: true, commands });
  } catch (error) {
    const auth = authErrorResponse(error);
    if (auth) return NextResponse.json(auth.body, { status: auth.status });
    console.error('Error fetching command logs:', error);
    return NextResponse.json({ error: 'Failed to fetch commands' }, { status: 500 });
  }
}
