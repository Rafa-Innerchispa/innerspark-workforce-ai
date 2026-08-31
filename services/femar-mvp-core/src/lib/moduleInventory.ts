import { MODULE_PUBLIC_URLS } from '@/lib/moduleDomains';
import { ECOSYSTEM_MODULES } from '@/lib/ecosystemModules';
import { ENTITY_DEFAULT_MODULES } from '@/lib/entityEntitlements';

export type ModuleInventoryEntry = {
  id: string;
  name: string;
  status: 'LIVE' | 'BETA' | 'PARTIAL' | 'NOT_READY' | 'ARCHIVE';
  tenantScoped: boolean;
  entryUrl: string | null;
  publicUrl?: string | null;
  corePath?: string | null;
  dataStore?: string;
  auth: string;
  tenantIsolation: 'enforced' | 'partial' | 'none' | 'pending';
  notes: string;
  relatedModules?: string[];
};

/** Inventario verificable para auditoría ChatGPT/Codex — honesto, sin mocks. */
export const MODULE_INVENTORY: ModuleInventoryEntry[] = [
  {
    id: 'workforce-ai',
    name: 'InnerSpark Workforce AI',
    status: 'LIVE',
    tenantScoped: true,
    entryUrl: MODULE_PUBLIC_URLS.workforce,
    publicUrl: MODULE_PUBLIC_URLS.workforce,
    corePath: '/home/rlopez/inneros/inneros_core/workspaces/innerspark-workforce-ai/services/femar-mvp-core',
    dataStore: 'Firestore (users, employees, devices)',
    auth: 'session_token cookie + RBAC',
    tenantIsolation: 'partial',
    notes: 'Producto comercial principal. Backend workforce APIs en endurecimiento RBAC.',
  },
  {
    id: 'iskcon-desk',
    name: 'ISKCON Sponsor Desk',
    status: 'LIVE',
    tenantScoped: true,
    entryUrl: MODULE_PUBLIC_URLS.iskconDesk,
    publicUrl: MODULE_PUBLIC_URLS.iskconDesk,
    corePath: '/home/rlopez/inneros/inneros_core/modules/iskcon-desk',
    dataStore: 'Mongo + imports WhatsApp',
    auth: 'InnerOS session + entity iskcon',
    tenantIsolation: 'partial',
    notes: 'Parser WhatsApp + API imports; tests 2/2 PASS.',
  },
  {
    id: 'visitors',
    name: 'VigilOS Visitors',
    status: 'LIVE',
    tenantScoped: true,
    entryUrl: MODULE_PUBLIC_URLS.vigilos,
    publicUrl: MODULE_PUBLIC_URLS.vigilos,
    corePath: '/home/rlopez/inneros/inneros_core/modules/visitors',
    dataStore: 'SQLite/Postgres module-local',
    auth: 'module-local',
    tenantIsolation: 'partial',
    notes: 'Garita/visitantes; no confundir con VigilOS seguridad completo (NOT_READY).',
  },
  {
    id: 'fieldspark-photography',
    name: 'FieldSpark Photography Studio',
    status: 'PARTIAL',
    tenantScoped: true,
    entryUrl: MODULE_PUBLIC_URLS.photo,
    publicUrl: MODULE_PUBLIC_URLS.photo,
    corePath: '/home/rlopez/inneros/inneros_core/modules/smart-quoter',
    dataStore: 'MongoDB pcdoctor_swarm (missions/quotes)',
    auth: 'InnerOS session handoff + module gate',
    tenantIsolation: 'pending',
    notes:
      'Subdominio photo.creatorcore.ai. Vertical fotografía: smart-quoter + quoteops (Joshua Degel).',
    relatedModules: ['smart-quoter', 'quoteops'],
  },
  {
    id: 'smart-quoter',
    name: 'InnerSpark Smart Quoter',
    status: 'BETA',
    tenantScoped: true,
    entryUrl: MODULE_PUBLIC_URLS.quoter,
    publicUrl: MODULE_PUBLIC_URLS.quoter,
    corePath: '/home/rlopez/inneros/inneros_core/modules/smart-quoter',
    dataStore: 'MongoDB',
    auth: 'InnerOS session handoff + module gate',
    tenantIsolation: 'pending',
    notes: 'Subdominio quoter.creatorcore.ai.',
    relatedModules: ['fieldspark-photography'],
  },
  {
    id: 'quoteops',
    name: 'QuoteOps Cockpit',
    status: 'LIVE',
    tenantScoped: true,
    entryUrl: MODULE_PUBLIC_URLS.quoteops,
    publicUrl: MODULE_PUBLIC_URLS.quoteops,
    corePath: '/home/rlopez/inneros/inneros_core/modules/quoteops',
    dataStore: 'MongoDB',
    auth: 'InnerOS session handoff + module gate',
    tenantIsolation: 'partial',
    notes: 'Subdominio quoteops.creatorcore.ai.',
    relatedModules: ['fieldspark-photography'],
  },
  {
    id: 'founderos',
    name: 'FounderOS',
    status: 'BETA',
    tenantScoped: false,
    entryUrl: MODULE_PUBLIC_URLS.founder,
    publicUrl: MODULE_PUBLIC_URLS.founder,
    corePath: '/home/rlopez/inneros/inneros_core/modules/founderos',
    dataStore: 'MongoDB',
    auth: 'owner-only',
    tenantIsolation: 'none',
    notes: 'Panel fundador; acceso restringido a superadmin/owner.',
  },
  {
    id: 'credentials',
    name: 'Credentials Vault',
    status: 'NOT_READY',
    tenantScoped: true,
    entryUrl: null,
    publicUrl: MODULE_PUBLIC_URLS.credentials,
    corePath: '/home/rlopez/inneros/inneros_core/platform/inneros_core_runtime/owner_vault.py',
    dataStore: 'Mongo owner_vault + Secret Manager',
    auth: 'server-side only',
    tenantIsolation: 'enforced',
    notes: 'Sin UI web tenant; owner_vault server-side.',
  },
  {
    id: 'inneros-admin',
    name: 'InnerOS Ops Center',
    status: 'LIVE',
    tenantScoped: false,
    entryUrl: MODULE_PUBLIC_URLS.admin,
    publicUrl: MODULE_PUBLIC_URLS.admin,
    corePath: '/home/rlopez/inneros/inneros_core/platform',
    dataStore: 'Mongo coordination',
    auth: 'LAN + superadmin',
    tenantIsolation: 'none',
    notes: 'Fleet/MCP ops panel :2002.',
  },
  {
    id: 'a2a-gateway',
    name: 'A2A Agent Gateway',
    status: 'NOT_READY',
    tenantScoped: false,
    entryUrl: null,
    corePath: '/home/rlopez/inneros/inneros_core/modules/a2a-gateway',
    dataStore: 'n/a',
    auth: 'team only',
    tenantIsolation: 'none',
    notes: 'Solo README; registry reparado en platform.',
  },
  {
    id: 'vigilos-security',
    name: 'VigilOS Security (full)',
    status: 'NOT_READY',
    tenantScoped: true,
    entryUrl: null,
    publicUrl: null,
    corePath: null,
    dataStore: 'pending evidence',
    auth: 'pending',
    tenantIsolation: 'pending',
    notes: 'NO asumir hasta evidencia. Visitors es subconjunto garita, no VigilOS completo.',
    relatedModules: ['visitors'],
  },
];

export function inventoryForUser(allowedIds: string[]) {
  return MODULE_INVENTORY.filter(
    (m) => allowedIds.includes(m.id) || m.relatedModules?.some((r) => allowedIds.includes(r))
  );
}

export function entityPolicySummary() {
  return {
    primary_zone: 'creatorcore.ai',
    entity_defaults: ENTITY_DEFAULT_MODULES,
    rules: {
      pcdoctor_admin: 'all authorized modules (company pcdoctor or superadmin)',
      femar: 'workforce-ai only',
      iapro: 'workforce-ai only',
      iskcon: 'iskcon-desk (+ explicit modules on user)',
      hackathon: 'explicit modules on user doc only',
      vigilos: 'NOT_READY until evidence',
    },
    portal_modules: ECOSYSTEM_MODULES.map((m) => ({ id: m.id, status: m.status })),
  };
}
