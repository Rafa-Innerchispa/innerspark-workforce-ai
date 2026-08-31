import { NextResponse } from 'next/server';
import { ECOSYSTEM_MODULES } from '@/lib/ecosystemModules';
import { requireSession, unauthorizedResponse } from '@/lib/sessionAuth';

export async function GET() {
  const user = await requireSession();
  if (user instanceof NextResponse) return unauthorizedResponse('Sign in required');

  const modules = ECOSYSTEM_MODULES.filter((m) => user.allowedModuleIds.includes(m.id as never));

  return NextResponse.json({
    ok: true,
    primary_zone: 'creatorcore.ai',
    modules,
    allowed_ids: user.allowedModuleIds,
    companyId: user.companyId,
    role: user.role,
  });
}
