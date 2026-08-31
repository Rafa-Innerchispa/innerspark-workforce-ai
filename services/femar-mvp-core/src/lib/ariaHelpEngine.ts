import type { EcosystemModule } from '@/lib/ecosystemModules';

export type AriaLocalReply = {
  text: string;
  navigate?: { module_id: string; url: string };
  source: 'local';
};

function statusLabel(status: EcosystemModule['status'], lang: 'es' | 'en'): string {
  if (status === 'LIVE') return lang === 'es' ? 'Disponible' : 'Available';
  if (status === 'BETA') return 'Beta';
  return lang === 'es' ? 'Próximamente' : 'Coming soon';
}

function moduleLine(mod: EcosystemModule, lang: 'es' | 'en'): string {
  const st = statusLabel(mod.status, lang);
  const hint = mod.agentHint ? ` — ${mod.agentHint}` : '';
  return `• ${mod.name} (${st}): ${mod.description}${hint}`;
}

export function buildModuleHelpCatalog(
  modules: EcosystemModule[],
  lang: 'es' | 'en',
  mode: 'guest' | 'authenticated'
): string {
  if (modules.length === 0) {
    return lang === 'es'
      ? 'No tienes módulos asignados todavía. Contacta al administrador.'
      : 'You have no assigned modules yet. Contact your administrator.';
  }

  const intro =
    lang === 'es'
      ? mode === 'guest'
        ? 'Soy ARIA, la guía de InnerOS. Módulos del ecosistema (tras iniciar sesión solo verás los de tu empresa):'
        : 'Soy ARIA. Módulos disponibles para tu cuenta:'
      : mode === 'guest'
        ? 'I am ARIA, your InnerOS guide. Ecosystem modules (after sign-in you only see your tenant modules):'
        : 'I am ARIA. Modules available for your account:';

  const lines = modules.map((m) => moduleLine(m, lang)).join('\n');

  const footer =
    lang === 'es'
      ? '\n\nComandos: escribe workforce, visitantes, cotizaciones o quoteops para abrir. Escribe ayuda para ver esta lista.\nPendientes: «guarda esto como pendiente: …» · «cuáles son los pendientes».'
      : '\n\nTips: type workforce, visitors, quotes or quoteops to open. Type help for this list.\nPending: «save this as pending: …» · «what are my pending items».';

  return `${intro}\n\n${lines}${footer}`;
}

function wantsHelpCatalog(lower: string): boolean {
  return (
    /\b(ayuda|help|modulos|módulos|modules|menu|menú|que puedes|qué puedes|que haces|qué haces|opciones|catalogo|catálogo)\b/.test(
      lower
    ) || lower === '?' || lower === 'hola ayuda'
  );
}

function findModuleMatch(lower: string, modules: EcosystemModule[]): EcosystemModule | undefined {
  return modules.find((m) => {
    const id = m.id.replace(/-/g, ' ');
    const name = m.name.toLowerCase();
    return (
      lower.includes(m.id) ||
      lower.includes(id) ||
      name.split(' ').some((w) => w.length > 4 && lower.includes(w)) ||
      (m.id === 'workforce-ai' &&
        (lower.includes('workforce') ||
          lower.includes('nomina') ||
          lower.includes('nómina') ||
          lower.includes('empleado') ||
          lower.includes('payroll'))) ||
      (m.id === 'visitors' &&
        (lower.includes('visitor') || lower.includes('visit') || lower.includes('garita') || lower.includes('vigil'))) ||
      (m.id === 'smart-quoter' && (lower.includes('cotiz') || lower.includes('quoter') || lower.includes('presupuesto'))) ||
      (m.id === 'quoteops' && lower.includes('quoteops')) ||
      (m.id === 'founderos' && lower.includes('founder')) ||
      (m.id === 'iskcon-desk' && lower.includes('iskcon')) ||
      (m.id === 'credentials' && (lower.includes('credential') || lower.includes('credencial'))) ||
      (m.id === 'inneros-admin' && (lower.includes('admin') || lower.includes('ops')))
    );
  });
}

function explainModule(mod: EcosystemModule, lang: 'es' | 'en', authenticated: boolean): string {
  const st = statusLabel(mod.status, lang);
  const openHint =
    authenticated && mod.entryUrl
      ? lang === 'es'
        ? '\n\n¿Quieres que lo abra? Escribe "abrir ' + mod.name.split(' ')[0].toLowerCase() + '".'
        : '\n\nWant me to open it? Type "open ' + mod.name.split(' ')[0].toLowerCase() + '".'
      : lang === 'es'
        ? '\n\nInicia sesión para acceder.'
        : '\n\nSign in to access it.';

  return lang === 'es'
    ? `${mod.name} (${st})\n${mod.description}${mod.agentHint ? `\nUso típico: ${mod.agentHint}.` : ''}${openHint}`
    : `${mod.name} (${st})\n${mod.description}${mod.agentHint ? `\nTypical use: ${mod.agentHint}.` : ''}${openHint}`;
}

function wantsExplain(lower: string): boolean {
  return /\b(que es|qué es|explica|explain|para que|para qué|como funciona|cómo funciona|info|informacion|información)\b/.test(
    lower
  );
}

