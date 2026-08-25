"use client";

import React, { useEffect, useMemo, useState } from "react";
import AgentCommandBar from "@/components/AgentCommandBar";
import GlassWidget from "@/components/GlassWidget";
import { AlertTriangle, CheckCircle2, Clock, Fingerprint, MonitorSmartphone, Sparkles, TrendingUp, Users } from "lucide-react";

type MetricResult = { value: number; totalLateMinutes?: number };
type Device = { id: string; name?: string; location?: string; model?: string; lastSync?: string };

type DashboardData = {
  employees: number;
  lateArrivals: number;
  totalLateMinutes: number;
  incompletePunches: number;
  monthlyCost: number;
};

const emptyDashboard: DashboardData = {
  employees: 0,
  lateArrivals: 0,
  totalLateMinutes: 0,
  incompletePunches: 0,
  monthlyCost: 0,
};

export default function Home() {
  const [dashboard, setDashboard] = useState<DashboardData>(emptyDashboard);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const intents = ["employees", "late_arrivals", "incomplete_punches", "monthly_cost"];
      const [employeesRes, lateRes, incompleteRes, costRes, devicesRes] = await Promise.all([
        ...intents.map((intent) => fetch(`/api/analytics/query?intent=${intent}`, { cache: "no-store" })),
        fetch("/api/devices", { cache: "no-store" }),
      ]);

      const [employeesData, lateData, incompleteData, costData, deviceData] = await Promise.all([
        employeesRes.json(), lateRes.json(), incompleteRes.json(), costRes.json(), devicesRes.json(),
      ]);

      const analyticsResponses = [employeesRes, lateRes, incompleteRes, costRes];
      const analyticsData = [employeesData, lateData, incompleteData, costData];
      const failedIndex = analyticsResponses.findIndex((response) => !response.ok);
      if (failedIndex >= 0) throw new Error(analyticsData[failedIndex]?.error || analyticsData[failedIndex]?.message || "No se pudo cargar Analytics");
      if (!devicesRes.ok) throw new Error(deviceData.error || deviceData.message || "No se pudieron cargar los dispositivos");

      const employees = employeesData.result as MetricResult;
      const late = lateData.result as MetricResult;
      const incomplete = incompleteData.result as MetricResult;
      const cost = costData.result as MetricResult;

      setDashboard({
        employees: Number(employees.value || 0),
        lateArrivals: Number(late.value || 0),
        totalLateMinutes: Number(late.totalLateMinutes || 0),
        incompletePunches: Number(incomplete.value || 0),
        monthlyCost: Number(cost.value || 0),
      });
      setDevices(Array.isArray(deviceData.active) ? deviceData.active : []);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el Command Center");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const first = window.setTimeout(() => void load(), 0);
    const interval = window.setInterval(() => void load(), 30000);
    return () => { window.clearTimeout(first); window.clearInterval(interval); };
  }, []);

  const onlineDevices = useMemo(() => devices.filter((device) => {
    if (!device.lastSync) return false;
    const timestamp = Date.parse(device.lastSync);
    return Number.isFinite(timestamp) && Date.now() - timestamp < 5 * 60 * 1000;
  }).length, [devices]);

  return (
    <main className="p-4 md:p-8 w-full max-w-7xl mx-auto flex flex-col gap-7">
      <section className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-950 via-zinc-950 to-blue-950/40 p-6 md:p-8">
        <div className="absolute -top-24 -right-20 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="relative flex flex-col xl:flex-row xl:items-end justify-between gap-6">
          <div className="max-w-3xl">
            <div className="text-xs uppercase tracking-[0.26em] text-blue-400 font-semibold">Workforce Command Center</div>
            <h1 className="text-4xl md:text-5xl font-bold mt-3 tracking-tight">Tu operación laboral, en una sola inteligencia.</h1>
            <p className="text-zinc-400 mt-4 text-base md:text-lg leading-relaxed">Asistencia, personas, dispositivos, pre-nómina y ARIA comparten la misma información. Sin números inventados y sin filtrar tenants en el navegador.</p>
          </div>
          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 min-w-[220px]"><div className="flex items-center gap-2 text-blue-300 font-semibold"><Sparkles className="w-4 h-4" /> ARIA</div><p className="text-xs text-zinc-400 mt-2">Resuelve métricas deterministas primero y usa modelo sólo cuando la consulta realmente lo necesita.</p></div>
        </div>
      </section>

      {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">{error}</div>}

      <AgentCommandBar onCommand={() => undefined} isProcessing={false} />

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <MetricCard icon={Users} label="Personas" value={loading ? "…" : dashboard.employees.toLocaleString("es-EC")} detail="directorio del tenant" />
        <MetricCard icon={Clock} label="Atrasos" value={loading ? "…" : dashboard.lateArrivals.toLocaleString("es-EC")} detail={`${dashboard.totalLateMinutes} min acumulados`} />
        <MetricCard icon={AlertTriangle} label="Marcaciones incompletas" value={loading ? "…" : dashboard.incompletePunches.toLocaleString("es-EC")} detail="requieren revisión" />
        <MetricCard icon={TrendingUp} label="Costo configurado" value={loading ? "…" : `$${dashboard.monthlyCost.toLocaleString("es-EC", { maximumFractionDigits: 0 })}`} detail="mensual, sin fórmulas implícitas" />
        <MetricCard icon={MonitorSmartphone} label="Biométricos online" value={loading ? "…" : `${onlineDevices}/${devices.length}`} detail="señal < 5 min" />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <GlassWidget title="Situación operativa" icon={Fingerprint}>
            <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
              <Signal title="Asistencia" value={dashboard.incompletePunches === 0 ? "Sin pendientes detectados" : `${dashboard.incompletePunches} días incompletos`} good={dashboard.incompletePunches === 0} />
              <Signal title="Puntualidad" value={dashboard.lateArrivals === 0 ? "Sin atrasos detectados" : `${dashboard.lateArrivals} atrasos`} good={dashboard.lateArrivals === 0} />
              <Signal title="Dispositivos" value={devices.length === 0 ? "Sin equipos activos" : `${onlineDevices} de ${devices.length} online`} good={devices.length > 0 && onlineDevices === devices.length} />
            </div>
          </GlassWidget>
        </div>

        <GlassWidget title="Hardware" icon={MonitorSmartphone}>
          <div className="p-4 flex flex-col gap-3">
            {devices.length === 0 ? <div className="text-sm text-zinc-500 py-8 text-center">No hay equipos activos registrados.</div> : devices.slice(0, 5).map((device) => {
              const online = device.lastSync ? Date.now() - Date.parse(device.lastSync) < 5 * 60 * 1000 : false;
              return <div key={device.id} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 flex items-center justify-between gap-3"><div className="min-w-0"><div className="text-sm font-semibold truncate">{device.name || device.id}</div><div className="text-xs text-zinc-500 truncate mt-1">{device.location || device.model || "Sin ubicación"}</div></div><span className={`text-xs font-semibold ${online ? "text-green-400" : "text-zinc-500"}`}>{online ? "ONLINE" : "OFFLINE"}</span></div>;
            })}
          </div>
        </GlassWidget>
      </section>

      <section className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4"><div><div className="text-xs uppercase tracking-[0.2em] text-purple-400">Expansión modular</div><h2 className="text-2xl font-bold mt-2">Una plataforma, más módulos cuando los necesites.</h2></div><div className="text-sm text-zinc-500">Mismo tenant • mismo RBAC • misma ARIA • misma trazabilidad</div></div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-5">
          <ModuleCard title="Control de Accesos" text="Puertas, barreras, credenciales, visitantes y eventos." />
          <ModuleCard title="Nómina avanzada" text="Reglas configurables, cierres, aprobaciones y ajustes auditados." />
          <ModuleCard title="Vigilancia" text="Cámaras, eventos operativos y correlación con accesos." />
          <ModuleCard title="Operaciones" text="Activos, incidencias, mantenimiento y automatizaciones." />
        </div>
      </section>
    </main>
  );
}

function MetricCard({ icon: Icon, label, value, detail }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; detail: string }) {
  return <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5"><div className="flex items-center justify-between"><span className="text-sm text-zinc-500">{label}</span><Icon className="w-4 h-4 text-blue-400" /></div><div className="text-3xl font-bold mt-3">{value}</div><div className="text-xs text-zinc-600 mt-2">{detail}</div></div>;
}
function Signal({ title, value, good }: { title: string; value: string; good: boolean }) { return <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4"><div className="flex items-center gap-2">{good ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <AlertTriangle className="w-4 h-4 text-amber-400" />}<span className="font-semibold text-sm">{title}</span></div><div className="text-sm text-zinc-400 mt-3">{value}</div></div>; }
function ModuleCard({ title, text }: { title: string; text: string }) { return <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 hover:border-purple-500/40 transition-colors"><div className="font-semibold">{title}</div><p className="text-sm text-zinc-500 mt-2 leading-relaxed">{text}</p><div className="text-xs text-purple-400 mt-4">Disponible como módulo →</div></div>; }
