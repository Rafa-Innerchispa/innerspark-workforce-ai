'use client';

import React from 'react';
import { Tags, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function TagsModulePage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6 flex flex-col items-center justify-center">
      <div className="w-full max-w-md text-center">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 mb-8 animate-pulse-slow">
          <Tags className="w-12 h-12 text-emerald-400" />
        </div>
        
        <h1 className="text-3xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-400">
          Módulo de Venta de Tags
        </h1>
        
        <p className="text-zinc-400 mb-8 leading-relaxed">
          Este módulo está actualmente en desarrollo. Pronto podrás gestionar inventario, ventas y clientes de tags desde aquí.
        </p>
        
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl mb-8">
          <p className="text-sm font-medium text-zinc-300">Usuario Activo: <span className="text-white">{user?.name}</span></p>
          <p className="text-xs text-zinc-500 mt-1">Empresa: {user?.companyId?.toUpperCase()}</p>
        </div>

        <Link 
          href="/modules"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-medium transition-colors border border-zinc-700"
        >
          <ArrowLeft className="w-5 h-5" />
          Volver a Módulos
        </Link>
      </div>
    </div>
  );
}
