"use client";

import React, { useEffect, useMemo, useState } from 'react';
import GlassWidget from '@/components/GlassWidget';
import { AlertTriangle, Clock3, DollarSign, Filter, ShieldCheck, Users } from 'lucide-react';

type Row = {
  employeeId: string; name: string; department: string; baseSalary: number;
  lateEvents: number; lateMinutes: number; overtimeMinutes: number;
  earlyDepartureMinutes: number; sourceEvents: number;
};

export default function PrePayrollPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/prepayroll/summary');
        if (!res.ok) throw new Error('No se pudo cargar la prenómina');
        const data = await res.json();
        setRows(data.rows || []);
      } catch (e) { setError(e instanceof Error ? e.message : 'Error de carga'); }
      finally { setLoading(false); }
    })();
  }, []);

  const filtered = useMemo(() => rows.filter(r => {
    if (filter === 'LATE') return r.lateMinutes > 0;
    if (filter === 'OVERTIME') return r.overtimeMinutes > 0;
    if (filter === 'EARLY') return r.earlyDepartureMinutes > 0;
    return true;
  }), [rows, filter]);

  const totals = useMemo(() => rows.reduce((a,r) => ({
    employees: a.employees + 1,
    events: a.events + r.sourceEvents,
    late: a.late + r.lateMinutes,
    overtime: a.overtime + r.overtimeMinutes
  }), { employees:0, events:0, late:0, overtime:0 }), [rows]);

  return <main className="p-4 md:p-8 max-w-7xl mx-auto flex flex-col gap-6">
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div><div className="text-xs tracking-[.25em] text-violet-400 font-bold">WORKFORCE • PAYROLL CONTROL</div>
      <h1 className="text-3xl md:text-4xl font-bold text-white mt-2">Pre‑nómina verificable</h1>
      <p className="text-zinc-400 mt-2">Hechos de asistencia reales primero. Reglas monetarias sólo cuando la empresa las configure.</p></div>
      <div className="flex items-center gap-2 text-xs text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 rounded-full px-3 py-2"><ShieldCheck className="w-4 h-4"/> Sin números inventados</div>
    </div>

    {error && <div className="border border-red-500/30 bg-red-500/10 text-red-300 rounded-xl p-3">{error}</div>}

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Metric icon={Users} label="Empleados" value={String(totals.employees)} />
      <Metric icon={Clock3} label="Eventos fuente" value={String(totals.events)} />
      <Metric icon={AlertTriangle} label="Min. atraso" value={String(totals.late)} />
      <Metric icon={DollarSign} label="Min. horas extra" value={String(totals.overtime)} />
    </div>

    <GlassWidget title="Novedades que impactan pre‑nómina" icon={Filter}>
      <div className="p-4 flex flex-wrap gap-2 border-b border-zinc-800">
        {[['ALL','Todas'],['LATE','Atrasos'],['OVERTIME','Horas extra'],['EARLY','Salidas tempranas']].map(([k,v]) => <button key={k} onClick={()=>setFilter(k)} className={`px-3 py-2 rounded-lg text-sm border ${filter===k?'bg-blue-600 border-blue-500 text-white':'bg-zinc-900 border-zinc-700 text-zinc-300'}`}>{v}</button>)}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-zinc-500 border-b border-zinc-800"><tr><th className="p-4 text-left">Empleado</th><th className="p-4 text-left">Área</th><th className="p-4 text-right">Atrasos</th><th className="p-4 text-right">Min. atraso</th><th className="p-4 text-right">Min. extra</th><th className="p-4 text-right">Salida temprana</th><th className="p-4 text-right">Eventos</th></tr></thead>
          <tbody className="divide-y divide-zinc-800">
            {loading ? <tr><td colSpan={7} className="p-8 text-center text-zinc-500">Cargando...</td></tr> : filtered.length===0 ? <tr><td colSpan={7} className="p-8 text-center text-zinc-500">No hay novedades para este filtro.</td></tr> : filtered.map(r => <tr key={r.employeeId} className="hover:bg-zinc-900/50"><td className="p-4"><div className="font-semibold text-white">{r.name}</div><div className="text-xs text-zinc-500">{r.employeeId}</div></td><td className="p-4 text-zinc-300">{r.department}</td><td className="p-4 text-right">{r.lateEvents}</td><td className="p-4 text-right text-amber-300">{r.lateMinutes}</td><td className="p-4 text-right text-emerald-300">{r.overtimeMinutes}</td><td className="p-4 text-right text-orange-300">{r.earlyDepartureMinutes}</td><td className="p-4 text-right">{r.sourceEvents}</td></tr>)}
          </tbody>
        </table>
      </div>
    </GlassWidget>

    <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5 text-sm text-zinc-300">
      <strong className="text-blue-300">Siguiente nivel:</strong> cuando RRHH configure jornada, tarifa, recargos, descuentos y reglas aprobadas, este mismo flujo podrá transformar cada novedad en un ajuste trazable de pre‑nómina. Por ahora no calculamos dinero con fórmulas genéricas.
    </div>
  </main>;
}

function Metric({icon:Icon,label,value}:{icon:React.ComponentType<{className?:string}>;label:string;value:string}) {
  return <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4"><div className="flex items-center gap-2 text-zinc-500 text-xs"><Icon className="w-4 h-4"/>{label}</div><div className="text-2xl font-bold text-white mt-2">{value}</div></div>
}
