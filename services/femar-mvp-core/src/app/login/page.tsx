'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Fingerprint, LogIn, AlertCircle, Phone, Mail, Globe, Sparkles, Languages } from 'lucide-react';

export default function LoginPage() {
  const [cedula, setCedula] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [lang, setLang] = useState<'en' | 'es'>('en');
  const { login, user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      if (user.role === 'admin' || user.role === 'superadmin') {
        router.push('/modules');
      } else {
        router.push('/mobile');
      }
    }
  }, [user, isLoading, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!cedula.trim() || !password) {
      setError(lang === 'en' ? 'Please enter your ID and password' : 'Por favor ingresa tu número de documento y contraseña');
      return;
    }

    login(cedula.trim(), password).then((success) => {
      if (!success) {
        setError(lang === 'en' ? 'Invalid credentials or inactive account. Verify your data.' : 'Credenciales inválidas o cuenta inactiva. Verifica tus datos.');
      }
    });
  };

  const toggleLang = () => setLang(prev => prev === 'en' ? 'es' : 'en');

  if (isLoading || user) {
    return <div className="min-h-[100dvh] flex items-center justify-center bg-zinc-950"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  const t = {
    en: {
      eco: 'Technology Ecosystem',
      title1: 'Powering the future of your company with ',
      title2: 'Artificial Intelligence',
      desc: 'Workforce AI is part of the ecosystem of advanced solutions developed to optimize operations and talent management.',
      consulting: 'Consulting and custom technological development.',
      smart: 'Smart solutions for support and infrastructure.',
      subtitle: 'Intelligent Workforce Management System',
      id: 'National ID / Document',
      idPlace: 'Ex. DEVPOST-JUDGE or Passport',
      pass: 'Password',
      passPlace: 'Enter your password',
      loginBtn: 'Enter System',
      noAccount: "Don't have an account? ",
      register: 'Register here',
      rights: 'All rights reserved.'
    },
    es: {
      eco: 'Ecosistema Tecnológico',
      title1: 'Potenciando el futuro de tu empresa con ',
      title2: 'Inteligencia Artificial',
      desc: 'Workforce AI es parte del ecosistema de soluciones avanzadas desarrolladas para optimizar operaciones y gestión de talento.',
      consulting: 'Consultoría y desarrollo tecnológico a medida.',
      smart: 'Soluciones inteligentes para soporte e infraestructura.',
      subtitle: 'Sistema Inteligente de Gestión de Fuerza Laboral',
      id: 'Cédula / Documento',
      idPlace: 'Ej. DEVPOST-JUDGE o Pasaporte',
      pass: 'Contraseña',
      passPlace: 'Ingresa tu contraseña',
      loginBtn: 'Ingresar al Sistema',
      noAccount: '¿No tienes cuenta? ',
      register: 'Regístrate aquí',
      rights: 'Todos los derechos reservados.'
    }
  }[lang];

  return (
    <div className="min-h-[100dvh] w-full flex relative overflow-hidden bg-zinc-950">
      <button 
        onClick={toggleLang}
        className="absolute top-4 right-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-800/50 border border-zinc-700 hover:bg-zinc-700/50 text-zinc-300 text-sm font-medium transition-colors"
      >
        <Languages className="w-4 h-4" />
        {lang === 'en' ? 'Español' : 'English'}
      </button>
      
      {/* Left side: Branding */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between p-12 relative overflow-hidden border-r border-zinc-800/50 bg-zinc-900/20">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop')] bg-cover bg-center opacity-10 mix-blend-luminosity"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/10 via-zinc-950/80 to-zinc-950"></div>
        
        <div className="relative z-10 animate-in fade-in slide-in-from-left-8 duration-700">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-8">
            <Sparkles className="w-4 h-4" /> {t.eco}
          </div>
          <h1 className="text-4xl xl:text-5xl font-bold text-white mb-6 leading-tight">
            {t.title1} <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">{t.title2}</span>
          </h1>
          <p className="text-zinc-400 text-lg max-w-md">
            {t.desc}
          </p>
        </div>

        <div className="relative z-10 flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200 fill-mode-both">
          <div className="grid grid-cols-2 gap-8">
            <div className="flex flex-col gap-2 p-4 rounded-2xl bg-zinc-800/30 border border-zinc-700/30 backdrop-blur-sm hover:bg-zinc-800/50 transition-colors">
              <h3 className="text-white font-semibold text-lg">Innerchispa</h3>
              <p className="text-zinc-400 text-sm">{t.consulting}</p>
              <a href="https://www.innerchispa.us" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm mt-2 transition-colors">
                <Globe className="w-4 h-4" /> www.innerchispa.us
              </a>
            </div>
            <div className="flex flex-col gap-2 p-4 rounded-2xl bg-zinc-800/30 border border-zinc-700/30 backdrop-blur-sm hover:bg-zinc-800/50 transition-colors">
              <h3 className="text-white font-semibold text-lg">PC Doctor AI</h3>
              <p className="text-zinc-400 text-sm">{t.smart}</p>
              <a href="https://www.pcdoctor.ai" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm mt-2 transition-colors">
                <Globe className="w-4 h-4" /> www.pcdoctor.ai
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Right side: Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 relative">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] -z-10 animate-pulse-slow"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] -z-10 animate-pulse-slow" style={{ animationDelay: '2s' }}></div>

        <div className="w-full max-w-md glass-card rounded-3xl p-8 shadow-2xl border border-zinc-800/50 backdrop-blur-xl animate-in fade-in zoom-in duration-500 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>
          
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 mb-4 shadow-[0_0_30px_rgba(59,130,246,0.3)]">
              <Fingerprint className="w-8 h-8 text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-2">
            InnerSpark Workforce AI
          </h1>
            <p className="text-zinc-400 text-sm">{t.subtitle}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="cedula" className="block text-sm font-medium text-zinc-300 mb-2">
                {t.id}
              </label>
              <div className="relative group">
                <input
                  id="cedula"
                  type="text"
                  value={cedula}
                  onChange={(e) => setCedula(e.target.value)}
                  className="w-full bg-zinc-900/50 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all group-hover:border-zinc-600"
                  placeholder={t.idPlace}
                  autoComplete="off"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-300 mb-2">
                {t.pass}
              </label>
              <div className="relative group">
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-zinc-900/50 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all group-hover:border-zinc-600"
                  placeholder={t.passPlace}
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/20 text-sm animate-in shake">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 group"
            >
              <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              <span>{t.loginBtn}</span>
            </button>
            
            <div className="text-center mt-4">
              <span className="text-sm text-zinc-400">{t.noAccount}</span>
              <a href="/register" className="text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors">
                {t.register}
              </a>
            </div>
          </form>

          <div className="mt-8 text-center text-xs text-zinc-500">
          <p>&copy; {new Date().getFullYear()} InnerSpark Workforce AI. {t.rights}</p>
        </div>
        </div>
      </div>
    </div>
  );
}
