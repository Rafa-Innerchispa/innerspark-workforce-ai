'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserCheck, Check, X, Shield, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { idTypesForCountry, type IdType } from '@/lib/identityDocument';

const COMPANIES = [
  { id: 'pcdoctor', label: 'PC Doctor AI' },
  { id: 'femar', label: 'FEMAR S.A.' },
  { id: 'iapro', label: 'IA Pro / Innerchispa' },
  { id: 'innerspark_labs', label: 'InnerSpark Labs' },
  { id: 'iskcon', label: 'ISKCON Guayaquil' },
  { id: 'hackathon', label: 'Hackathon / demo' },
];

type PendingUser = {
  id: string;
  name: string;
  email?: string;
  cedula?: string;
  idNumber?: string;
  idType?: IdType;
  documentCountry?: string;
  phone?: string;
  companyId: string;
  companyRequest?: { type: string; slug: string; displayName: string };
  authProvider?: string;
  createdAt: string;
};

function idTypeLabel(country: string | undefined, idType: IdType | undefined): string {
  if (!country || !idType) return idType || '—';
  const match = idTypesForCountry(country).find((o) => o.value === idType);
  return match?.labelEs || idType;
}

function formatDocument(u: PendingUser): string {
  const number = u.idNumber || u.cedula || '—';
  if (u.documentCountry && u.idType) {
    return `${u.documentCountry} · ${idTypeLabel(u.documentCountry, u.idType)} · ${number}`;
  }
  return number;
}

export default function ApprovalsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [companyByUser, setCompanyByUser] = useState<Record<string, string>>({});
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
        const users: PendingUser[] = data.users || [];
        setPendingUsers(users);
        setCompanyByUser(
          Object.fromEntries(
            users.map((u) => [
              u.id,
              u.companyId?.startsWith('pending:')
                ? u.companyRequest?.slug || u.companyId.replace(/^pending:/, '')
                : u.companyId || 'pcdoctor',
            ])
          )
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (userId: string, action: 'APPROVE' | 'REJECT', role?: string) => {
    try {
      const res = await fetch('/api/auth/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          action,
          role,
          companyId: companyByUser[userId],
        }),
      });
      if (res.ok) {
        fetchPending();
      } else {
        alert('Error al procesar la solicitud');
      }
    } catch {
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
          Revisa y aprueba las solicitudes de registro. Puedes corregir la empresa antes de aprobar; los módulos se asignan según tenant + rol.
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
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Correo</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Documento</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Teléfono</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Empresa (asignar)</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {pendingUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-zinc-200">{u.name}</div>
                      <div className="text-xs text-zinc-500">
                        {u.authProvider === 'google' ? 'Google · ' : ''}
                        {new Date(u.createdAt).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-zinc-400 text-sm">{u.email || '—'}</td>
                    <td className="px-6 py-4 text-zinc-300 font-mono text-xs leading-relaxed max-w-[220px]">
                      {formatDocument(u)}
                    </td>
                    <td className="px-6 py-4 text-zinc-400 text-sm">{u.phone || '—'}</td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-zinc-400 mb-2">
                        {u.companyRequest?.type === 'new_tenant' ? (
                          <span className="text-amber-400">Nueva empresa: </span>
                        ) : u.companyRequest ? (
                          <span>Solicita: </span>
                        ) : null}
                        {u.companyRequest?.displayName || u.companyId}
                      </div>
                      <select
                        value={companyByUser[u.id] || u.companyId.replace(/^pending:/, '')}
                        onChange={(e) =>
                          setCompanyByUser((prev) => ({ ...prev, [u.id]: e.target.value }))
                        }
                        className="bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-zinc-200 w-full max-w-[180px]"
                      >
                        {COMPANIES.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label}
                          </option>
                        ))}
                        {u.companyRequest?.type === 'new_tenant' && (
                          <option value={u.companyRequest.slug}>{u.companyRequest.displayName} (nuevo)</option>
                        )}
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleAction(u.id, 'APPROVE', 'admin')}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-lg text-xs font-medium border border-green-500/20 transition-colors"
                          title="Aprobar como Administrador"
                        >
                          <Shield className="w-3.5 h-3.5" /> Admin
                        </button>
                        <button
                          onClick={() => handleAction(u.id, 'APPROVE', 'employee')}
                          className="flex items-center gap-1 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg text-xs font-medium border border-blue-500/20 transition-colors"
                          title="Aprobar como Empleado Regular"
                        >
                          <User className="w-3.5 h-3.5" /> Empleado
                        </button>
                        <button
                          onClick={() => handleAction(u.id, 'REJECT')}
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
