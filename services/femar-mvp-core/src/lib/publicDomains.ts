/** Dominios públicos canónicos — alineado con config/domains/hackathon-urls.yaml */

export const PRIMARY_ZONE = 'creatorcore.ai';

export const HACKATHON_URLS = {
  portalLogin: 'https://inneros.creatorcore.ai/app/login',
  portalModules: 'https://inneros.creatorcore.ai/app/modules',
  workforce: 'https://workforce.creatorcore.ai/',
  visitors: 'https://visitors.creatorcore.ai/',
  iskconLogin: 'https://inneros.iskconguayaquil.org/app/login',
  iskconDesk: 'https://inneros.iskconguayaquil.org/desk',
} as const;

/** Hostnames que enrutan al shell InnerOS (/app/login) */
export const INNEROS_SHELL_HOSTS = new Set([
  'inneros.creatorcore.ai',
  'www.inneros.creatorcore.ai',
  'inneros.pcdoctor.ai',
  'www.inneros.pcdoctor.ai',
  'inneros.iskconguayaquil.org',
  'www.inneros.iskconguayaquil.org',
]);

export const ISKCON_HOSTS = new Set([
  'inneros.iskconguayaquil.org',
  'www.inneros.iskconguayaquil.org',
]);
