import { MODULE_PUBLIC_URLS, MODULE_SUBDOMAINS, modulePublicUrl, moduleLandingPathForHost, moduleLandingPathForId } from '@/lib/moduleDomains';

describe('moduleDomains', () => {
  it('uses creatorcore.ai for all module subdomains', () => {
    expect(MODULE_PUBLIC_URLS.vigilos).toBe('https://vigilos.creatorcore.ai/');
    expect(MODULE_PUBLIC_URLS.quoteops).toBe('https://quoteops.creatorcore.ai/');
    expect(MODULE_PUBLIC_URLS.photo).toBe('https://photo.creatorcore.ai/');
    expect(MODULE_PUBLIC_URLS.quoter).toBe('https://quoter.creatorcore.ai/');
    expect(MODULE_PUBLIC_URLS.founder).toBe('https://founder.creatorcore.ai/');
    expect(MODULE_PUBLIC_URLS.iskconDesk).toBe('https://iskcon.creatorcore.ai/app/desk');
  });

  it('builds paths on subdomains', () => {
    expect(modulePublicUrl(MODULE_SUBDOMAINS.portal, '/app/login')).toBe(
      'https://inneros.creatorcore.ai/app/login',
    );
  });

  it('maps module hosts to real landing routes instead of login', () => {
    expect(moduleLandingPathForHost('workforce.creatorcore.ai')).toBe('/modules');
    expect(moduleLandingPathForHost('iskcon.creatorcore.ai')).toBe('/app/desk');
    expect(moduleLandingPathForHost('inneros.creatorcore.ai')).toBe('/app/modules');
    expect(moduleLandingPathForId('quoteops')).toBeNull();
  });
});
