import { NextResponse } from 'next/server';
import { ECOSYSTEM_MODULES } from '@/lib/ecosystemModules';
import { buildModuleLaunchUrl, resolveModuleLaunchBase } from '@/lib/moduleLaunch';
import { hostFromRequest } from '@/lib/sessionCookies';
import { requireModuleAccess } from '@/lib/sessionAuth';

type Params = { params: Promise<{ moduleId: string }> };

export async function GET(req: Request, { params }: Params) {
  const { moduleId } = await params;
  const mod = ECOSYSTEM_MODULES.find((m) => m.id === moduleId);
  if (!mod) {
    return NextResponse.json({ ok: false, error: 'Module not found' }, { status: 404 });
  }

  const user = await requireModuleAccess(moduleId);
  if (user instanceof NextResponse) return user;

  const { launchUrl, entryUrl } = buildModuleLaunchUrl(mod, user, req);
  const resolvedEntry = resolveModuleLaunchBase(mod, hostFromRequest(req));

  return NextResponse.json({
    ok: true,
    moduleId,
    allowed: true,
    entryUrl: resolvedEntry || mod.entryUrl,
    launchUrl,
    companyId: user.companyId,
    role: user.role,
  });
}
