export function isSimpleGreeting(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return /^(hi|hello|hola|hol+a|hol[ñn]a|ola|hey|buenas|buenos|buen d[ií]a)[\s,!?.]*$/i.test(lower);
}

export function naturalGreetingText(lang: 'es' | 'en'): string {
  return lang === 'es'
    ? '¡Hola! Soy ARIA. Puedo ayudarte a revisar las pruebas del Judge o explicarte cómo trabaja InnerOS. ¿Qué quieres ver?'
    : 'Hi! I am ARIA. I can help you review the Judge tests or explain how InnerOS works. What would you like to see?';
}

export function newJudgeGreetingCorrelationId(): string {
  return `judge-aria-greeting-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
