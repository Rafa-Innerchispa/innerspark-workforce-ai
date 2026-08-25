'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { UserCheck, X, Shield, User, Users } from 'lucide-react';

type PendingUser = {
  id: string; cedula?: string; name?: string; companyId?: string; requestedCompanyId?: string;
  createdAt?: string; email?: string;
};

export default function ApprovalsPage() {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPending = useCallback(async () => {
    try {
      setError('');
      const res = await fetch('/api/auth/pending');
      if (res.status === 401 || res.status === 403) {
        setError('Tu sesión no tiene permisos para aprobar usuarios.');
        setPendingUsers([]);
        return;
      }
      if (!res.ok) throw new Error('No se pudo cargar la cola de aprobaciones');
      const data = await res.json();
      setPendingUsers(data.users || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de carga');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchPending(); }, [fetchPending]);

  const handleAction = async (cedula: string, action: 'APPROVE' | 'REJECT', role?: string) => {
    const res = await fetch('/api/auth/approve', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cedula, action, role })
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.message || data.error || 'No se pudo procesar la solicitud');
      return;
    }
    await fetchPending();
  };

  return <main className="p-4 md:p-8 max-w-6xl mx-auto w-full flex flex-col gap-6">
    <div><div className="text-xs tracking-[.25em] text-blue-400 font-bold">WORKFORCE • GOVERNANCE</div>
      <h1 className="text-3xl font-bold text-white mt-2 flex items-center gap-3"><UserCheck className="w-8 h-8 text-blue-500"/> Aprobaciones de acceso</h1>
      <p className="text-zinc-400 mt-2">El servidor decide qué tenant y roles puedes aprobar. La interfaz no puede ampliar tus permisos.</p>
    </div>

    {error && <div className="border border-amber-500/30 bg-amber-500/10 text-amber-200 rounded-xl p-3">{error}</div>}

    <div className="glass-card rounded-2xl overflow-hidden border border-zinc-800">
      {loading ? <div className="p-12 text-zinc-500">Cargando aprobaciones...</div> : pendingUsers.length === 0 ?
        <div className="p-12 text-center text-zinc-500"><Users className="w-8 h-8 mx-auto mb-3 opacity-50"/>No hay solicitudes pendientes visibles para tu ámbito.</div> :
        <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="bg-zinc-900/50 border-b border-zinc-800"><th className="px-6 py-4 text-xs text-zinc-400">USUARIO</th><th className="px-6 py-4 text-xs text-zinc-400">IDENTIDAD</th><th className="px-6 py-4 text-xs text-zinc-400">TENANT SOLICITADO</th><th className="px-6 py-4 text-xs text-zinc-400">DECISIÓN</th></tr></thead>
        <tbody className="divide-y divide-zinc-800/50">{pendingUsers.map(u => { const cedula = u.cedula || u.id; const tenant = u.requestedCompanyId || u.companyId || 'Sin asignar'; return <tr key={u.id} className="hover:bg-white/5"><td className="px-6 py-4"><div className="font-medium text-zinc-200">{u.name || 'Usuario pendiente'}</div><div className="text-xs text-zinc-500">{u.email || ''}</div></td><td className="px-6 py-4 font-mono text-sm">{cedula}</td><td className="px-6 py-4"><span className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full text-xs border border-blue-500/20">{tenant}</span></td><td className="px-6 py-4"><div className="flex flex-wrap gap-2"><button onClick={()=>handleAction(cedula,'APPROVE','tenant_admin')} className="px-3 py-1.5 bg-green-500/10 text-green-400 rounded-lg text-xs border border-green-500/20 flex items-center gap-1"><Shield className="w-3.5 h-3.5"/> Admin</button><button onClick={()=>handleAction(cedula,'APPROVE','employee')} className="px-3 py-1.5 bg-blue-500/10 text-blue-400 rounded-lg text-xs border border-blue-500/20 flex items-center gap-1"><User className="w-3.5 h-3.5"/> Empleado</button><button onClick={()=>handleAction(cedula,'REJECT')} className="w-8 h-8 bg-red-500/10 text-red-400 rounded-lg border border-red-500/20 flex items-center justify-center"><X className="w-4 h-4"/></button></div></td></tr>; })}</tbody></table></div>}
    </div>
  </main>;
}
