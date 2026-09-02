import type { EcosystemModule } from '@/lib/ecosystemModules';
import type { SessionUser } from '@/lib/sessionAuth';
import { issueInnerOSHandoffToken } from '@/lib/innerosHandoff';
import { hostFromRequest } from '@/lib/sessionCookies';
import { moduleLandingPathForId } from '@/lib/moduleDomains';

const LAN_HOST_RE = /^(192\.168\.|10\.|127\.0\.0\.1|localhost)/i;

function isLanUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return LAN_HOST_RE.test(host);
  } catch {
    return false;
  }
}

/** Prefer public URL in production; keep LAN entry only for local dev. */
export function resolveModuleLaunchBase(mod: EcosystemModule, requestHost = ''): string | null {
  const candidates = [mod.publicUrl, mod.entryUrl].filter(Boolean) as string[];
  const requestIsLocal = LAN_HOST_RE.test(requestHost);

  for (const url of candidates) {
    if (!isLanUrl(url)) return url.replace(/\/$/, '');
  }

  if (requestIsLocal) {
    return mod.entryUrl?.replace(/\/$/, '') || null;
  }

  return mod.publicUrl?.replace(/\/$/, '') || mod.entryUrl?.replace(/\/$/, '') || null;
}

export function moduleLandingPath(mod: EcosystemModule): string | null {
  return moduleLandingPathForId(mod.id);
}

export function buildModuleLaunchUrl(
  mod: EcosystemModule,
  user: SessionUser,
  req: Request,
): { launchUrl: string | null; entryUrl: string | null } {
  const base = resolveModuleLaunchBase(mod, hostFromRequest(req));
  if (!base) return { launchUrl: null, entryUrl: null };

  const landing = moduleLandingPath(mod);
  if (!landing) return { launchUrl: null, entryUrl: base };
  let audienceHost: string;
  try {
    audienceHost = new URL(base).hostname.toLowerCase();
  } catch {
    return { launchUrl: null, entryUrl: base };
  }

  const token = issueInnerOSHandoffToken(user, mod.id, audienceHost);
  const launch = new URL('/app/auth/handoff', base);
  launch.searchParams.set('token', token);
  launch.searchParams.set('redirect', landing);
  launch.searchParams.set('module', mod.id);

  return { launchUrl: launch.toString(), entryUrl: base };
}
