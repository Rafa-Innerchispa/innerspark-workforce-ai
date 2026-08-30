import { oauthRedirectUri, resolveOAuthOrigin } from './googleAuth';

describe('googleAuth origin resolution', () => {
  const oldEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...oldEnv };
    delete process.env.INNEROS_PUBLIC_ORIGIN;
    delete process.env.INNEROS_OAUTH_REDIRECT_URI;
    delete process.env.INNEROS_OAUTH_REDIRECT_URI_FORCE;
  });

  afterAll(() => {
    process.env = oldEnv;
  });

  it('uses forwarded host/proto behind reverse proxies instead of localhost', () => {
    const headers = new Headers({
      'x-forwarded-host': 'inneros.creatorcore.ai',
      'x-forwarded-proto': 'https',
      host: 'localhost:3010',
    });

    const origin = resolveOAuthOrigin(new URL('http://localhost:3010/api/auth/status'), null, headers);

    expect(origin).toBe('https://inneros.creatorcore.ai');
    expect(oauthRedirectUri(origin)).toBe('https://inneros.creatorcore.ai/api/auth/google/callback');
  });

  it('falls back to public origin when the request host is loopback', () => {
    process.env.INNEROS_PUBLIC_ORIGIN = 'https://inneros.iskconguayaquil.org/';

    const origin = resolveOAuthOrigin(new URL('http://127.0.0.1:3010/api/auth/status'));

    expect(origin).toBe('https://inneros.iskconguayaquil.org');
  });

  it('prefers a saved oauth origin cookie from the initiation request', () => {
    const origin = resolveOAuthOrigin(
      new URL('http://localhost:3010/api/auth/google/callback'),
      'https://inneros.pcdoctor.ai/'
    );

    expect(origin).toBe('https://inneros.pcdoctor.ai');
  });
});
