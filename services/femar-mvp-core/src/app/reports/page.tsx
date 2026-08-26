"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Bot,
  Building2,
  Camera,
  CheckCircle2,
  Clock3,
  Fingerprint,
  MapPin,
  ShieldCheck,
  Sparkles,
  Users,
  WalletCards,
} from "lucide-react";

type MetricResult = {
  intent: string;
  value: unknown;
  totalLateMinutes?: number;
  caveat?: string;
};

type MobileLog = {
  id: string;
  user_id?: string | null;
  event_at?: string | null;
  location?: { lat?: number; lng?: number; accuracy?: number } | null;
  verification?: {
    geofence?: { status?: string; distanceMeters?: number };
    mock_location?: string;
    liveness?: string;
    server_time?: string;
  } | null;
  photo_url?: string | null;
  photo_available?: boolean;
};

const metricDefinitions = [
  { key: "employees", label: "Personas activas", icon: Users, accent: "from-blue-500/20 to-cyan-500/5", suffix: "" },
  { key: "late_arrivals", label: "Llegadas tardías", icon: Clock3, accent: "from-amber-500/20 to-orange-500/5", suffix: "" },
  { key: "incomplete_punches", label: "Marcaciones incompletas", icon: AlertTriangle, accent: "from-rose-500/20 to-red-500/5", suffix: "" },
  { key: "monthly_cost", label: "Costo mensual configurado", icon: WalletCards, accent: "from-emerald-500/20 to-green-500/5", suffix: "" },
] as const;

function formatMoney(value: unknown) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
}

function verificationLabel(status?: string) {
  if (status === "verified") return "Dentro de geocerca";
  if (status === "outside") return "Fuera de geocerca";
  return "Geocerca no configurada";
}

