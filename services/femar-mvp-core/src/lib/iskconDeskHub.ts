import type { ModuleActionStatus } from '@/lib/moduleActions';

export type IskconSubAction = {
  id: string;
  titleEn: string;
  titleEs: string;
  descEn: string;
  descEs: string;
  status: ModuleActionStatus;
};

export type IskconHub = {
  id: string;
  actionId: string;
  icon: string;
  status: ModuleActionStatus;
  titleEn: string;
  titleEs: string;
  descEn: string;
  descEs: string;
  subActions: IskconSubAction[];
};

export const ISKCON_DESK_HUBS: IskconHub[] = [
  {
    id: 'sponsors',
    actionId: 'sponsors_list',
    icon: 'sponsors_list',
    status: 'LIVE',
    titleEn: 'Sponsors & patrons',
    titleEs: 'Patrocinadores y devotos',
    descEn: 'Registry, pipeline, letters and fundraising outreach.',
    descEs: 'Registro, pipeline, cartas y búsqueda de donaciones.',
    subActions: [
      { id: 'list', titleEn: 'View all sponsors', titleEs: 'Ver patrocinadores', descEn: 'Full sponsor and patron list.', descEs: 'Lista completa de patrocinadores y devotos.', status: 'LIVE' },
      { id: 'pipeline', titleEn: 'Sponsor pipeline', titleEs: 'Pipeline de patrocinio', descEn: 'Prospects by tier and status.', descEs: 'Prospectos por tier y estado.', status: 'LIVE' },
      { id: 'register', titleEn: 'Register sponsor', titleEs: 'Registrar patrocinador', descEn: 'Add a new sponsor record.', descEs: 'Agregar un nuevo patrocinador.', status: 'LIVE' },
      { id: 'letter', titleEn: 'Sponsor letter', titleEs: 'Carta a patrocinador', descEn: 'Draft outreach letter.', descEs: 'Borrador de carta de acercamiento.', status: 'PARTIAL' },
      { id: 'dossier', titleEn: 'Sponsor dossier', titleEs: 'Dossier patrocinio', descEn: 'Presentation brief for donors.', descEs: 'Brief de presentación para donantes.', status: 'PARTIAL' },
      { id: 'whatsapp', titleEn: 'WhatsApp draft', titleEs: 'Borrador WhatsApp', descEn: 'Group message for sponsors.', descEs: 'Mensaje grupal para patrocinadores.', status: 'PARTIAL' },
    ],
  },
  {
    id: 'food_for_life',
    actionId: 'food_for_life',
    icon: 'food_for_life',
    status: 'LIVE',
    titleEn: 'Food for Life',
    titleEs: 'Food for Life',
    descEn: 'Meals served, donors, reasons, schedules and weekly stats.',
    descEs: 'Comidas, donantes, causas, horarios y estadísticas semanales.',
    subActions: [
      { id: 'summary', titleEn: 'This week summary', titleEs: 'Resumen de la semana', descEn: 'Meals, people reached, donations.', descEs: 'Comidas, personas, donaciones.', status: 'LIVE' },
      { id: 'reasons', titleEn: 'Service categories', titleEs: 'Categorías de servicio', descEn: 'Medical, PI, street, community.', descEs: 'Médica, PI, calle, comunidad.', status: 'LIVE' },
      { id: 'donors', titleEn: 'Donors & helpers', titleEs: 'Donantes y ayudantes', descEn: 'Who donated and who serves.', descEs: 'Quién donó y quién ayuda.', status: 'LIVE' },
      { id: 'timeline', titleEn: 'Delivery timeline', titleEs: 'Historial de entregas', descEn: 'Recent meal distributions.', descEs: 'Entregas recientes de comida.', status: 'LIVE' },
      { id: 'schedules', titleEn: 'Weekly schedule', titleEs: 'Horarios semanales', descEn: 'Kitchen and route times.', descEs: 'Horarios de cocina y rutas.', status: 'LIVE' },
      { id: 'log_meal', titleEn: 'Log meals served', titleEs: 'Registrar comidas', descEn: 'Record today’s distribution.', descEs: 'Registrar entrega de hoy.', status: 'PARTIAL' },
    ],
  },
  {
    id: 'festivals',
    actionId: 'festivals',
    icon: 'festivals',
    status: 'LIVE',
    titleEn: 'Festivals & events',
    titleEs: 'Festivales y eventos',
    descEn: 'All festivals, milestones and devotee registration.',
    descEs: 'Todos los festivales, hitos e inscripciones.',
    subActions: [
      { id: 'all', titleEn: 'All festivals', titleEs: 'Todos los festivales', descEn: 'Panihati, Ratha, Janmashtami…', descEs: 'Panihati, Ratha, Janmashtami…', status: 'LIVE' },
      { id: 'panihati_2025', titleEn: 'Panihati 2025 (archive)', titleEs: 'Panihati 2025 (archivo)', descEn: 'Closed 2025 dossier — do not mix with 2026.', descEs: 'Expediente 2025 cerrado — no mezclar con 2026.', status: 'LIVE' },
      { id: 'panihati_2026', titleEn: 'Panihati 2026', titleEs: 'Panihati 2026', descEn: 'Planning, budget, sponsors (canonical 2026).', descEs: 'Planificación, presupuesto, sponsors (2026).', status: 'LIVE' },
      { id: 'expediente', titleEn: 'Festival dossier', titleEs: 'Expediente festival', descEn: 'Overview, timeline, budget, safety, docs…', descEs: 'Overview, timeline, presupuesto, seguridad, docs…', status: 'LIVE' },
      { id: 'emergency', titleEn: 'Emergency plan (PDF)', titleEs: 'Plan de emergencia (PDF)', descEn: 'Panihati 2026 safety plan — downloadable artifact.', descEs: 'Plan seguridad Panihati 2026 — artefacto descargable.', status: 'PARTIAL' },
      { id: 'budget', titleEn: 'Festival budget', titleEs: 'Presupuesto festival', descEn: 'Expenses, quotes and Notion tracking.', descEs: 'Gastos, cotizaciones y seguimiento en Notion.', status: 'LIVE' },
      { id: 'tasks', titleEn: 'Tasks & calendar', titleEs: 'Tareas y calendario', descEn: 'Team tasks per event (Notion).', descEs: 'Tareas del equipo por evento (Notion).', status: 'LIVE' },
      { id: 'search', titleEn: 'Search Panihati', titleEs: 'Buscar en Panihati', descEn: 'Search budget, sponsors and tasks.', descEs: 'Buscar presupuesto, sponsors y tareas.', status: 'LIVE' },
      { id: 'register', titleEn: 'Register expense', titleEs: 'Registrar gasto/cotización', descEn: 'Form + local storage on ISKCON Desk.', descEs: 'Formulario + almacenamiento local en ISKCON Desk.', status: 'LIVE' },
      { id: 'notion', titleEn: 'Notion (read-only ref)', titleEs: 'Notion (solo referencia)', descEn: 'Historical reference only — no writes.', descEs: 'Solo referencia histórica — sin escrituras.', status: 'PARTIAL' },
    ],
  },
  {
    id: 'yoga_education',
    actionId: 'yoga_education',
    icon: 'yoga_education',
    status: 'LIVE',
    titleEn: 'Workshops, yoga & education',
    titleEs: 'Talleres, yoga y educación',
    descEn: 'Classes, schedules and enrollment.',
    descEs: 'Clases, horarios e inscripciones.',
    subActions: [
      { id: 'classes', titleEn: 'All classes', titleEs: 'Todas las clases', descEn: 'Yoga, Gita study, children.', descEs: 'Yoga, estudio Gita, niños.', status: 'LIVE' },
      { id: 'schedule', titleEn: 'Weekly schedule', titleEs: 'Horario semanal', descEn: 'When each class meets.', descEs: 'Cuándo se reúne cada clase.', status: 'LIVE' },
      { id: 'enroll', titleEn: 'Enrollment', titleEs: 'Inscripciones', descEn: 'Capacity and enrolled count.', descEs: 'Capacidad e inscritos.', status: 'PARTIAL' },
      { id: 'campaign', titleEn: 'WhatsApp campaign', titleEs: 'Campaña WhatsApp', descEn: 'Outreach to devotees.', descEs: 'Difusión a devotos.', status: 'PARTIAL' },
    ],
  },
  {
    id: 'donations',
    actionId: 'donations',
    icon: 'donations',
    status: 'LIVE',
    titleEn: 'Donations & seva',
    titleEs: 'Donaciones y seva',
    descEn: 'Offerings, pledges and campaign totals.',
    descEs: 'Ofrendas, promesas y totales por campaña.',
    subActions: [
      { id: 'ledger', titleEn: 'Donation ledger', titleEs: 'Libro de donaciones', descEn: 'Confirmed and pending.', descEs: 'Confirmadas y pendientes.', status: 'LIVE' },
      { id: 'campaigns', titleEn: 'By campaign', titleEs: 'Por campaña', descEn: 'FFL, festivals, education.', descEs: 'FFL, festivales, educación.', status: 'LIVE' },
      { id: 'register', titleEn: 'Register donation', titleEs: 'Registrar donación', descEn: 'Log a new offering.', descEs: 'Registrar nueva ofrenda.', status: 'PARTIAL' },
    ],
  },
  {
    id: 'community',
    actionId: 'contacts',
    icon: 'contacts',
    status: 'PARTIAL',
    titleEn: 'Community & WhatsApp',
    titleEs: 'Comunidad y WhatsApp',
    descEn: 'Contacts, groups and message drafts.',
    descEs: 'Contactos, grupos y borradores.',
    subActions: [
      { id: 'contacts', titleEn: 'Contact directory', titleEs: 'Directorio contactos', descEn: 'Devotee and team contacts.', descEs: 'Contactos devotos y equipo.', status: 'PARTIAL' },
      { id: 'whatsapp', titleEn: 'WhatsApp draft', titleEs: 'Borrador WhatsApp', descEn: 'Message for devotee groups.', descEs: 'Mensaje para grupos devotos.', status: 'PARTIAL' },
      { id: 'import', titleEn: 'WhatsApp import', titleEs: 'Importar WhatsApp', descEn: 'Preview group export.', descEs: 'Preview exportación grupo.', status: 'PARTIAL' },
    ],
  },
  {
    id: 'documents',
    actionId: 'documents',
    icon: 'documents',
    status: 'PARTIAL',
    titleEn: 'Documents & plans',
    titleEs: 'Documentos y planes',
    descEn: 'Templates, dossiers and emergency plans.',
    descEs: 'Plantillas, dossiers y planes de emergencia.',
    subActions: [
      { id: 'templates', titleEn: 'Templates', titleEs: 'Plantillas', descEn: 'Letters and checklists.', descEs: 'Cartas y checklists.', status: 'PARTIAL' },
      { id: 'dossier', titleEn: 'Dossier', titleEs: 'Dossier', descEn: 'Presentation brief.', descEs: 'Brief de presentación.', status: 'PARTIAL' },
      { id: 'emergency', titleEn: 'Emergency plan', titleEs: 'Plan de emergencia', descEn: 'Temple response plan.', descEs: 'Plan respuesta templo.', status: 'PARTIAL' },
    ],
  },
];

export function hubById(hubId: string): IskconHub | undefined {
  return ISKCON_DESK_HUBS.find((h) => h.id === hubId);
}

export function subActionById(hubId: string, subActionId: string): IskconSubAction | undefined {
  return hubById(hubId)?.subActions.find((s) => s.id === subActionId);
}
