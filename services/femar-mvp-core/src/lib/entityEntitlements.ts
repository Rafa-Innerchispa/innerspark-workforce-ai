export type EntityId = 'pcdoctor' | 'femar' | 'iapro' | 'hackathon' | 'iskcon' | 'innerspark_labs' | string;

export type ModuleId =
  | 'workforce-ai'
  | 'smart-quoter'
  | 'quoteops'
  | 'visitors'
  | 'iskcon-desk'
  | 'credentials'
  | 'founderos'
  | 'inneros-admin'
  | 'a2a-gateway'
  | 'fieldspark-photography';

const ALL_MODULES: ModuleId[] = [
  'workforce-ai',
  'smart-quoter',
  'quoteops',
  'visitors',
  'iskcon-desk',
  'credentials',
  'founderos',
  'inneros-admin',
  'a2a-gateway',
  'fieldspark-photography',
];

/** Módulos visibles por defecto si no hay lista explícita en el usuario. */
export const ENTITY_DEFAULT_MODULES: Record<string, ModuleId[] | 'all'> = {
  pcdoctor: ['workforce-ai', 'inneros-admin'],
  innerspark_labs: ['workforce-ai', 'smart-quoter', 'quoteops', 'visitors', 'fieldspark-photography'],
  femar: ['workforce-ai'],
  iapro: ['workforce-ai'],
  iskcon: ['iskcon-desk'],
};

export function resolveAllowedModuleIds(
  companyId: string | null | undefined,
  role: string | null | undefined,
  explicitModules?: string[] | null
): ModuleId[] {
  const cid = (companyId || '').toLowerCase();

  if ((cid === 'pcdoctor' || cid === 'ent_pcdoctor') && (role === 'superadmin' || role === 'admin')) {
    return ALL_MODULES;
  }

  if (cid === 'femar' || cid === 'iapro') return ['workforce-ai'];

  if (explicitModules?.length) {
    return explicitModules.filter((m): m is ModuleId => ALL_MODULES.includes(m as ModuleId));
  }

  // Hackathon/demo: sólo módulos explícitos en el doc usuario; fallback mínimo
  if (cid === 'hackathon') return ['workforce-ai'];

  const base = ENTITY_DEFAULT_MODULES[cid];
  if (base === 'all') return ALL_MODULES;
  if (base) return base;
  return ['workforce-ai'];
}

export function canAccessModule(
  companyId: string | null | undefined,
  role: string | null | undefined,
  moduleId: string,
  explicitModules?: string[] | null
): boolean {
  return resolveAllowedModuleIds(companyId, role, explicitModules).includes(moduleId as ModuleId);
}

export const HACKATHON_DEMO_USERS: Record<
  string,
  { name: string; role: 'admin' | 'superadmin'; companyId: EntityId }
> = {
  'HACKATHON-JUDGE': { name: 'Hackathon Judge', role: 'admin', companyId: 'hackathon' },
  'DEVPOST-JUDGE': { name: 'XPRIZE Judge', role: 'admin', companyId: 'hackathon' },
};

export const ISKCON_DEMO_USERS: Record<
  string,
  { name: string; role: 'admin' | 'superadmin'; companyId: EntityId; modules: ModuleId[] }
> = {
  'ISKCON-ADMIN': {
    name: 'Admin ISKCON Guayaquil',
    role: 'admin',
    companyId: 'iskcon',
    modules: ['iskcon-desk', 'workforce-ai', 'visitors'],
  },
  'ISKCON-SPONSOR': {
    name: 'Patrocinador ISKCON',
    role: 'admin',
    companyId: 'iskcon',
    modules: ['iskcon-desk'],
  },
  'ISKCON-VOLUNTEER': {
    name: 'Voluntario ISKCON',
    role: 'admin',
    companyId: 'iskcon',
    modules: ['iskcon-desk'],
  },
};
