import { oauthRedirectUri, resolveOAuthOrigin, absoluteAppRedirect } from '@/lib/googleAuth';

describe('googleAuth OAuth origin', () => {
  it('uses x-forwarded-host for canonical shell behind loopback proxy', () => {
    const url = new URL('http://127.0.0.1:3010/api/auth/google');
    const headers = new Headers({
      host: 'localhost:3010',
      'x-forwarded-host': 'inneros.creatorcore.ai',
      'x-forwarded-proto': 'https',
    });
    const origin = resolveOAuthOrigin(url, null, headers);
    expect(origin).toBe('https://inneros.creatorcore.ai');
  });

  it('prefers explicit public hostname when Host is canonical', () => {
    const url = new URL('https://inneros.pcdoctor.ai/api/auth/google');
    const headers = new Headers({ host: 'inneros.pcdoctor.ai' });
    expect(resolveOAuthOrigin(url, null, headers)).toBe('https://inneros.pcdoctor.ai');
  });

  it('builds callback from origin', () => {
    expect(oauthRedirectUri('https://inneros.creatorcore.ai')).toBe(
      'https://inneros.creatorcore.ai/api/auth/google/callback'
    );
  });

  it('builds absolute app redirects for Next.js route handlers', () => {
    expect(absoluteAppRedirect('https://inneros.creatorcore.ai', '/app/onboarding/google').href).toBe(
      'https://inneros.creatorcore.ai/app/onboarding/google'
    );
  });

  it('falls back to public origin when bind host is 0.0.0.0', () => {
    const url = new URL('http://0.0.0.0:3010/api/auth/google');
    const headers = new Headers({ host: '0.0.0.0:3010' });
    expect(resolveOAuthOrigin(url, null, headers)).toBe('https://inneros.creatorcore.ai');
    expect(absoluteAppRedirect('http://0.0.0.0', '/app/onboarding/google').href).toBe(
      'https://inneros.creatorcore.ai/app/onboarding/google'
    );
  });

  it('defaults shell hosts to https without x-forwarded-proto', () => {
    const url = new URL('http://inneros.creatorcore.ai/api/auth/status');
    const headers = new Headers({ host: 'inneros.creatorcore.ai' });
    expect(resolveOAuthOrigin(url, null, headers)).toBe('https://inneros.creatorcore.ai');
  });
});
