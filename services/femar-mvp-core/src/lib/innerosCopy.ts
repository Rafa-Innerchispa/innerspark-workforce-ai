export type InnerOSLang = 'en' | 'es';

export const INNEROS_BRAND = {
  name: 'InnerOS',
  logoPath: '/brands/inneros.svg',
  accentFrom: 'from-blue-500',
  accentTo: 'to-purple-600',
} as const;

export const innerosCopy = {
  en: {
    login: {
      headline: 'The operating layer',
      headlineAccent: 'for your business.',
      subline:
        'Sign in once. Step into workforce, visitors, quotes, and every module your company runs — privately, by tenant.',
      signIn: 'Sign in',
      username: 'Username or ID',
      password: 'Password',
      google: 'Continue with Google',
      googleError: 'Google sign-in failed. Ask your admin to authorize this domain in Google Console.',
      googleRedirectHint: 'Redirect URI mismatch — register this site callback in Google Cloud OAuth.',
      invalid: 'Invalid credentials',
      required: 'Enter username and password',
      footer: 'InnerOS',
    },
    modules: {
      title: 'Choose your module',
      subtitle: 'Each product opens in its own workspace. Your data stays isolated by company.',
      open: 'Open',
      soon: 'Coming soon',
      beta: 'Beta',
      workspace: 'Workspace',
    },
    aria: {
      label: 'ARIA',
      subtitle: 'Gemini assistant',
      welcome:
        "I'm ARIA. Tell me what you need — workforce, visitors, quotes — and I'll guide you or open the right module after you sign in.",
      placeholder: 'Try: open workforce · register a visitor · start a quote…',
      thinking: 'Thinking…',
      guestReply:
        "Sign in first and I'll take you there. You can also use username/password above, then ask me again from your workspace.",
      basicReply: 'Try workforce, visitors, quoter, or quoteops — or sign in for full assistance.',
      openModule: 'Open module',
      hello: 'Hello! Once you sign in, I can route you to any module your company uses.',
    },
  },
  es: {
    login: {
      headline: 'La capa operativa',
      headlineAccent: 'de tu empresa.',
      subline:
        'Un solo acceso. Entra a workforce, visitantes, cotizaciones y cada módulo que tu empresa usa — aislado por tenant.',
      signIn: 'Ingresar',
      username: 'Usuario o cédula',
      password: 'Contraseña',
      google: 'Continuar con Google',
      googleError: 'Falló el inicio con Google. Autoriza este dominio en Google Console.',
      googleRedirectHint: 'Redirect URI mismatch — registra el callback de este sitio en OAuth de Google.',
      invalid: 'Credenciales inválidas',
      required: 'Ingresa usuario y contraseña',
      footer: 'InnerOS',
    },
    modules: {
      title: 'Elige tu módulo',
      subtitle: 'Cada producto abre en su propio espacio. Tus datos quedan aislados por empresa.',
      open: 'Abrir',
      soon: 'Próximamente',
      beta: 'Beta',
      workspace: 'Espacio',
    },
    aria: {
      label: 'ARIA',
      subtitle: 'Asistente Gemini',
      welcome:
        'Soy ARIA. Dime qué necesitas — workforce, visitantes, cotizaciones — y te guío o abro el módulo correcto después de iniciar sesión.',
      placeholder: 'Ej.: abrir workforce · registrar visitante · cotizar…',
      thinking: 'Pensando…',
      guestReply:
        'Inicia sesión primero y te llevo. También puedes usar usuario/contraseña arriba y preguntarme de nuevo en tu espacio.',
      basicReply: 'Prueba workforce, visitantes, cotizador o quoteops — o inicia sesión para ayuda completa.',
      openModule: 'Abrir módulo',
      hello: '¡Hola! Cuando inicies sesión podré llevarte a cualquier módulo de tu empresa.',
    },
  },
} as const;

export function t(lang: InnerOSLang) {
  return innerosCopy[lang];
}

/** Redirect URIs Rafael must register in Google Cloud Console → OAuth client */
export const GOOGLE_OAUTH_REDIRECT_URIS = [
  'https://inneros.creatorcore.ai/api/auth/google/callback',
  'https://inneros.pcdoctor.ai/api/auth/google/callback',
  'https://inneros.iskconguayaquil.org/api/auth/google/callback',
  'http://127.0.0.1:3010/api/auth/google/callback',
  'http://localhost:3010/api/auth/google/callback',
];
