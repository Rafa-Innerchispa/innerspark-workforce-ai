"use client";

import React, { useEffect, useMemo, useState } from 'react';
import GlassWidget from '@/components/GlassWidget';
import { AlertTriangle, Clock3, DollarSign, Filter, Settings2, ShieldCheck, Users } from 'lucide-react';

type PayrollPreview = {
  grossEarnings: number;
  deductions: number;
  netPay: number;
  employerCost: number;
  rulesVersion: number;
  currency: string;
};

type Row = {
  employeeId: string; name: string; department: string; baseSalary: number;
  lateEvents: number; lateMinutes: number; overtimeMinutes: number;
  earlyDepartureMinutes: number; sourceEvents: number; payroll: PayrollPreview | null;
};

type RulesState = {
  monetaryAdjustmentsConfigured: boolean;
  version: number | null;
  currency: string | null;
  note: string;
};

const emptyForm = {
  overtimeHourlyMultiplier: '1.5',
  lateMinuteDeductionRate: '0',
  earlyDepartureMinuteDeductionRate: '0',
  employeeContributionRate: '0',
  employerContributionRate: '0',
  currency: 'USD',
};

export default function PrePayrollPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [rulesState, setRulesState] = useState<RulesState | null>(null);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rulesOpen, setRulesOpen] = useState(false);
  const [savingRules, setSavingRules] = useState(false);
  const [rulesForm, setRulesForm] = useState(emptyForm);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/prepayroll/summary');
      if (!res.ok) throw new Error('No se pudo cargar la prenómina');
      const data = await res.json();
      setRows(data.rows || []);
      setRulesState(data.rules || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de carga');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

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
    overtime: a.overtime + r.overtimeMinutes,
    gross: a.gross + (r.payroll?.grossEarnings || 0),
    deductions: a.deductions + (r.payroll?.deductions || 0),
    net: a.net + (r.payroll?.netPay || 0),
    employerCost: a.employerCost + (r.payroll?.employerCost || 0),
  }), { employees:0, events:0, late:0, overtime:0, gross:0, deductions:0, net:0, employerCost:0 }), [rows]);

  const saveRules = async () => {
    setSavingRules(true);
    setError('');
    try {
      const payload = Object.fromEntries(Object.entries(rulesForm).map(([key, value]) => [key, key === 'currency' ? value : Number(value)]));
      const res = await fetch('/api/payroll/rules', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'No se pudieron guardar las reglas');
      setRulesOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error guardando reglas');
    } finally {
      setSavingRules(false);
    }
  };

  const configured = Boolean(rulesState?.monetaryAdjustmentsConfigured);
  const currency = rulesState?.currency || 'USD';

  return <main className="p-4 md:p-8 max-w-7xl mx-auto flex flex-col gap-6">
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div>
        <div className="text-xs tracking-[.25em] text-violet-400 font-bold">WORKFORCE • PAYROLL CONTROL</div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mt-2">Pre‑nómina verificable</h1>
        <p className="text-zinc-400 mt-2">De la marcación al valor final, con reglas versionadas y trazabilidad por concepto.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <div className={`flex items-center gap-2 text-xs rounded-full px-3 py-2 border ${configured ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' : 'text-amber-300 border-amber-500/30 bg-amber-500/10'}`}>
          <ShieldCheck className="w-4 h-4"/> {configured ? `Reglas v${rulesState?.version}` : 'Sin reglas monetarias'}
        </div>
        <button onClick={()=>setRulesOpen(v=>!v)} className="flex items-center gap-2 px-3 py-2 rounded-full text-xs border border-blue-500/30 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20">
          <Settings2 className="w-4 h-4"/> Configurar reglas
        </button>
      </div>
    </div>

    {error && <div className="border border-red-500/30 bg-red-500/10 text-red-300 rounded-xl p-3">{error}</div>}

    {rulesOpen && <GlassWidget title="Reglas monetarias versionadas" icon={Settings2}>
      <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
        <RuleInput label="Multiplicador hora extra" value={rulesForm.overtimeHourlyMultiplier} onChange={v=>setRulesForm({...rulesForm,overtimeHourlyMultiplier:v})}/>
        <RuleInput label="Descuento por minuto de atraso" value={rulesForm.lateMinuteDeductionRate} onChange={v=>setRulesForm({...rulesForm,lateMinuteDeductionRate:v})}/>
        <RuleInput label="Descuento por minuto salida temprana" value={rulesForm.earlyDepartureMinuteDeductionRate} onChange={v=>setRulesForm({...rulesForm,earlyDepartureMinuteDeductionRate:v})}/>
        <RuleInput label="Aporte empleado (decimal)" value={rulesForm.employeeContributionRate} onChange={v=>setRulesForm({...rulesForm,employeeContributionRate:v})}/>
        <RuleInput label="Aporte empleador (decimal)" value={rulesForm.employerContributionRate} onChange={v=>setRulesForm({...rulesForm,employerContributionRate:v})}/>
        <div><label className="text-xs text-zinc-500">Moneda</label><input value={rulesForm.currency} onChange={e=>setRulesForm({...rulesForm,currency:e.target.value.toUpperCase()})} className="mt-1 w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-white"/></div>
        <div className="md:col-span-3 flex justify-between items-center gap-4 border-t border-zinc-800 pt-4">
          <p className="text-xs text-zinc-500">Cada guardado crea una nueva versión. Workforce no supone que estas tasas sean valores legales universales.</p>
          <button disabled={savingRules} onClick={saveRules} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold">{savingRules?'Guardando...':'Guardar nueva versión'}</button>
        </div>
      </div>
    </GlassWidget>}

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Metric icon={Users} label="Empleados" value={String(totals.employees)} />
      <Metric icon={Clock3} label="Eventos fuente" value={String(totals.events)} />
      <Metric icon={AlertTriangle} label="Min. atraso" value={String(totals.late)} />
      <Metric icon={DollarSign} label={configured?'Neto estimado':'Min. horas extra'} value={configured?`${currency} ${totals.net.toFixed(2)}`:String(totals.overtime)} />
    </div>

    {configured && <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <MoneyCard label="Bruto calculado" value={totals.gross} currency={currency}/>
      <MoneyCard label="Descuentos configurados" value={totals.deductions} currency={currency}/>
      <MoneyCard label="Costo empleador" value={totals.employerCost} currency={currency}/>
    </div>}

    <GlassWidget title="Novedades que impactan pre‑nómina" icon={Filter}>
      <div className="p-4 flex flex-wrap gap-2 border-b border-zinc-800">
        {[['ALL','Todas'],['LATE','Atrasos'],['OVERTIME','Horas extra'],['EARLY','Salidas tempranas']].map(([k,v]) => <button key={k} onClick={()=>setFilter(k)} className={`px-3 py-2 rounded-lg text-sm border ${filter===k?'bg-blue-600 border-blue-500 text-white':'bg-zinc-900 border-zinc-700 text-zinc-300'}`}>{v}</button>)}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-zinc-500 border-b border-zinc-800"><tr><th className="p-4 text-left">Empleado</th><th className="p-4 text-left">Área</th><th className="p-4 text-right">Atraso</th><th className="p-4 text-right">Extra</th><th className="p-4 text-right">Salida temprana</th>{configured&&<><th className="p-4 text-right">Bruto</th><th className="p-4 text-right">Descuentos</th><th className="p-4 text-right">Neto</th></>}</tr></thead>
          <tbody className="divide-y divide-zinc-800">
            {loading ? <tr><td colSpan={configured?8:5} className="p-8 text-center text-zinc-500">Cargando...</td></tr> : filtered.length===0 ? <tr><td colSpan={configured?8:5} className="p-8 text-center text-zinc-500">No hay novedades para este filtro.</td></tr> : filtered.map(r => <tr key={r.employeeId} className="hover:bg-zinc-900/50"><td className="p-4"><div className="font-semibold text-white">{r.name}</div><div className="text-xs text-zinc-500">{r.employeeId}</div></td><td className="p-4 text-zinc-300">{r.department}</td><td className="p-4 text-right text-amber-300">{r.lateMinutes}</td><td className="p-4 text-right text-emerald-300">{r.overtimeMinutes}</td><td className="p-4 text-right text-orange-300">{r.earlyDepartureMinutes}</td>{configured&&r.payroll&&<><td className="p-4 text-right">{r.payroll.grossEarnings.toFixed(2)}</td><td className="p-4 text-right text-red-300">{r.payroll.deductions.toFixed(2)}</td><td className="p-4 text-right font-bold text-blue-300">{r.payroll.netPay.toFixed(2)}</td></>}</tr>)}
          </tbody>
        </table>
      </div>
    </GlassWidget>

    <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5 text-sm text-zinc-300">
      <strong className="text-blue-300">Siguiente control:</strong> cierre de período, aprobación por segundo actor, ajustes posteriores y snapshot inmutable antes de emitir el rol de pagos.
    </div>
  </main>;
}

function Metric({icon:Icon,label,value}:{icon:React.ComponentType<{className?:string}>;label:string;value:string}) { return <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4"><div className="flex items-center gap-2 text-zinc-500 text-xs"><Icon className="w-4 h-4"/>{label}</div><div className="text-2xl font-bold text-white mt-2">{value}</div></div> }
function MoneyCard({label,value,currency}:{label:string;value:number;currency:string}) { return <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4"><div className="text-xs text-zinc-500">{label}</div><div className="text-xl font-bold text-white mt-2">{currency} {value.toFixed(2)}</div></div> }
function RuleInput({label,value,onChange}:{label:string;value:string;onChange:(value:string)=>void}) { return <div><label className="text-xs text-zinc-500">{label}</label><input type="number" step="0.0001" min="0" value={value} onChange={e=>onChange(e.target.value)} className="mt-1 w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-white"/></div> }
