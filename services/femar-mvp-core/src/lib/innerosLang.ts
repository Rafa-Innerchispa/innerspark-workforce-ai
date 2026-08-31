import type { InnerOSLang } from '@/lib/innerosCopy';

export const INNEROS_LANG_STORAGE_KEY = 'inneros.lang';
export const DEFAULT_INNEROS_LANG: InnerOSLang = 'en';

export function readStoredInnerOSLang(): InnerOSLang {
  if (typeof window === 'undefined') return DEFAULT_INNEROS_LANG;
  const stored = window.localStorage.getItem(INNEROS_LANG_STORAGE_KEY);
  return stored === 'es' || stored === 'en' ? stored : DEFAULT_INNEROS_LANG;
}

export function persistInnerOSLang(lang: InnerOSLang): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(INNEROS_LANG_STORAGE_KEY, lang);
}

export function toggleInnerOSLang(lang: InnerOSLang): InnerOSLang {
  return lang === 'en' ? 'es' : 'en';
}
