'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, UserPlus, AlertCircle } from 'lucide-react';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    cedula: '',
    name: '',
    password: '',
    companyId: 'femar'
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    
    if (!formData.cedula || !formData.name || !formData.password) {
      setStatus('error');
      setMessage('Todos los campos son obligatorios');
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      
      if (res.ok) {
        setStatus('success');
        setMessage('Registro exitoso. Tu cuenta debe ser aprobada por el administrador.');
        setTimeout(() => router.push('/login'), 4000);
      } else {
        setStatus('error');
        setMessage(data.message || 'Error al registrarse');
      }
    } catch (err) {
      setStatus('error');
      setMessage('Error de conexión');
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] -z-10 animate-pulse-slow"></div>
      
      <div className="w-full max-w-md glass-card rounded-3xl p-8 shadow-2xl border border-zinc-800/50 backdrop-blur-xl animate-in fade-in zoom-in duration-500 relative overflow-hidden">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 mb-4">
            <UserPlus className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-2">
            Crear Cuenta
          </h1>
          <p className="text-zinc-400 text-sm">
            Solicita acceso al sistema Workforce AI
          </p>
        </div>

        {status === 'success' ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/30">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">¡Solicitud Enviada!</h3>
            <p className="text-zinc-400 text-sm">Serás redirigido al login en unos segundos...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Cédula</label>
              <input
                type="text"
                value={formData.cedula}
                onChange={e => setFormData({...formData, cedula: e.target.value})}
                className="w-full bg-zinc-900/50 border border-zinc-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="1717016487"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Nombre Completo</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full bg-zinc-900/50 border border-zinc-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Juan Pérez"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Contraseña</label>
              <input
                type="password"
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
                className="w-full bg-zinc-900/50 border border-zinc-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Crea una contraseña"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Empresa</label>
              <select
                value={formData.companyId}
                onChange={e => setFormData({...formData, companyId: e.target.value})}
                className="w-full bg-zinc-900/50 border border-zinc-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
              >
                <option value="femar">FEMAR S.A.</option>
                <option value="iapro">IA PRO</option>
                <option value="pcdoctor">PC DOCTOR</option>
              </select>
            </div>

            {status === 'error' && (
              <div className="flex items-center gap-2 text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/20 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>{message}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 px-4 rounded-xl shadow-lg transition-colors mt-4 disabled:opacity-50"
            >
              {status === 'loading' ? 'Procesando...' : 'Registrarse'}
            </button>
            
            <div className="text-center mt-4">
              <a href="/login" className="text-sm text-zinc-400 hover:text-white transition-colors">
                Volver al Login
              </a>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
