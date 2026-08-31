import crypto from 'crypto';
import type { SessionUser } from '@/lib/sessionAuth';

export type InnerOSHandoffPayload = {
  sub: string;
  companyId: string;
  role: string;
  moduleId: string;
  name: string;
  exp: number;
  aud: string;
};

const DEFAULT_TTL_SECONDS = 90;

function handoffSecret(): string {
  return (
    process.env.INNEROS_HANDOFF_SECRET?.trim() ||
    process.env.SESSION_SECRET?.trim() ||
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.slice(0, 32) ||
    'inneros-dev-handoff-secret-change-me'
  );
}

function sign(data: string): string {
  return crypto.createHmac('sha256', handoffSecret()).update(data).digest('base64url');
}

export function issueInnerOSHandoffToken(
  user: SessionUser,
  moduleId: string,
  audienceHost: string,
  ttlSeconds = DEFAULT_TTL_SECONDS,
): string {
  const payload: InnerOSHandoffPayload = {
    sub: user.id,
    companyId: user.companyId,
    role: user.role,
    moduleId,
    name: user.name || user.id,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
    aud: audienceHost.toLowerCase(),
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${sign(body)}`;
}

export function verifyInnerOSHandoffToken(token: string, expectedHost: string): InnerOSHandoffPayload | null {
  const [body, signature] = token.split('.');
  if (!body || !signature || sign(body) !== signature) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as InnerOSHandoffPayload;
    if (!payload.sub || !payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    const host = expectedHost.toLowerCase();
    if (payload.aud !== host && !host.endsWith(payload.aud.replace(/^\./, ''))) {
      // Allow aud match on registrable domain (e.g. workforce.creatorcore.ai vs .creatorcore.ai)
      const audOk =
        host === payload.aud ||
        host.endsWith('.creatorcore.ai') && payload.aud.endsWith('creatorcore.ai') ||
        host.endsWith('.pcdoctor.ai') && payload.aud.endsWith('pcdoctor.ai') ||
        host.endsWith('.iskconguayaquil.org') && payload.aud.endsWith('iskconguayaquil.org');
      if (!audOk) return null;
    }
    return payload;
  } catch {
    return null;
  }
}
