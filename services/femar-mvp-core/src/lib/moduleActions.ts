/** Canonical module action manifest — shared contract for ARIA + desk surfaces. */

export type ModuleActionStatus = 'LIVE' | 'PARTIAL' | 'NOT_READY';

export type ModuleActionDef = {
  id: string;
  moduleId: string;
  status: ModuleActionStatus;
  titleEn: string;
  titleEs: string;
  descEn: string;
  descEs: string;
  keywords: string[];
  /** Internal route or API path (never LAN IP in public manifests). */
  route?: string;
};

export const ISKCON_DESK_ACTIONS: ModuleActionDef[] = [
  {
    id: 'sponsors_list',
    moduleId: 'iskcon-desk',
    status: 'LIVE',
    titleEn: 'Sponsors & patrons',
    titleEs: 'Patrocinadores y devotos',
    descEn: 'View sponsor pipeline and Panihati patron records.',
    descEs: 'Ver pipeline de patrocinadores y registros Panihati.',
    keywords: ['sponsor', 'patrocin', 'patron', 'devoto'],
    route: '/api/ecosystem/module-actions?sponsor=list',
  },
  {
    id: 'food_for_life',
    moduleId: 'iskcon-desk',
    status: 'PARTIAL',
    titleEn: 'Food for Life',
    titleEs: 'Food for Life',
    descEn: 'Log meals served and generate FFL reports.',
    descEs: 'Registrar comidas servidas y generar reportes FFL.',
    keywords: ['food for life', 'ffl', 'comida', 'prasadam'],
  },
  {
    id: 'donations',
    moduleId: 'iskcon-desk',
    status: 'PARTIAL',
    titleEn: 'Donations & seva',
    titleEs: 'Donaciones y seva',
    descEn: 'Register offerings, pledges, and festival contributions.',
    descEs: 'Registrar ofrendas, promesas y aportes al festival.',
    keywords: ['donacion', 'donation', 'seva', 'ofrenda'],
  },
  {
    id: 'festivals',
    moduleId: 'iskcon-desk',
    status: 'PARTIAL',
    titleEn: 'Festivals & events',
    titleEs: 'Festivales y eventos',
    descEn: 'All festivals, milestones and devotee coordination.',
    descEs: 'Todos los festivales, hitos y coordinación de devotos.',
    keywords: ['festival', 'panihati', 'ratha', 'yatra'],
  },
  {
    id: 'yoga_education',
    moduleId: 'iskcon-desk',
    status: 'PARTIAL',
    titleEn: 'Workshops, yoga & education',
    titleEs: 'Talleres, yoga y educación',
    descEn: 'Class schedules and devotee education programs.',
    descEs: 'Horarios de clases y programas educativos.',
    keywords: ['yoga', 'taller', 'workshop', 'education', 'clase'],
  },
  {
    id: 'temple_ops',
    moduleId: 'iskcon-desk',
    status: 'NOT_READY',
    titleEn: 'Temple operations',
    titleEs: 'Operaciones del templo',
    descEn: 'Daily operations, schedules, and service assignments.',
    descEs: 'Operaciones diarias, horarios y asignaciones de servicio.',
    keywords: ['templo', 'temple', 'operacion', 'deity', 'deidad'],
  },
  {
    id: 'contacts',
    moduleId: 'iskcon-desk',
    status: 'PARTIAL',
    titleEn: 'Community contacts',
    titleEs: 'Contactos comunitarios',
    descEn: 'Devotee and community contact directory.',
    descEs: 'Directorio de devotos y contactos comunitarios.',
    keywords: ['contacto', 'contact', 'comunidad', 'devoto'],
  },
  {
    id: 'documents',
    moduleId: 'iskcon-desk',
    status: 'PARTIAL',
    titleEn: 'Documents & templates',
    titleEs: 'Documentos y plantillas',
    descEn: 'Letters, dossiers, and printable templates.',
    descEs: 'Cartas, dossiers y plantillas imprimibles.',
    keywords: ['documento', 'document', 'plantilla', 'template', 'vault'],
  },
  {
    id: 'letter_generate',
    moduleId: 'iskcon-desk',
    status: 'PARTIAL',
    titleEn: 'Generate letter',
    titleEs: 'Generar carta',
    descEn: 'Draft sponsor or devotee letters with ARIA.',
    descEs: 'Borrador de cartas a patrocinadores o devotos con ARIA.',
    keywords: ['carta', 'letter', 'escribe', 'write'],
  },
  {
    id: 'dossier_generate',
    moduleId: 'iskcon-desk',
    status: 'PARTIAL',
    titleEn: 'Dossier / presentation',
    titleEs: 'Dossier / presentación',
    descEn: 'Build sponsor dossiers and presentation briefs.',
    descEs: 'Armar dossiers y briefs de presentación.',
    keywords: ['dossier', 'presentacion', 'presentation', 'brief'],
  },
  {
    id: 'emergency_plan',
    moduleId: 'iskcon-desk',
    status: 'PARTIAL',
    titleEn: 'Emergency plan',
    titleEs: 'Plan de emergencia',
    descEn: 'Generate temple emergency response plans.',
    descEs: 'Generar planes de respuesta ante emergencias.',
    keywords: ['emergencia', 'emergency', 'plan', 'evacuacion'],
  },
  {
    id: 'budget_panihati',
    moduleId: 'iskcon-desk',
    status: 'LIVE',
    titleEn: 'Panihati budget',
    titleEs: 'Presupuesto Panihati',
    descEn: 'Festival budget tracking and expense reports.',
    descEs: 'Seguimiento de presupuesto y gastos del festival.',
    keywords: ['presupuesto', 'budget', 'gasto', 'expense'],
  },
  {
    id: 'tasks_calendar',
    moduleId: 'iskcon-desk',
    status: 'LIVE',
    titleEn: 'Tasks & calendar',
    titleEs: 'Tareas y calendario',
    descEn: 'Team tasks and festival calendar.',
    descEs: 'Tareas del equipo y calendario del festival.',
    keywords: ['tarea', 'task', 'calendario', 'calendar'],
  },
  {
    id: 'whatsapp_draft',
    moduleId: 'iskcon-desk',
    status: 'PARTIAL',
    titleEn: 'WhatsApp draft',
    titleEs: 'Borrador WhatsApp',
    descEn: 'Draft group messages for sponsors and devotees.',
    descEs: 'Borrador de mensajes para patrocinadores y devotos.',
    keywords: ['whatsapp', 'mensaje', 'message', 'grupo'],
  },
];

export function actionsForModule(moduleId: string): ModuleActionDef[] {
  if (moduleId === 'iskcon-desk') return ISKCON_DESK_ACTIONS;
  return [];
}

export function matchModuleAction(prompt: string, moduleId: string): ModuleActionDef | undefined {
  const lower = prompt.toLowerCase();
  const actions = actionsForModule(moduleId);
  return actions.find((a) => a.keywords.some((kw) => lower.includes(kw)));
}
