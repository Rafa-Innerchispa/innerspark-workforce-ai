/** Dominios públicos canónicos — alineado con config/domains/hackathon-urls.yaml */

import {
  INNEROS_MODULE_HOSTS,
  MODULE_HOST_ALIASES,
  MODULE_PUBLIC_URLS,
  MODULE_SUBDOMAINS,
  PRIMARY_ZONE,
  modulePublicUrl,
  moduleLandingPathForHost,
  moduleLandingPathForId,
} from '@/lib/moduleDomains';

export { PRIMARY_ZONE, MODULE_SUBDOMAINS, MODULE_PUBLIC_URLS, MODULE_HOST_ALIASES, modulePublicUrl, moduleLandingPathForHost, moduleLandingPathForId };

export const HACKATHON_URLS = {
  portalLogin: MODULE_PUBLIC_URLS.portalLogin,
  portalModules: MODULE_PUBLIC_URLS.portalModules,
  workforce: MODULE_PUBLIC_URLS.workforce,
  vigilos: MODULE_PUBLIC_URLS.vigilos,
  quoteops: MODULE_PUBLIC_URLS.quoteops,
  quoter: MODULE_PUBLIC_URLS.quoter,
  photo: MODULE_PUBLIC_URLS.photo,
  founder: MODULE_PUBLIC_URLS.founder,
  iskconLogin: MODULE_PUBLIC_URLS.iskconLogin,
  iskconDesk: MODULE_PUBLIC_URLS.iskconDesk,
  /** @deprecated use vigilos */
  visitors: MODULE_PUBLIC_URLS.vigilos,
} as const;

/** Portal shell hosts (inneros + legacy pcdoctor / iskcon org aliases). */
export const INNEROS_SHELL_HOSTS = new Set([
  modulePublicUrl(MODULE_SUBDOMAINS.portal).replace(/^https:\/\//, '').replace(/\/$/, ''),
  `www.${MODULE_SUBDOMAINS.portal}.${PRIMARY_ZONE}`,
  'inneros.pcdoctor.ai',
  'www.inneros.pcdoctor.ai',
  'inneros.iskconguayaquil.org',
  'www.inneros.iskconguayaquil.org',
]);

/** All creatorcore module hosts use the same InnerOS app shell + SSO cookie domain. */
export const INNEROS_APP_HOSTS = new Set([...INNEROS_SHELL_HOSTS, ...INNEROS_MODULE_HOSTS]);

export const ISKCON_HOSTS = new Set([
  modulePublicUrl(MODULE_SUBDOMAINS.iskcon).replace(/^https:\/\//, '').replace(/\/$/, ''),
  `www.${MODULE_SUBDOMAINS.iskcon}.${PRIMARY_ZONE}`,
  'inneros.iskconguayaquil.org',
  'www.inneros.iskconguayaquil.org',
]);

export function resolveCanonicalModuleHost(host: string): string {
  return host in MODULE_HOST_ALIASES ? new URL(MODULE_HOST_ALIASES[host]).hostname : host;
}
