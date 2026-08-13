'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { LayoutDashboard, Tags, Users, LogOut } from 'lucide-react';
import Link from 'next/link';

export default function ModulesPage() {
  const { user, activeCompanyId, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If not authenticated, go to login
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  if (!user) return null;

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col p-4 relative overflow-hidden bg-black text-white">
      {/* Background Effects */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-900/20 rounded-full blur-[120px] -z-10 animate-pulse-slow"></div>
      
      {/* Header */}
      <header className="w-full max-w-6xl mx-auto flex items-center justify-between py-6 px-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold text-lg shadow-lg shadow-blue-500/20">
            {user.name.charAt(0)}
          </div>
          <div>
            <h2 className="font-semibold text-lg">{user.name}</h2>
            <p className="text-zinc-400 text-sm">
              {user.role === 'superadmin' ? 'Super Administrador' : 'Administrador'} • {activeCompanyId?.toUpperCase()}
            </p>
          </div>
        </div>
        
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm font-medium hidden sm:inline">Cerrar Sesión</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-6xl mx-auto flex flex-col items-center justify-center px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
            Selecciona un Módulo
          </h1>
          <p className="text-zinc-400 max-w-lg mx-auto">
            Bienvenido a InnerSpark Workforce AI. Selecciona el módulo al que deseas acceder según tu suscripción activa.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl mx-auto">
          {/* Module 1: Workforce Management (Always available) */}
          <Link 
            href="/"
            className="group relative overflow-hidden rounded-3xl p-8 bg-zinc-900/50 border border-zinc-800 hover:border-blue-500/50 transition-all duration-300 hover:shadow-[0_0_40px_rgba(59,130,246,0.15)] hover:-translate-y-1"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-purple-600 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
            
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Users className="w-8 h-8 text-blue-400" />
            </div>
            
            <h3 className="text-2xl font-bold mb-3 text-white group-hover:text-blue-400 transition-colors">
              Control de Personal
            </h3>
            <p className="text-zinc-400 leading-relaxed mb-6">
              Gestión de asistencia, roles de pago, novedades, horas extras y marcación remota con IA.
            </p>
            
            <div className="flex items-center text-blue-400 font-medium text-sm">
              <span>Ingresar al módulo</span>
              <svg className="w-4 h-4 ml-2 group-hover:translate-x-2 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </div>
          </Link>

          {/* Module 2: Tags Sales (Only for IA PRO or SuperAdmin) */}
          {(activeCompanyId === 'iapro' || user.role === 'superadmin') && (
            <Link 
              href="/tags"
              className="group relative overflow-hidden rounded-3xl p-8 bg-zinc-900/50 border border-zinc-800 hover:border-emerald-500/50 transition-all duration-300 hover:shadow-[0_0_40px_rgba(16,185,129,0.15)] hover:-translate-y-1"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-600 to-teal-600 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
              
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Tags className="w-8 h-8 text-emerald-400" />
              </div>
              
              <h3 className="text-2xl font-bold mb-3 text-white group-hover:text-emerald-400 transition-colors">
                Control y Venta de Tags
              </h3>
              <p className="text-zinc-400 leading-relaxed mb-6">
                Gestión de inventario de tags, punto de venta (POS) y control de clientes vinculados.
              </p>
              
              <div className="flex items-center text-emerald-400 font-medium text-sm">
                <span>Ingresar al módulo</span>
                <svg className="w-4 h-4 ml-2 group-hover:translate-x-2 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </div>
            </Link>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto py-6 px-4 text-center">
        <p className="text-zinc-500 text-sm">
          &copy; {new Date().getFullYear()} InnerSpark Workforce AI.
        </p>
      </footer>
    </div>
  );
}
