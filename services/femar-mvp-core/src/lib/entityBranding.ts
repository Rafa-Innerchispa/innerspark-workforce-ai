export type EntityBrandId = 'pcdoctor' | 'femar' | 'iapro' | 'iskcon' | 'hackathon' | 'innerspark_labs' | string;

export interface EntityBrand {
  id: EntityBrandId;
  displayName: string;
  tagline: string;
  logoPath: string;
  accentFrom: string;
  accentTo: string;
  loginHost?: string;
}

export const ENTITY_BRANDS: Record<string, EntityBrand> = {
  pcdoctor: {
    id: 'pcdoctor',
    displayName: 'PC Doctor AI',
    tagline: 'InnerOS · Todos los módulos',
    logoPath: '/brands/pcdoctor.svg',
    accentFrom: 'from-blue-500',
    accentTo: 'to-purple-600',
  },
  femar: {
    id: 'femar',
    displayName: 'FEMAR',
    tagline: 'Workforce AI',
    logoPath: '/brands/femar.svg',
    accentFrom: 'from-emerald-500',
    accentTo: 'to-teal-600',
  },
  iapro: {
    id: 'iapro',
    displayName: 'IA PRO',
    tagline: 'Workforce AI',
    logoPath: '/brands/iapro.svg',
    accentFrom: 'from-violet-500',
    accentTo: 'to-indigo-600',
  },
  iskcon: {
    id: 'iskcon',
    displayName: 'ISKCON Guayaquil',
    tagline: 'Panihati 2026 · Sponsor Desk',
    logoPath: '/brands/iskcon.svg',
    accentFrom: 'from-orange-500',
    accentTo: 'to-amber-600',
    loginHost: 'inneros.iskconguayaquil.org',
  },
  hackathon: {
    id: 'hackathon',
    displayName: 'Hackathon Demo',
    tagline: 'Acceso evaluadores',
    logoPath: '/brands/inneros.svg',
    accentFrom: 'from-blue-500',
    accentTo: 'to-purple-600',
  },
};

const HOST_ENTITY: Record<string, EntityBrandId> = {
  'inneros.creatorcore.ai': 'pcdoctor',
  'www.inneros.creatorcore.ai': 'pcdoctor',
  'inneros.pcdoctor.ai': 'pcdoctor',
  'www.inneros.pcdoctor.ai': 'pcdoctor',
  'inneros.iskconguayaquil.org': 'iskcon',
  'www.inneros.iskconguayaquil.org': 'iskcon',
};

export function resolveBrandFromHost(host: string | null | undefined): EntityBrand {
  const key = (host || '').split(':')[0].toLowerCase();
  const entityId = HOST_ENTITY[key] || 'pcdoctor';
  return ENTITY_BRANDS[entityId] || ENTITY_BRANDS.pcdoctor;
}

export function resolveBrandFromCompany(companyId: string | null | undefined): EntityBrand {
  const id = (companyId || 'pcdoctor').toLowerCase();
  return ENTITY_BRANDS[id] || ENTITY_BRANDS.pcdoctor;
}
