/** Canonical public hostnames for InnerOS modules — single zone creatorcore.ai */

export const PRIMARY_ZONE = 'creatorcore.ai';

/** Subdomain slug per module (without zone). */
export const MODULE_SUBDOMAINS = {
  portal: 'inneros',
  workforce: 'workforce',
  vigilos: 'vigilos',
  quoteops: 'quoteops',
  quoter: 'quoter',
  photo: 'photo',
  founder: 'founder',
  iskcon: 'iskcon',
  credentials: 'credentials',
  admin: 'admin',
} as const;

export type ModuleSubdomainKey = keyof typeof MODULE_SUBDOMAINS;

/** Build https URL for a module subdomain. */
export function modulePublicUrl(subdomain: string, path = '/'): string {
  const base = `https://${subdomain}.${PRIMARY_ZONE}`;
  if (!path || path === '/') return `${base}/`;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

/** All module hosts that share InnerOS session + unified /app/login shell. */
export const INNEROS_MODULE_HOSTS = new Set(
  Object.values(MODULE_SUBDOMAINS).flatMap((sub) => [sub, `www.${sub}`]).map((sub) => `${sub}.${PRIMARY_ZONE}`),
);

/** Legacy hostnames → canonical (for redirects / health probes). */
export const MODULE_HOST_ALIASES: Record<string, string> = {
  'visitors.creatorcore.ai': modulePublicUrl(MODULE_SUBDOMAINS.vigilos),
  'www.visitors.creatorcore.ai': modulePublicUrl(MODULE_SUBDOMAINS.vigilos),
  'quoteops.pcdoctor.ai': modulePublicUrl(MODULE_SUBDOMAINS.quoteops),
  'www.quoteops.pcdoctor.ai': modulePublicUrl(MODULE_SUBDOMAINS.quoteops),
  'foto.creatorcore.ai': modulePublicUrl(MODULE_SUBDOMAINS.photo),
  'www.foto.creatorcore.ai': modulePublicUrl(MODULE_SUBDOMAINS.photo),
  'inneros.iskconguayaquil.org': modulePublicUrl(MODULE_SUBDOMAINS.iskcon, '/app/desk'),
  'www.inneros.iskconguayaquil.org': modulePublicUrl(MODULE_SUBDOMAINS.iskcon, '/app/desk'),
};

export const MODULE_PUBLIC_URLS = {
  portalLogin: modulePublicUrl(MODULE_SUBDOMAINS.portal, '/app/login'),
  portalModules: modulePublicUrl(MODULE_SUBDOMAINS.portal, '/app/modules'),
  workforce: modulePublicUrl(MODULE_SUBDOMAINS.workforce),
  vigilos: modulePublicUrl(MODULE_SUBDOMAINS.vigilos),
  quoteops: modulePublicUrl(MODULE_SUBDOMAINS.quoteops),
  quoter: modulePublicUrl(MODULE_SUBDOMAINS.quoter),
  photo: modulePublicUrl(MODULE_SUBDOMAINS.photo),
  founder: modulePublicUrl(MODULE_SUBDOMAINS.founder),
  iskconDesk: modulePublicUrl(MODULE_SUBDOMAINS.iskcon, '/app/desk'),
  iskconLogin: modulePublicUrl(MODULE_SUBDOMAINS.iskcon, '/app/login'),
  credentials: modulePublicUrl(MODULE_SUBDOMAINS.credentials),
  admin: modulePublicUrl(MODULE_SUBDOMAINS.admin),
} as const;

/** Google OAuth callback URIs — register each hostname in Google Cloud Console. */
export function moduleOAuthRedirectUris(): string[] {
  const paths = ['/api/auth/google/callback'];
  const hosts = [
    MODULE_SUBDOMAINS.portal,
    MODULE_SUBDOMAINS.workforce,
    MODULE_SUBDOMAINS.vigilos,
    MODULE_SUBDOMAINS.quoteops,
    MODULE_SUBDOMAINS.quoter,
    MODULE_SUBDOMAINS.photo,
    MODULE_SUBDOMAINS.founder,
    MODULE_SUBDOMAINS.iskcon,
  ];
  const prod = hosts.flatMap((sub) => paths.map((p) => modulePublicUrl(sub, p).replace(/\/$/, '')));
  return [
    ...prod,
    'http://127.0.0.1:3010/api/auth/google/callback',
    'http://localhost:3010/api/auth/google/callback',
  ];
}
