/** Panihati 2026 — Notion database IDs and canonical festival facts. */

export const PANIHATI_NOTION = {
  hubPageId: '376cb2de-eb0f-8177-875a-c8ccf4654ef6',
  hubUrl: 'https://www.notion.so/02-4-10-Proyecto-Panihati-2026-376cb2deeb0f8177875ac8ccf4654ef6',
  databases: {
    budget: '948cf4b2-d89e-4cf6-b5cf-74b5b53b81c8',
    sponsors: '79e6b51f-9713-4947-825d-463a002f332a',
    tasks: '4d9107ed-ea03-4914-b895-51769920f75d',
    volunteers: '2200fea3-7aae-4e83-bf54-acbc3bcd890b',
  },
} as const;

export const PANIHATI_2026_FACTS = {
  name: 'Festival Panihati 2026',
  date: '2026-09-26',
  time: '15:00 – 21:00',
  venue: 'Parque Víctor Emilio Estrada (Urdesa), Guayaquil',
  budgetTargetUsd: 3500,
  attendeesTarget: 2000,
  fflMealsTarget: 1200,
  email: 'info@iskconguayaquil.org',
  donationAccounts: [
    'Banco Bolivariano #0845037320 — Sylvia Palacios García',
    'Produbanco #12017083554 — Sylvia Palacios García',
    'Zelle/PayPal: sarvasakti@hotmail.com',
  ],
  budgetLines: [
    { concepto: 'Carpas + sillas + mesas', categoria: 'Logistica', min: 350, max: 450, notas: 'DASE puede donar → $0' },
    { concepto: 'Tarima / escenario', categoria: 'Logistica', min: 400, max: 600, notas: 'DASE cotizar primero' },
    { concepto: 'Sonido y luces', categoria: 'Sonido y luces', min: 200, max: 350, notas: 'René Parlantes' },
    { concepto: 'Transporte logístico', categoria: 'Transporte', min: 80, max: 120, notas: 'Raul FFL' },
    { concepto: 'Ingredientes FFL 1,200 platos', categoria: 'Alimentacion FFL', min: 400, max: 600, notas: 'Donaciones en especie reducen costo' },
    { concepto: 'Decoración + materiales', categoria: 'Otros', min: 100, max: 150, notas: '' },
    { concepto: 'Fotografía / video', categoria: 'Fotografia', min: 150, max: 300, notas: 'Sebastián Manta' },
    { concepto: 'Diseño gráfico + marketing', categoria: 'Marketing', min: 0, max: 100, notas: 'Rafael + IA' },
    { concepto: 'Permisos / DASE', categoria: 'Permisos', min: 0, max: 0, notas: 'Marilyn contacto establecido' },
    { concepto: 'Imprevisto 15%', categoria: 'Otros', min: 200, max: 300, notas: '' },
  ],
} as const;

export type PanihatiBudgetEntryInput = {
  concepto: string;
  tipo: 'Gasto' | 'Ingreso' | 'Donacion' | 'Especie';
  categoria?: string;
  montoEstimado?: number;
  montoReal?: number;
  proveedor?: string;
  estado?: 'Estimado' | 'Cotizado' | 'Pagado' | 'Donado';
  notas?: string;
};

export type PanihatiSponsorEntryInput = {
  nombre: string;
  tipo?: 'Empresa' | 'Devoto' | 'Organizacion' | 'Internacional';
  nivel?: string;
  montoUsd?: number;
  contacto?: string;
  telefono?: string;
  email?: string;
  estado?: string;
  notas?: string;
};
