'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserCheck, Check, X, Shield, User } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ApprovalsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== 'superadmin') {
      router.push('/');
      return;
    }
    fetchPending();
  }, [user, router]);

  const fetchPending = async () => {
    try {
      const res = await fetch('/api/auth/pending');
      if (res.ok) {
        const data = await res.json();
        setPendingUsers(data.users || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (cedula: string, action: 'APPROVE' | 'REJECT', role?: string) => {
    try {
      const res = await fetch('/api/auth/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cedula, action, role })
      });
      if (res.ok) {
        fetchPending(); // Refresh list
      } else {
        alert('Error al procesar la solicitud');
      }
    } catch (e) {
      alert('Error de conexión');
    }
  };

  if (loading) {
    return <div className="p-8">Cargando aprobaciones...</div>;
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto w-full">
      <div className="flex flex-col gap-2 mb-8">
        <h1 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500 flex items-center gap-3">
          <UserCheck className="w-8 h-8 text-blue-500" />
          Aprobaciones Pendientes
        </h1>
        <p className="text-zinc-400">
          Revisa y aprueba las solicitudes de registro para las empresas.
        </p>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden border border-zinc-800">
        {pendingUsers.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">
            No hay solicitudes de registro pendientes en este momento.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-900/50 border-b border-zinc-800">
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Usuario</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Cédula</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Empresa</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {pendingUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-zinc-200">{u.name}</div>
                      <div className="text-xs text-zinc-500">{new Date(u.createdAt).toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 text-zinc-300 font-mono text-sm">{u.cedula}</td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full text-xs font-medium border border-blue-500/20 uppercase">
                        {u.companyId}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleAction(u.cedula, 'APPROVE', 'admin')}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-lg text-xs font-medium border border-green-500/20 transition-colors"
                          title="Aprobar como Administrador"
                        >
                          <Shield className="w-3.5 h-3.5" /> Admin
                        </button>
                        <button 
                          onClick={() => handleAction(u.cedula, 'APPROVE', 'employee')}
                          className="flex items-center gap-1 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg text-xs font-medium border border-blue-500/20 transition-colors"
                          title="Aprobar como Empleado Regular"
                        >
                          <User className="w-3.5 h-3.5" /> Empleado
                        </button>
                        <button 
                          onClick={() => handleAction(u.cedula, 'REJECT')}
                          className="flex items-center justify-center w-8 h-8 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/20 transition-colors ml-2"
                          title="Rechazar solicitud"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