export default function ReportsPage() {
  const [metrics, setMetrics] = useState<Record<string, MetricResult>>({});
  const [departments, setDepartments] = useState<Record<string, { employees: number; configuredMonthlyCost: number }>>({});
  const [mobileLogs, setMobileLogs] = useState<MobileLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [ariaPrompt, setAriaPrompt] = useState("¿Cuántos atrasos hubo?");
  const [ariaAnswer, setAriaAnswer] = useState("Pregúntame por personas, atrasos, marcaciones incompletas o costos configurados.");
  const [ariaBusy, setAriaBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true);
      try {
        const intents = ["employees", "late_arrivals", "incomplete_punches", "monthly_cost", "annual_cost", "department_cost"];
        const responses = await Promise.all(intents.map(async intent => {
          const response = await fetch(`/api/analytics/query?intent=${intent}`, { cache: "no-store" });
          const body = await response.json();
          if (!response.ok) throw new Error(body.message || body.error || "Analytics unavailable");
          return [intent, body.result] as const;
        }));
        const next = Object.fromEntries(responses);
        const evidenceResponse = await fetch("/api/mobile/logs", { cache: "no-store" });
        const evidenceBody = await evidenceResponse.json().catch(() => ({ logs: [] }));
        if (!alive) return;
        setMetrics(next);
        setDepartments((next.department_cost?.value || {}) as Record<string, { employees: number; configuredMonthlyCost: number }>);
        setMobileLogs(evidenceResponse.ok ? (evidenceBody.logs || []) : []);
      } catch (error) {
        console.error(error);
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => { alive = false; };
  }, []);

  const annualCost = Number(metrics.annual_cost?.value || 0);
  const totalLateMinutes = Number(metrics.late_arrivals?.totalLateMinutes || 0);
  const recentEvidence = useMemo(() => mobileLogs.slice(0, 6), [mobileLogs]);

  const askAria = async (question?: string) => {
    const prompt = question || ariaPrompt;
    if (!prompt.trim()) return;
    setAriaPrompt(prompt);
    setAriaBusy(true);
    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, language: "es" }),
      });
      const body = await response.json();
      setAriaAnswer(body.text || body.message || body.error || "ARIA no pudo responder esta consulta.");
    } catch {
      setAriaAnswer("ARIA no pudo comunicarse con el servidor.");
    } finally {
      setAriaBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#080b12] text-white">
      <div className="mx-auto max-w-[1500px] px-4 py-6 md:px-8 md:py-10">
        <header className="relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-[#141a26] via-[#101521] to-[#0c1019] p-6 md:p-9 shadow-2xl">
          <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-52 w-52 rounded-full bg-violet-500/10 blur-3xl" />
          <div className="relative flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300"><ShieldCheck className="h-3.5 w-3.5" /> Datos con aislamiento por empresa</span>
                <span className="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1 text-xs font-semibold text-blue-300"><Bot className="h-3.5 w-3.5" /> ARIA + motor determinista</span>
              </div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[.28em] text-zinc-500">Workforce Intelligence</p>
              <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">Tu operación laboral, convertida en decisiones.</h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-400 md:text-base">Asistencia, evidencia, costos y anomalías se calculan desde la misma fuente de verdad que utiliza ARIA. Sin números inventados y sin cruzar información entre empresas.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm xl:w-[410px]">
              <div className="rounded-2xl border border-white/10 bg-white/[.035] p-4"><div className="text-zinc-500">Costo anual configurado</div><div className="mt-1 text-xl font-semibold">{loading ? "…" : formatMoney(annualCost)}</div></div>
              <div className="rounded-2xl border border-white/10 bg-white/[.035] p-4"><div className="text-zinc-500">Minutos tarde</div><div className="mt-1 text-xl font-semibold">{loading ? "…" : totalLateMinutes}</div></div>
            </div>
          </div>
        </header>

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metricDefinitions.map(({ key, label, icon: Icon, accent }) => {
            const result = metrics[key];
            const value = key === "monthly_cost" ? formatMoney(result?.value) : String(result?.value ?? 0);
            return (
              <article key={key} className={`rounded-3xl border border-white/10 bg-gradient-to-br ${accent} p-5 shadow-xl backdrop-blur`}>
                <div className="flex items-start justify-between"><div className="rounded-2xl border border-white/10 bg-black/20 p-2.5"><Icon className="h-5 w-5 text-zinc-200" /></div><span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">Live</span></div>
                <div className="mt-8 text-3xl font-semibold tracking-tight">{loading ? "…" : value}</div>
                <div className="mt-1 text-sm text-zinc-400">{label}</div>
              </article>
            );
          })}
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.12fr_.88fr]">
          <div className="rounded-[28px] border border-white/10 bg-[#10141e] p-5 md:p-7">
            <div className="flex items-center justify-between gap-4">
              <div><p className="text-xs font-bold uppercase tracking-[.22em] text-zinc-600">Costo por estructura</p><h2 className="mt-1 text-2xl font-semibold">Departamentos</h2></div>
              <Building2 className="h-6 w-6 text-zinc-600" />
            </div>
            <div className="mt-6 space-y-3">
              {Object.keys(departments).length === 0 ? <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-zinc-600">Aún no hay costos/departamentos configurados.</div> : Object.entries(departments).map(([name, data]) => (
                <div key={name} className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[.025] px-4 py-4">
                  <div><div className="font-medium text-zinc-200">{name}</div><div className="mt-1 text-xs text-zinc-600">{data.employees} persona{data.employees === 1 ? "" : "s"}</div></div>
                  <div className="text-right"><div className="font-semibold">{formatMoney(data.configuredMonthlyCost)}</div><div className="mt-1 text-xs text-zinc-600">mensual configurado</div></div>
                </div>
              ))}
            </div>
            <p className="mt-5 text-xs leading-5 text-zinc-600">Los costos mostrados usan únicamente valores configurados en cada empleado. No aplicamos descuentos, IESS, horas extra ni reglas legales ocultas.</p>
          </div>

          <div className="relative overflow-hidden rounded-[28px] border border-violet-400/20 bg-gradient-to-br from-violet-500/10 via-[#111522] to-blue-500/10 p-5 md:p-7">
            <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-violet-400/10 blur-3xl" />
            <div className="relative">
              <div className="flex items-center gap-3"><div className="rounded-2xl bg-violet-400/15 p-2.5"><Sparkles className="h-5 w-5 text-violet-300" /></div><div><p className="text-xs font-bold uppercase tracking-[.22em] text-violet-300/70">ARIA</p><h2 className="text-2xl font-semibold">Pregunta a tu operación</h2></div></div>
              <div className="mt-5 min-h-28 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-zinc-300">{ariaBusy ? "ARIA está consultando la fuente de verdad…" : ariaAnswer}</div>
              <div className="mt-4 flex gap-2"><input value={ariaPrompt} onChange={event => setAriaPrompt(event.target.value)} onKeyDown={event => { if (event.key === "Enter") askAria(); }} className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm outline-none placeholder:text-zinc-700 focus:border-violet-400/40" placeholder="Ej. ¿Cuál es mi costo mensual?" /><button onClick={() => askAria()} disabled={ariaBusy} className="rounded-xl bg-white px-4 py-3 text-sm font-bold text-black transition hover:bg-zinc-200 disabled:opacity-50">Consultar</button></div>
              <div className="mt-3 flex flex-wrap gap-2">{["¿Cuántos empleados tengo?", "Muéstrame los atrasos", "¿Cuál es el costo anual?"].map(question => <button key={question} onClick={() => askAria(question)} className="rounded-full border border-white/10 bg-white/[.035] px-3 py-1.5 text-xs text-zinc-400 hover:text-white">{question}</button>)}</div>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-[28px] border border-white/10 bg-[#10141e] p-5 md:p-7">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.22em] text-zinc-600">Evidencia móvil</p><h2 className="mt-1 text-2xl font-semibold">Últimas marcaciones remotas</h2></div><div className="flex items-center gap-2 text-xs text-zinc-500"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> hora del servidor + ubicación + foto privada</div></div>
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {recentEvidence.length === 0 ? <div className="col-span-full rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-zinc-600">Todavía no existen marcaciones móviles para esta empresa.</div> : recentEvidence.map(log => (
              <article key={log.id} className="flex gap-4 rounded-2xl border border-white/8 bg-white/[.025] p-4">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-black/30">{log.photo_url ? <img src={log.photo_url} alt="Evidencia de marcación" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center"><Camera className="h-5 w-5 text-zinc-700" /></div>}</div>
                <div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div><div className="font-medium">{log.user_id || "Usuario"}</div><div className="mt-1 text-xs text-zinc-600">{log.event_at ? new Date(log.event_at).toLocaleString("es-EC") : "Sin hora"}</div></div><span className="rounded-full border border-white/10 px-2 py-1 text-[10px] text-zinc-500">{verificationLabel(log.verification?.geofence?.status)}</span></div><div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500"><span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> precisión {Math.round(Number(log.location?.accuracy || 0))} m</span><span className="inline-flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> hora servidor {log.verification?.server_time === "verified" ? "verificada" : "n/d"}</span></div></div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-[28px] border border-blue-400/15 bg-gradient-to-r from-blue-500/10 via-[#10141e] to-cyan-500/5 p-6 md:p-8">
          <div className="grid gap-7 xl:grid-cols-[.8fr_1.2fr] xl:items-center">
            <div><p className="text-xs font-bold uppercase tracking-[.24em] text-blue-300/70">Una plataforma, más módulos</p><h2 className="mt-2 text-3xl font-semibold">Workforce es el inicio, no el límite.</h2><p className="mt-3 text-sm leading-6 text-zinc-400">La misma identidad, tenants, auditoría y ARIA pueden extenderse a otros procesos sin obligar al cliente a comprar sistemas aislados.</p></div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[{ icon: Fingerprint, title: "Accesos", text: "Puertas, tags y biometría" }, { icon: WalletCards, title: "Nómina", text: "Pre-nómina y aprobación" }, { icon: Camera, title: "Vigilancia", text: "Eventos y evidencia" }, { icon: Activity, title: "Operaciones", text: "Alertas y workflows" }].map(({ icon: Icon, title, text }) => (
                <div key={title} className="group rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:-translate-y-0.5 hover:border-blue-400/25"><div className="flex items-center justify-between"><Icon className="h-5 w-5 text-blue-300" /><ArrowUpRight className="h-4 w-4 text-zinc-700 transition group-hover:text-blue-300" /></div><div className="mt-5 font-semibold">{title}</div><div className="mt-1 text-xs text-zinc-500">{text}</div><div className="mt-3 text-[10px] font-bold uppercase tracking-wider text-blue-300/60">Listo para extender</div></div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
