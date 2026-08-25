"use client";

import React, { useEffect, useMemo, useState } from "react";
import GlassWidget from "@/components/GlassWidget";
import { Activity, Clock, Edit2, Fingerprint, Loader2, RefreshCw, Server, ShieldCheck, Terminal, Wifi, X } from "lucide-react";

type Device = {
  id: string;
  name?: string;
  ip?: string;
  location?: string;
  model?: string;
  status?: string;
  lastSync?: string;
};

type AttendanceLog = {
  id: string;
  user_id?: string;
  timestamp?: string;
  state?: string;
  serial_number?: string;
};

type CommandLog = {
  id: string;
  deviceId?: string;
  command?: string;
  status?: string;
  returnCode?: string;
  createdAt?: string;
};

type Employee = { id: string; name: string };

const stateLabels: Record<string, string> = {
  "0": "Entrada",
  "1": "Salida",
  "2": "Descanso • salida",
  "3": "Descanso • entrada",
  "4": "Horas extra • entrada",
  "5": "Horas extra • salida",
  "255": "No definido",
};

export default function DevicesPage() {
  const [pending, setPending] = useState<Device[]>([]);
  const [active, setActive] = useState<Device[]>([]);
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [commands, setCommands] = useState<CommandLog[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Device | null>(null);
  const [editForm, setEditForm] = useState({ name: "", location: "", model: "" });

  const employeeNames = useMemo(() => new Map(employees.map((employee) => [employee.id, employee.name])), [employees]);

  const refresh = async (silent = false) => {
    if (silent) setRefreshing(true);
    try {
      const [devicesRes, logsRes, commandsRes, employeesRes] = await Promise.all([
        fetch("/api/devices", { cache: "no-store" }),
        fetch("/api/logs/realtime", { cache: "no-store" }),
        fetch("/api/logs/commands", { cache: "no-store" }),
        fetch("/api/employees", { cache: "no-store" }),
      ]);

      const [devicesData, logsData, commandsData, employeesData] = await Promise.all([
        devicesRes.json(), logsRes.json(), commandsRes.json(), employeesRes.json(),
      ]);

      if (!devicesRes.ok) throw new Error(devicesData.error || devicesData.message || "No se pudieron cargar los equipos");
      if (!logsRes.ok) throw new Error(logsData.error || logsData.message || "No se pudieron cargar las marcaciones");
      if (!commandsRes.ok) throw new Error(commandsData.error || commandsData.message || "No se pudieron cargar los comandos");
      if (!employeesRes.ok) throw new Error(employeesData.error || employeesData.message || "No se pudieron cargar los empleados");

      setPending(Array.isArray(devicesData.pending) ? devicesData.pending : []);
      setActive(Array.isArray(devicesData.active) ? devicesData.active : []);
      setLogs(Array.isArray(logsData.logs) ? logsData.logs : []);
      setCommands(Array.isArray(commandsData.commands) ? commandsData.commands : []);
      setEmployees(Array.isArray(employeesData.employees) ? employeesData.employees : []);
      setError("");
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Error cargando la consola de dispositivos");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const first = window.setTimeout(() => void refresh(), 0);
    const interval = window.setInterval(() => void refresh(true), 15000);
    return () => { window.clearTimeout(first); window.clearInterval(interval); };
  }, []);

  const mutateDevice = async (path: string, payload: Record<string, unknown>) => {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || data.message || "No se pudo actualizar el equipo");
    await refresh(true);
  };

  const approve = async (id: string) => {
    try { await mutateDevice("/api/devices/approve", { id }); }
    catch (mutationError) { setError(mutationError instanceof Error ? mutationError.message : "No se pudo aprobar el equipo"); }
  };

  const ignore = async (id: string) => {
    try { await mutateDevice("/api/devices/ignore", { id }); }
    catch (mutationError) { setError(mutationError instanceof Error ? mutationError.message : "No se pudo ignorar el equipo"); }
  };

  const saveEdit = async () => {
    if (!editing) return;
    try {
      await mutateDevice("/api/devices/update", { id: editing.id, ...editForm });
      setEditing(null);
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : "No se pudo actualizar el equipo");
    }
  };

  const formatDate = (value?: string) => {
    if (!value) return "Sin registro";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString("es-EC");
  };

  return (
    <main className="p-4 md:p-8 w-full max-w-7xl mx-auto flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.24em] text-blue-400 font-semibold">Workforce • Device Hub</div>
          <h1 className="text-3xl md:text-4xl font-bold mt-2">Dispositivos y biometría</h1>
          <p className="text-zinc-400 mt-2 max-w-3xl">Equipos, marcaciones y comandos filtrados en servidor por empresa. La consola ya no recibe datos de otros tenants para filtrarlos después.</p>
        </div>
        <button onClick={() => void refresh(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200">
          {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Actualizar
        </button>
      </div>

      {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 p-4">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Metric label="Equipos activos" value={active.length} />
        <Metric label="Pendientes" value={pending.length} />
        <Metric label="Marcaciones recientes" value={logs.length} />
        <Metric label="Comandos recientes" value={commands.length} />
      </div>

      <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5">
        <div className="flex items-center gap-2 text-blue-300 font-semibold"><Wifi className="w-4 h-4" /> Conexión ADMS</div>
        <p className="text-sm text-zinc-400 mt-2">Configura el reloj con el endpoint ADMS publicado para tu entorno. No mostramos aquí direcciones IP hardcodeadas porque cambian entre staging, producción y despliegues regionales.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <GlassWidget title={`Pendientes (${pending.length})`} icon={Server}>
          <div className="p-4 flex flex-col gap-3">
            {loading ? <Loading /> : pending.length === 0 ? <Empty text="No hay equipos pendientes." /> : pending.map((device) => (
              <div key={device.id} className="rounded-xl border border-yellow-500/20 bg-zinc-900/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div><div className="font-semibold">SN: {device.id}</div><div className="text-xs text-zinc-500 mt-1">IP: {device.ip || "no reportada"} • {formatDate(device.lastSync)}</div></div>
                <div className="flex gap-2"><button onClick={() => void ignore(device.id)} className="px-3 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-sm">Ignorar</button><button onClick={() => void approve(device.id)} className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Aprobar</button></div>
              </div>
            ))}
          </div>
        </GlassWidget>

        <GlassWidget title={`Activos (${active.length})`} icon={Activity}>
          <div className="p-4 flex flex-col gap-3">
            {loading ? <Loading /> : active.length === 0 ? <Empty text="No hay equipos activos." /> : active.map((device) => (
              <div key={device.id} className="rounded-xl border border-green-500/20 bg-zinc-900/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div><div className="font-semibold">{device.name || `SN: ${device.id}`}</div><div className="text-xs text-zinc-500 mt-1">{device.name ? `SN: ${device.id} • ` : ""}{device.location || "Sin ubicación"}{device.model ? ` • ${device.model}` : ""}</div></div>
                  <button onClick={() => { setEditing(device); setEditForm({ name: device.name || "", location: device.location || "", model: device.model || "" }); }} className="p-2 rounded-lg text-zinc-500 hover:text-blue-400 hover:bg-blue-500/10"><Edit2 className="w-4 h-4" /></button>
                </div>
                <div className="mt-3 text-xs text-zinc-500 flex items-center gap-1"><Clock className="w-3 h-3" /> Última señal: {formatDate(device.lastSync)}</div>
              </div>
            ))}
          </div>
        </GlassWidget>
      </div>

      <GlassWidget title="Marcaciones recientes" icon={Fingerprint}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm"><thead className="text-zinc-500 border-b border-zinc-800"><tr><th className="text-left p-4">Fecha</th><th className="text-left p-4">Empleado</th><th className="text-left p-4">Evento</th><th className="text-left p-4">Equipo</th></tr></thead><tbody className="divide-y divide-zinc-900">{logs.length === 0 ? <tr><td colSpan={4} className="p-8 text-center text-zinc-500">Sin marcaciones recientes.</td></tr> : logs.map((log) => <tr key={log.id}><td className="p-4 text-zinc-300">{formatDate(log.timestamp)}</td><td className="p-4"><div className="font-medium">{employeeNames.get(String(log.user_id || "")) || "Empleado"}</div><div className="text-xs text-zinc-500">{log.user_id || "sin ID"}</div></td><td className="p-4"><span className="px-2.5 py-1 rounded-full border border-zinc-700 bg-zinc-800 text-xs">{stateLabels[String(log.state || "")] || `Estado ${log.state || "?"}`}</span></td><td className="p-4 text-zinc-500 font-mono text-xs">{log.serial_number || "-"}</td></tr>)}</tbody></table>
        </div>
      </GlassWidget>

      <GlassWidget title="Comandos ADMS" icon={Terminal}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm"><thead className="text-zinc-500 border-b border-zinc-800"><tr><th className="text-left p-4">Fecha</th><th className="text-left p-4">Equipo</th><th className="text-left p-4">Comando</th><th className="text-left p-4">Estado</th></tr></thead><tbody className="divide-y divide-zinc-900">{commands.length === 0 ? <tr><td colSpan={4} className="p-8 text-center text-zinc-500">Sin comandos recientes.</td></tr> : commands.map((command) => <tr key={command.id}><td className="p-4 text-zinc-300">{formatDate(command.createdAt)}</td><td className="p-4 font-mono text-xs text-zinc-400">{command.deviceId || "-"}</td><td className="p-4 font-mono text-xs text-zinc-400 max-w-[420px] truncate" title={command.command}>{command.command || "-"}</td><td className="p-4"><span className="px-2.5 py-1 rounded-full border border-zinc-700 bg-zinc-800 text-xs uppercase">{command.status || "unknown"}</span></td></tr>)}</tbody></table>
        </div>
      </GlassWidget>

      {editing && <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"><div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6"><div className="flex items-center justify-between"><h2 className="text-xl font-bold">Editar equipo</h2><button onClick={() => setEditing(null)} className="p-2 text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button></div><div className="grid gap-4 mt-5"><Field label="Nombre"><input className="field" value={editForm.name} onChange={(event) => setEditForm({ ...editForm, name: event.target.value })} /></Field><Field label="Ubicación"><input className="field" value={editForm.location} onChange={(event) => setEditForm({ ...editForm, location: event.target.value })} /></Field><Field label="Modelo"><input className="field" value={editForm.model} onChange={(event) => setEditForm({ ...editForm, model: event.target.value })} /></Field></div><div className="flex justify-end gap-3 mt-6"><button onClick={() => setEditing(null)} className="px-4 py-2 rounded-xl bg-zinc-800">Cancelar</button><button onClick={() => void saveEdit()} className="px-4 py-2 rounded-xl bg-blue-600 text-white">Guardar</button></div></div></div>}

      <style jsx>{`.field{width:100%;background:#18181b;border:1px solid #3f3f46;border-radius:.75rem;padding:.7rem .8rem;color:#fff;outline:none}.field:focus{border-color:#3b82f6}`}</style>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5"><div className="text-sm text-zinc-500">{label}</div><div className="text-3xl font-bold mt-1">{value}</div></div>; }
function Loading() { return <div className="py-10 flex justify-center text-zinc-500"><Loader2 className="w-5 h-5 animate-spin" /></div>; }
function Empty({ text }: { text: string }) { return <div className="py-10 text-center text-zinc-500">{text}</div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="block text-sm text-zinc-400 mb-1.5">{label}</span>{children}</label>; }