function wantsOpen(lower: string): boolean {
  return /\b(abrir|open|ir a|llévame|llevame|entrar|mostrar|ver)\b/.test(lower);
}

export function tryConversationalFallback(
  prompt: string,
  lang: 'es' | 'en',
  moduleId?: string
): AriaLocalReply | null {
  const lower = prompt.toLowerCase().trim();
  if (!lower) return null;

  if (/c[oó]mo est[aá]s|how are you|qu[eé] tal|buen d[ií]a|buenas tardes|buenas noches/.test(lower)) {
    return {
      source: 'local',
      text:
        lang === 'es'
          ? '¡Bien, gracias! Soy ARIA. ¿Quieres abrir un módulo, ver patrocinadores ISKCON o que te explique qué puedo hacer? Escribe ayuda.'
          : 'I am well, thank you! I am ARIA. Want to open a module, see ISKCON sponsors, or see what I can do? Type help.',
    };
  }

  if (/gracias|thank you|thanks/.test(lower)) {
    return {
      source: 'local',
      text: lang === 'es' ? 'Con gusto. ¿Seguimos con otro módulo o acción?' : 'You are welcome. Shall we continue with another module or action?',
    };
  }

  if (moduleId === 'iskcon-desk' && lower.length >= 3) {
    return {
      source: 'local',
      text:
        lang === 'es'
          ? 'Puedo ayudarte con patrocinadores, Food for Life, festivales y Panihati 2026 (datos locales).\n\nPrueba:\n• "resumen presupuesto panihati"\n• "buscar sonido panihati"\n• "registrar gasto carpas 400 usd"\n• Menú Festivales → Registrar gasto/cotización (formulario)\n• "lista patrocinadores"'
          : 'I can help with sponsors, Food for Life, festivals, and Panihati 2026 (local data).\n\nTry:\n• "panihati budget summary"\n• "search sound panihati"\n• "register expense tents 400 usd"\n• Festivals menu → Register expense/quote (form)\n• "list sponsors"',
    };
  }

  if (lower.length >= 4 && lower.length <= 120) {
    return {
      source: 'local',
      text:
        lang === 'es'
          ? 'Te escucho. Escribe ayuda para ver módulos, o dime workforce, visitantes, cotizaciones, quoteops o ISKCON.'
          : 'I hear you. Type help for modules, or say workforce, visitors, quotes, quoteops, or ISKCON.',
    };
  }

  return null;
}

export function tryLocalAriaReply(
  prompt: string,
  lang: 'es' | 'en',
  allowedModules: EcosystemModule[],
  mode: 'guest' | 'authenticated',
  moduleId?: string
): AriaLocalReply | null {
  const lower = prompt.toLowerCase().trim();
  if (!lower) return null;

  const conversational = tryConversationalFallback(prompt, lang, moduleId);
  if (conversational) return conversational;

  if (/^(hi|hello|hola|hey|buenas|buenos)[\s,!?.]*$/i.test(lower)) {
    return {
      source: 'local',
      text:
        lang === 'es'
          ? '¡Hola! Soy ARIA. Escribe ayuda para ver todos los módulos con explicación, o el nombre de uno (workforce, visitantes, cotizaciones…).'
          : 'Hello! I am ARIA. Type help for the full module guide, or a module name (workforce, visitors, quotes…).',
    };
  }

  if (wantsHelpCatalog(lower)) {
    return {
      source: 'local',
      text: buildModuleHelpCatalog(allowedModules, lang, mode),
    };
  }

  const hit = findModuleMatch(lower, allowedModules);

  if (hit && (wantsOpen(lower) || (mode === 'authenticated' && hit.entryUrl && !wantsExplain(lower)))) {
    if (mode === 'guest' || !hit.entryUrl) {
      return {
        source: 'local',
        text: explainModule(hit, lang, false),
      };
    }
    return {
      source: 'local',
      text:
        lang === 'es'
          ? `Te llevo a ${hit.name}. ${hit.description}`
          : `Opening ${hit.name}. ${hit.description}`,
      navigate: { module_id: hit.id, url: hit.entryUrl },
    };
  }

  if (hit && (wantsExplain(lower) || lower.length > 8)) {
    return {
      source: 'local',
      text: explainModule(hit, lang, mode === 'authenticated'),
    };
  }

  if (hit && mode === 'authenticated' && hit.entryUrl) {
    return {
      source: 'local',
      text: lang === 'es' ? `¿Abro ${hit.name}?` : `Open ${hit.name}?`,
      navigate: { module_id: hit.id, url: hit.entryUrl },
    };
  }

  if (hit) {
    return { source: 'local', text: explainModule(hit, lang, mode === 'authenticated') };
  }

  return tryConversationalFallback(prompt, lang, moduleId);
}

/** Use Gemini only for conversational follow-ups, not for help/catalog keywords. */
export function shouldUseGemini(prompt: string, localMatched: boolean): boolean {
  if (localMatched) return false;
  const lower = prompt.toLowerCase().trim();
  if (wantsHelpCatalog(lower)) return false;
  if (lower.length < 4) return false;
  return true;
}
