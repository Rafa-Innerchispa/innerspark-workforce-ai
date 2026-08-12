'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Fingerprint, LogIn, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [cedula, setCedula] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      if (user.role === 'admin') {
        router.push('/');
      } else {
        router.push('/mobile');
      }
    }
  }, [user, isLoading, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!cedula.trim() || !password) {
      setError('Por favor ingresa tu número de cédula y contraseña');
      return;
    }

    login(cedula.trim(), password).then((success) => {
      if (!success) {
        setError('Credenciales inválidas o cuenta inactiva. Verifica tus datos.');
      }
    });
  };

  if (isLoading || user) {
    return <div className="min-h-[100dvh] flex items-center justify-center"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] -z-10 animate-pulse-slow"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] -z-10 animate-pulse-slow" style={{ animationDelay: '2s' }}></div>

      <div className="w-full max-w-md glass-card rounded-3xl p-8 shadow-2xl border border-zinc-800/50 backdrop-blur-xl animate-in fade-in zoom-in duration-500 relative overflow-hidden">
        {/* Subtle top highlight */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>
        
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 mb-4 shadow-[0_0_30px_rgba(59,130,246,0.3)]">
            <Fingerprint className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-2">
            Workforce AI
          </h1>
          <p className="text-zinc-400 text-sm">
            Sistema Inteligente de Gestión de Fuerza Laboral
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="cedula" className="block text-sm font-medium text-zinc-300 mb-2">
              Número de Cédula
            </label>
            <div className="relative group">
              <input
                id="cedula"
                type="text"
                value={cedula}
                onChange={(e) => setCedula(e.target.value)}
                className="w-full bg-zinc-900/50 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all group-hover:border-zinc-600"
                placeholder="Ej. 1717016487"
                autoComplete="off"
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-zinc-300 mb-2">
              Contraseña
            </label>
            <div className="relative group">
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-900/50 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all group-hover:border-zinc-600"
                placeholder="Ingresa tu contraseña"
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
            <span>Ingresar al Sistema</span>
          </button>
          
          <div className="text-center mt-4">
            <span className="text-sm text-zinc-400">¿No tienes cuenta? </span>
            <a href="/register" className="text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors">
              Regístrate aquí
            </a>
          </div>
        </form>

        <div className="mt-8 text-center text-xs text-zinc-500">
          <p>&copy; {new Date().getFullYear()} Workforce AI. Todos los derechos reservados.</p>
        </div>
      </div>
    </div>
  );
}
