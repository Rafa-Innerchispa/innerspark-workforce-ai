"use client";

import React, { useEffect, useMemo, useState } from 'react';
import GlassWidget from '@/components/GlassWidget';
import { Calendar, Clock, Plus, Search, ShieldCheck } from 'lucide-react';

type Schedule = {
  id: string; employeeId: string; employeeName: string; date: string;
  startTime: string; endTime: string; status: string; notes?: string;
};
type Employee = { id: string; name: string };

const STATUS_LABELS: Record<string,string> = {
  PENDING: 'Pendiente', COMPLETED: 'Completado', LATE: 'Atraso',
  UNEXCUSED_ABSENCE: 'Falta injustificada', VACATION: 'Vacaciones', LEAVE: 'Permiso/licencia'
};

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ employeeId: '', date: '', startTime: '08:00', endTime: '17:00', status: 'PENDING', notes: '' });

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [sr, er] = await Promise.all([fetch('/api/schedules'), fetch('/api/employees')]);
      if (!sr.ok || !er.ok) throw new Error('No se pudo cargar la información');
      const s = await sr.json(); const e = await er.json();
      setSchedules(s.schedules || []);
      setEmployees((e.employees || []).map((x: Record<string,unknown>) => ({ id: String(x.id || ''), name: String(x.name || x.id || '') })));
    } catch (e) { setError(e instanceof Error ? e.message : 'Error de carga'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => schedules.filter(s =>
    `${s.employeeName} ${s.employeeId} ${s.date} ${STATUS_LABELS[s.status] || s.status}`.toLowerCase().includes(search.toLowerCase())
  ), [schedules, search]);

  const save = async () => {
    if (!form.employeeId || !form.date) return;
    const res = await fetch('/api/schedules', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(form) });
    if (!res.ok) { setError((await res.json()).error || 'No se pudo guardar el turno'); return; }
    setForm({ employeeId:'', date:'', startTime:'08:00', endTime:'17:00', status:'PENDING', notes:'' });
    await load();
  };

  return <main className="p-4 md:p-8 max-w-7xl mx-auto flex flex-col gap-6">
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div><div className="text-xs tracking-[.25em] text-blue-400 font-bold">WORKFORCE • OPERATIONS</div>
      <h1 className="text-3xl md:text-4xl font-bold text-white mt-2">Turnos y jornadas</h1>
      <p className="text-zinc-400 mt-2">Planificación real por tenant, sin registros sintéticos ni estados aleatorios.</p></div>
      <div className="flex items-center gap-2 text-xs text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 rounded-full px-3 py-2"><ShieldCheck className="w-4 h-4"/> Tenant protegido</div>
    </div>

    {error && <div className="border border-red-500/30 bg-red-500/10 text-red-300 rounded-xl p-3">{error}</div>}

    <GlassWidget title="Asignar turno" icon={Plus}>
      <div className="p-5 grid grid-cols-1 md:grid-cols-6 gap-3">
        <select className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 md:col-span-2" value={form.employeeId} onChange={e=>setForm({...form,employeeId:e.target.value})}>
          <option value="">Empleado...</option>{employees.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <input type="date" className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/>
        <input type="time" className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2" value={form.startTime} onChange={e=>setForm({...form,startTime:e.target.value})}/>
        <input type="time" className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2" value={form.endTime} onChange={e=>setForm({...form,endTime:e.target.value})}/>
        <button onClick={save} className="bg-blue-600 hover:bg-blue-500 rounded-xl px-4 py-2 font-semibold">Guardar</button>
        <select className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 md:col-span-2" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>
          {Object.entries(STATUS_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
        </select>
        <input className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 md:col-span-4" placeholder="Notas operativas (opcional)" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/>
      </div>
    </GlassWidget>

    <GlassWidget title={`Historial operativo (${filtered.length})`} icon={Calendar}>
      <div className="p-4 border-b border-zinc-800"><div className="relative max-w-md"><Search className="absolute left-3 top-3 w-4 h-4 text-zinc-500"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar empleado, fecha o estado" className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-9 pr-3 py-2"/></div></div>
      <div className="divide-y divide-zinc-800">
        {loading ? <div className="p-8 text-zinc-500">Cargando...</div> : filtered.length === 0 ? <div className="p-8 text-zinc-500">No hay turnos registrados todavía.</div> : filtered.map(s=><div key={s.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div><div className="font-semibold text-white">{s.employeeName}</div><div className="text-xs text-zinc-500">{s.employeeId}</div></div>
          <div className="flex items-center gap-4 text-sm"><span>{s.date}</span><span className="flex items-center gap-1 text-zinc-300"><Clock className="w-4 h-4"/>{s.startTime}–{s.endTime}</span><span className="rounded-full border border-zinc-700 px-3 py-1 text-xs">{STATUS_LABELS[s.status] || s.status}</span></div>
        </div>)}
      </div>
    </GlassWidget>
  </main>;
}
