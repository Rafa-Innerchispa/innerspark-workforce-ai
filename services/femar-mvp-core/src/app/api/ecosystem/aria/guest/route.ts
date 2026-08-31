import { NextResponse } from 'next/server';
import { ECOSYSTEM_MODULES } from '@/lib/ecosystemModules';
import { innerosCopy, type InnerOSLang } from '@/lib/innerosCopy';
import { tryLocalAriaReply } from '@/lib/ariaHelpEngine';

function pickLang(raw: unknown): InnerOSLang {
  return raw === 'es' ? 'es' : 'en';
}

export async function POST(req: Request) {
  try {
    const { prompt, lang: rawLang } = await req.json();
    const lang = pickLang(rawLang);
    const copy = innerosCopy[lang].aria;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ text: copy.welcome, source: 'local' });
    }

    const local = tryLocalAriaReply(prompt, lang, ECOSYSTEM_MODULES, 'guest');
    if (local) {
      return NextResponse.json({ text: local.text, source: local.source, hint_module: local.navigate?.module_id });
    }

    return NextResponse.json({
      text:
        lang === 'es'
          ? 'Inicia sesión para abrir módulos. Mientras tanto escribe ayuda para ver qué hace cada uno (workforce, visitantes, cotizaciones…).'
          : 'Sign in to open modules. Meanwhile type help to see what each one does (workforce, visitors, quotes…).',
      source: 'local',
    });
  } catch {
    return NextResponse.json({ text: innerosCopy.en.aria.welcome, source: 'local' });
  }
}
