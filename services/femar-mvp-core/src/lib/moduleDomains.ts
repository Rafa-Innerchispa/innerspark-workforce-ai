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


/** Canonical in-app landing paths for modules with a real UI in this app. */
export const MODULE_LANDING_PATHS: Record<string, string> = {
  'workforce-ai': '/modules',
  'iskcon-desk': '/app/desk',
  'inneros-admin': '/app/modules',
};

const HOST_MODULE_IDS: Record<string, string> = {
  [`${MODULE_SUBDOMAINS.workforce}.${PRIMARY_ZONE}`]: 'workforce-ai',
  [`www.${MODULE_SUBDOMAINS.workforce}.${PRIMARY_ZONE}`]: 'workforce-ai',
  [`${MODULE_SUBDOMAINS.iskcon}.${PRIMARY_ZONE}`]: 'iskcon-desk',
  [`www.${MODULE_SUBDOMAINS.iskcon}.${PRIMARY_ZONE}`]: 'iskcon-desk',
  [`${MODULE_SUBDOMAINS.admin}.${PRIMARY_ZONE}`]: 'inneros-admin',
  [`www.${MODULE_SUBDOMAINS.admin}.${PRIMARY_ZONE}`]: 'inneros-admin',
  [`${MODULE_SUBDOMAINS.portal}.${PRIMARY_ZONE}`]: 'inneros-admin',
  [`www.${MODULE_SUBDOMAINS.portal}.${PRIMARY_ZONE}`]: 'inneros-admin',
};

/** Returns a real landing path only when the module UI exists in this app. */
export function moduleLandingPathForId(moduleId: string): string | null {
  return MODULE_LANDING_PATHS[moduleId] || null;
}

/** Root requests on module hosts should land on a real module/shell route, not /app/login. */
export function moduleLandingPathForHost(host: string): string | null {
  const lower = host.toLowerCase();
  const normalized = lower in MODULE_HOST_ALIASES ? new URL(MODULE_HOST_ALIASES[lower]).hostname : lower;
  const moduleId = HOST_MODULE_IDS[normalized];
  if (moduleId) return moduleLandingPathForId(moduleId);
  if (normalized.endsWith(`.${PRIMARY_ZONE}`)) return '/app/modules';
  return null;
}

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
