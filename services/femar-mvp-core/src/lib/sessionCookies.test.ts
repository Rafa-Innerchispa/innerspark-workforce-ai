/**
 * @jest-environment node
 */
import { buildSessionCookieOptions, SESSION_COOKIE_MAX_AGE_SEC } from '@/lib/sessionCookies';

describe('sessionCookies', () => {
  it('sets shared domain and maxAge for creatorcore hosts', () => {
    const req = new Request('https://inneros.creatorcore.ai/app/login', {
      headers: new Headers({
        host: 'inneros.creatorcore.ai',
        'x-forwarded-proto': 'https',
      }),
    });
    const opts = buildSessionCookieOptions(req, SESSION_COOKIE_MAX_AGE_SEC);
    expect(opts.domain).toBe('.creatorcore.ai');
    expect(opts.maxAge).toBe(SESSION_COOKIE_MAX_AGE_SEC);
    expect(opts.secure).toBe(true);
    expect(opts.sameSite).toBe('lax');
  });
});
