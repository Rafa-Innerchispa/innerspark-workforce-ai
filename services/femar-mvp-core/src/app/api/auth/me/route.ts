import { NextResponse } from 'next/server';
import { getSessionUser, unauthorizedResponse } from '@/lib/sessionAuth';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorizedResponse();

  const { allowedModuleIds, ...safe } = user;
  return NextResponse.json({
    ok: true,
    user: safe,
    allowedModuleIds,
  });
}
