import crypto from 'crypto';

const COOKIE_NAME = 'google_onboarding_profile';

export type GoogleOnboardingProfile = {
  sub: string;
  email: string;
  name: string;
  picture?: string;
  exp: number;
};

function signingSecret(): string {
  return (
    process.env.INNEROS_SESSION_SECRET ||
    process.env.GOOGLE_CLIENT_SECRET ||
    'inneros-dev-onboarding-secret'
  );
}

function sign(payload: string): string {
  return crypto.createHmac('sha256', signingSecret()).update(payload).digest('base64url');
}

export function encodeGoogleOnboardingProfile(profile: Omit<GoogleOnboardingProfile, 'exp'>): string {
  const payload: GoogleOnboardingProfile = {
    ...profile,
    email: profile.email.toLowerCase(),
    exp: Date.now() + 15 * 60 * 1000,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${sign(body)}`;
}

export function decodeGoogleOnboardingProfile(raw?: string | null): GoogleOnboardingProfile | null {
  if (!raw || !raw.includes('.')) return null;
  const [body, sig] = raw.split('.', 2);
  if (!body || !sig || sign(body) !== sig) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as GoogleOnboardingProfile;
    if (!parsed.sub || !parsed.email || !parsed.exp) return null;
    if (Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function googleOnboardingCookieName(): string {
  return COOKIE_NAME;
}
