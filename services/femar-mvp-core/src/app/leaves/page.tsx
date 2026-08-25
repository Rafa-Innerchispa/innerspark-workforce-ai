"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Check, Clock3, Plus, ShieldCheck, X } from 'lucide-react';
import GlassWidget from '@/components/GlassWidget';

type LeaveRequest = {
  id: string;
  employeeId: string;
  employeeName: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  payTreatment: 'paid' | 'unpaid' | 'policy_defined';
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  createdAt: string;
};

const leaveTypes = [
  ['VACATION','Vacaciones'],['MEDICAL','Médico'],['PERSONAL','Personal'],['BEREAVEMENT','Duelo'],
  ['MATERNITY','Maternidad'],['PATERNITY','Paternidad'],['STUDY','Estudios'],['CALAMITY','Calamidad'],
  ['PAID_OTHER','Otro remunerado'],['UNPAID','No remunerado'],['OTHER','Otro'],
];

export default function LeavesPage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ employeeId:'', type:'VACATION', startDate:'', endDate:'', reason:'', payTreatment:'policy_defined' });

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/leaves');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudieron cargar los permisos');
      setRequests(data.requests || []);
    } catch (e) { setError(e instanceof Error ? e.message : 'Error de carga'); }
    finally { setLoading(false); }
  };
  useEffect(()=>{ void load(); },[]);

  const createRequest = async () => {
    setError('');
    try {
      const res = await fetch('/api/leaves', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ action:'create', ...form, employeeId:form.employeeId || undefined }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'No se pudo crear la solicitud');
      setForm({ employeeId:'', type:'VACATION', startDate:'', endDate:'', reason:'', payTreatment:'policy_defined' });
      setShowForm(false);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Error creando solicitud'); }
  };

  const decide = async (id:string, action:'approve'|'reject'|'cancel') => {
    const decisionReason = action === 'reject' ? window.prompt('Motivo del rechazo (opcional)') || '' : '';
    const res = await fetch('/api/leaves', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ id, action, decisionReason }) });
    const data = await res.json();
    if (!res.ok) { setError(data.error || data.message || 'No se pudo procesar la solicitud'); return; }
    await load();
  };

  const stats = useMemo(()=>requests.reduce((acc,r)=>{ acc.total++; acc[r.status]++; return acc; },{total:0,pending:0,approved:0,rejected:0,cancelled:0}),[requests]);

  return <main className="p-4 md:p-8 max-w-7xl mx-auto flex flex-col gap-6">
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div><div className="text-xs tracking-[.25em] text-violet-400 font-bold">WORKFORCE • TIME OFF</div><h1 className="text-3xl md:text-4xl font-bold text-white mt-2">Permisos y vacaciones</h1><p className="text-zinc-400 mt-2">Solicitudes, aprobación y tratamiento de nómina explícito. Nada se descuenta por inferencia.</p></div>
      <button onClick={()=>setShowForm(v=>!v)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-white text-sm font-semibold"><Plus className="w-4 h-4"/> Nueva solicitud</button>
    </div>

    {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 p-3">{error}</div>}

    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Metric label="Solicitudes" value={stats.total}/><Metric label="Pendientes" value={stats.pending}/><Metric label="Aprobadas" value={stats.approved}/><Metric label="Rechazadas" value={stats.rejected}/>
    </div>

    {showForm && <GlassWidget title="Nueva solicitud" icon={CalendarDays}>
      <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div><label className="text-xs text-zinc-500">Empleado ID (vacío = yo)</label><input value={form.employeeId} onChange={e=>setForm({...form,employeeId:e.target.value})} className="mt-1 w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-white" placeholder="Cédula / ID"/></div>
        <div><label className="text-xs text-zinc-500">Tipo</label><select value={form.type} onChange={e=>setForm({...form,type:e.target.value})} className="mt-1 w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-white">{leaveTypes.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div>
        <div><label className="text-xs text-zinc-500">Tratamiento de nómina</label><select value={form.payTreatment} onChange={e=>setForm({...form,payTreatment:e.target.value})} className="mt-1 w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-white"><option value="policy_defined">Según política configurada</option><option value="paid">Remunerado</option><option value="unpaid">No remunerado</option></select></div>
        <div><label className="text-xs text-zinc-500">Desde</label><input type="date" value={form.startDate} onChange={e=>setForm({...form,startDate:e.target.value})} className="mt-1 w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-white"/></div>
        <div><label className="text-xs text-zinc-500">Hasta</label><input type="date" value={form.endDate} onChange={e=>setForm({...form,endDate:e.target.value})} className="mt-1 w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-white"/></div>
        <div><label className="text-xs text-zinc-500">Motivo / soporte</label><input value={form.reason} onChange={e=>setForm({...form,reason:e.target.value})} className="mt-1 w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-white" placeholder="Descripción breve"/></div>
        <div className="md:col-span-3 flex justify-end"><button onClick={createRequest} disabled={!form.startDate||!form.endDate} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg text-white text-sm font-semibold">Enviar solicitud</button></div>
      </div>
    </GlassWidget>}

    <GlassWidget title="Bandeja de solicitudes" icon={Clock3}>
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-zinc-500 border-b border-zinc-800"><tr><th className="p-4 text-left">Empleado</th><th className="p-4 text-left">Tipo</th><th className="p-4 text-left">Fechas</th><th className="p-4 text-center">Días</th><th className="p-4 text-left">Nómina</th><th className="p-4 text-left">Estado</th><th className="p-4 text-right">Acciones</th></tr></thead><tbody className="divide-y divide-zinc-800">
        {loading?<tr><td colSpan={7} className="p-8 text-center text-zinc-500">Cargando...</td></tr>:requests.length===0?<tr><td colSpan={7} className="p-8 text-center text-zinc-500">No hay solicitudes.</td></tr>:requests.map(r=><tr key={r.id} className="hover:bg-zinc-900/50"><td className="p-4"><div className="font-semibold text-white">{r.employeeName}</div><div className="text-xs text-zinc-500">{r.employeeId}</div></td><td className="p-4 text-zinc-300">{r.type}</td><td className="p-4 text-zinc-300">{r.startDate} → {r.endDate}</td><td className="p-4 text-center">{r.days}</td><td className="p-4 text-zinc-300">{r.payTreatment}</td><td className="p-4"><Status status={r.status}/></td><td className="p-4"><div className="flex justify-end gap-2">{r.status==='pending'&&<><button onClick={()=>decide(r.id,'approve')} title="Aprobar" className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><Check className="w-4 h-4"/></button><button onClick={()=>decide(r.id,'reject')} title="Rechazar" className="p-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20"><X className="w-4 h-4"/></button><button onClick={()=>decide(r.id,'cancel')} title="Cancelar" className="p-2 rounded-lg bg-zinc-800 text-zinc-400 border border-zinc-700"><ShieldCheck className="w-4 h-4"/></button></>}</div></td></tr>)}
      </tbody></table></div>
    </GlassWidget>
  </main>;
}

function Metric({label,value}:{label:string;value:number}) { return <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4"><div className="text-xs text-zinc-500">{label}</div><div className="text-2xl font-bold text-white mt-2">{value}</div></div> }
function Status({status}:{status:LeaveRequest['status']}) { const cls=status==='approved'?'text-emerald-400 border-emerald-500/30 bg-emerald-500/10':status==='rejected'?'text-red-400 border-red-500/30 bg-red-500/10':status==='cancelled'?'text-zinc-400 border-zinc-600 bg-zinc-800':'text-amber-300 border-amber-500/30 bg-amber-500/10'; return <span className={`px-2 py-1 rounded-full border text-xs ${cls}`}>{status}</span> }
