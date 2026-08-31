import type { EcosystemModule } from '@/lib/ecosystemModules';
import type { SessionUser } from '@/lib/sessionAuth';
import { issueInnerOSHandoffToken } from '@/lib/innerosHandoff';
import { hostFromRequest } from '@/lib/sessionCookies';

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

export function moduleLandingPath(mod: EcosystemModule): string {
  switch (mod.id) {
    case 'workforce-ai':
      return '/';
    case 'iskcon-desk':
      return '/app/desk';
    case 'visitors':
      return '/';
    case 'smart-quoter':
    case 'fieldspark-photography':
      return '/';
    case 'quoteops':
      return '/';
    case 'founderos':
      return '/';
    case 'inneros-admin':
      return '/';
    default:
      return '/';
  }
}

export function buildModuleLaunchUrl(
  mod: EcosystemModule,
  user: SessionUser,
  req: Request,
): { launchUrl: string | null; entryUrl: string | null } {
  const base = resolveModuleLaunchBase(mod, hostFromRequest(req));
  if (!base) return { launchUrl: null, entryUrl: null };

  const landing = moduleLandingPath(mod);
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
