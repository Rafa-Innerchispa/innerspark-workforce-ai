import { MODULE_PUBLIC_URLS } from '@/lib/moduleDomains';

export type EcosystemModuleStatus = 'LIVE' | 'NOT_READY' | 'BETA';

export interface EcosystemModule {
  id: string;
  name: string;
  description: string;
  status: EcosystemModuleStatus;
  icon: string;
  entryUrl: string | null;
  publicUrl?: string;
  tenantScoped: boolean;
  agentHint?: string;
  corePath?: string;
}

/** Catálogo canónico — cada módulo tiene subdominio propio en creatorcore.ai */
export const ECOSYSTEM_MODULES: EcosystemModule[] = [
  {
    id: 'workforce-ai',
    name: 'InnerSpark Workforce AI',
    description: 'Asistencia, horarios, ZKTeco/Hikvision, prepayroll, reportes y ARIA Gemini.',
    status: 'LIVE',
    icon: 'users',
    entryUrl: MODULE_PUBLIC_URLS.workforce,
    publicUrl: MODULE_PUBLIC_URLS.workforce,
    tenantScoped: true,
    corePath: '/home/rlopez/inneros/inneros_core/workspaces/innerspark-workforce-ai',
    agentHint: 'nómina, empleados, marcaciones, dispositivos biométricos',
  },
  {
    id: 'iskcon-desk',
    name: 'ISKCON Sponsor Desk',
    description: 'Patrocinadores Panihati, cartas, dossiers y captura WhatsApp (piloto Guayaquil).',
    status: 'LIVE',
    icon: 'iskcon',
    entryUrl: MODULE_PUBLIC_URLS.iskconDesk,
    publicUrl: MODULE_PUBLIC_URLS.iskconDesk,
    tenantScoped: true,
    corePath: '/home/rlopez/inneros/inneros_core/modules/iskcon-desk',
    agentHint: 'patrocinadores, Panihati, cartas, dossier, ISKCON',
  },
  {
    id: 'visitors',
    name: 'VigilOS Visitors',
    description: 'Garita, visitantes, QR, roles lobby/garita, bridge Hikvision ISAPI.',
    status: 'LIVE',
    icon: 'visitor',
    entryUrl: MODULE_PUBLIC_URLS.vigilos,
    publicUrl: MODULE_PUBLIC_URLS.vigilos,
    tenantScoped: true,
    corePath: '/home/rlopez/inneros/inneros_core/modules/visitors',
    agentHint: 'visitantes, garita, acceso, registro de entrada',
  },
  {
    id: 'fieldspark-photography',
    name: 'FieldSpark Photography Studio',
    description:
      'Vertical estudio fotográfico — smart-quoter + quoteops (Joshua Degel, RAW/JPG, 6 fases comerciales).',
    status: 'BETA',
    icon: 'quote',
    entryUrl: MODULE_PUBLIC_URLS.photo,
    publicUrl: MODULE_PUBLIC_URLS.photo,
    tenantScoped: true,
    corePath: '/home/rlopez/inneros/inneros_core/modules/smart-quoter',
    agentHint: 'FieldSpark, estudio fotográfico, Joshua Degel, sesión foto',
  },
  {
    id: 'smart-quoter',
    name: 'InnerSpark Smart Quoter',
    description: 'Cotizaciones con audio — vertical estudio fotográfico (Joshua Degel) y comercial.',
    status: 'BETA',
    icon: 'quote',
    entryUrl: MODULE_PUBLIC_URLS.quoter,
    publicUrl: MODULE_PUBLIC_URLS.quoter,
    tenantScoped: true,
    corePath: '/home/rlopez/inneros/inneros_core/modules/smart-quoter',
    agentHint: 'cotizar, presupuesto, catálogo, estudio fotográfico',
  },
  {
    id: 'quoteops',
    name: 'QuoteOps Cockpit',
    description: 'Flujo comercial completo: misiones, WhatsApp, MCP, FEMAR y foto.',
    status: 'LIVE',
    icon: 'quote',
    entryUrl: MODULE_PUBLIC_URLS.quoteops,
    publicUrl: MODULE_PUBLIC_URLS.quoteops,
    tenantScoped: true,
    corePath: '/home/rlopez/inneros/inneros_core/modules/quoteops',
    agentHint: 'cotización comercial, misión quoteops',
  },
  {
    id: 'founderos',
    name: 'FounderOS',
    description: 'Panel fundador, métricas, memoria diaria y decisiones estratégicas.',
    status: 'BETA',
    icon: 'founder',
    entryUrl: MODULE_PUBLIC_URLS.founder,
    publicUrl: MODULE_PUBLIC_URLS.founder,
    tenantScoped: false,
    corePath: '/home/rlopez/inneros/inneros_core/modules/founderos',
    agentHint: 'métricas fundador, decisiones estratégicas',
  },
  {
    id: 'credentials',
    name: 'Credentials Vault',
    description: 'Identidad y credenciales por empresa (server-side).',
    status: 'NOT_READY',
    icon: 'key',
    entryUrl: null,
    publicUrl: MODULE_PUBLIC_URLS.credentials,
    tenantScoped: true,
    agentHint: 'credenciales, vault, identidad',
  },
  {
    id: 'inneros-admin',
    name: 'InnerOS Admin (equipo)',
    description: 'Panel ops interno — fleet, MCP, servicios (:2002).',
    status: 'LIVE',
    icon: 'admin',
    entryUrl: MODULE_PUBLIC_URLS.admin,
    publicUrl: MODULE_PUBLIC_URLS.admin,
    tenantScoped: false,
    corePath: '/home/rlopez/inneros/inneros_core/platform',
    agentHint: 'operaciones internas, servicios, infra',
  },
  {
    id: 'a2a-gateway',
    name: 'A2A Agent Gateway',
    description: 'Fabric A2A v1 — enrutamiento multi-agente (solo equipo técnico).',
    status: 'NOT_READY',
    icon: 'admin',
    entryUrl: null,
    tenantScoped: false,
    corePath: '/home/rlopez/inneros/inneros_core/modules/a2a-gateway',
    agentHint: 'agentes A2A, fabric, routing',
  },
];
