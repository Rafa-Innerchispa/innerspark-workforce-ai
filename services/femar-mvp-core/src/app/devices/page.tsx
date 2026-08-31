"use client";

import React, { useState, useEffect } from "react";
import GlassWidget from "@/components/GlassWidget";
import { Server, Activity, Plus, ShieldCheck, Search, Wifi, Clock, Fingerprint, Terminal, User } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { useAuth } from "@/contexts/AuthContext";
import { mockEmployees } from "@/lib/mockData";
import Link from "next/link";

export default function DevicesPage() {
  const { t } = useI18n();
  const { activeCompanyId } = useAuth();

  const mockFallback = mockEmployees.filter(e => e.companyId === activeCompanyId);
  const [companyEmployees, setCompanyEmployees] = useState<any[]>(mockFallback);
  const [pendingDevices, setPendingDevices] = useState<any[]>([]);
  const [activeDevices, setActiveDevices] = useState<any[]>([]);
  const [realtimeLogs, setRealtimeLogs] = useState<any[]>([]);
  const [commandLogs, setCommandLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDevice, setEditingDevice] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', location: '', model: '' });

  const fetchDevices = async () => {
    try {
      const res = await fetch('/api/devices');
      if (res.ok) {
        const data = await res.json();
        setPendingDevices(data.pending || []);
        setActiveDevices(data.active || []);
      }
      
      const logsRes = await fetch('/api/logs/realtime');
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setRealtimeLogs(logsData.logs || []);
      }
      
      const cmdsRes = await fetch('/api/logs/commands');
      if (cmdsRes.ok) {
        const cmdsData = await cmdsRes.json();
        setCommandLogs(cmdsData.commands || []);
      }
    } catch (error) {
      console.error("Error fetching devices:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const fetchEmps = async () => {
      const fallback = mockEmployees.filter(e => e.companyId === activeCompanyId);
      try {
        const url = activeCompanyId
          ? `/api/employees?companyId=${encodeURIComponent(activeCompanyId)}`
          : '/api/employees';
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && Array.isArray(data.employees) && data.employees.length > 0) {
            setCompanyEmployees(data.employees);
            return;
          }
        }
      } catch (err) {
        console.error("Error fetching employees:", err);
      }
      if (!cancelled) setCompanyEmployees(fallback);
    };
    fetchEmps();
    return () => { cancelled = true; };
  }, [activeCompanyId]);

  useEffect(() => {
    fetchDevices();
    const interval = setInterval(fetchDevices, 3000); // Poll every 3 seconds
    return () => clearInterval(interval);
  }, []);

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch('/api/devices/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        fetchDevices(); // Refresh immediately
      }
    } catch (e) {
      console.error("Error approving device:", e);
    }
  };

  const handleIgnore = async (id: string) => {
    try {
      const res = await fetch('/api/devices/ignore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        fetchDevices(); // Refresh immediately
      }
    } catch (e) {
      console.error("Error ignoring device:", e);
    }
  };

  const handleUpdateDevice = async (id: string) => {
    try {
      const res = await fetch('/api/devices/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...editForm })
      });
      if (res.ok) {
        setEditingDevice(null);
        fetchDevices();
      }
    } catch (e) {
      console.error("Error updating device:", e);
    }
  };

  const formatTime = (isoString: string) => {
    if (!isoString) return "Desconocido";
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' (' + date.toLocaleDateString() + ')';
    } catch (e) {
      return isoString;
    }
  };

  return (
    <main className="p-4 md:p-8 w-full max-w-7xl mx-auto flex flex-col gap-6 md:gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
          {t("devices")}
        </h1>
        <p className="text-sm md:text-base text-zinc-400">
          Monitoreo y administración de hardware biométrico ZKTeco
        </p>
      </div>

      <div className="bg-zinc-800/60 border border-blue-500/30 rounded-2xl p-6 mb-2">
        <h2 className="text-xl font-bold text-blue-400 mb-4 flex items-center gap-2">
          <Wifi className="w-5 h-5" /> Configuración de tu Reloj ZKTeco
        </h2>
        <p className="text-zinc-300 mb-4 text-sm leading-relaxed">
          Para conectar tu equipo biométrico a la nube, entra al menú del reloj y ve a <strong>Red &gt; Configuración del Servidor en la Nube (ADMS)</strong> e ingresa los siguientes datos exactos. El equipo aparecerá abajo en "Solicitudes Pendientes" inmediatamente.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-700/50">
            <p className="text-xs text-zinc-500 mb-1">Dirección del Servidor (Server Address)</p>
            <p className="font-mono text-lg text-white font-bold tracking-wider">104.197.119.150</p>
          </div>
          <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-700/50">
            <p className="text-xs text-zinc-500 mb-1">Puerto del Servidor (Server Port)</p>
            <p className="font-mono text-lg text-white font-bold tracking-wider">80</p>
          </div>
          <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-700/50">
            <p className="text-xs text-zinc-500 mb-1">Habilitar Nombre de Dominio (Enable Domain Name)</p>
            <p className="font-mono text-lg text-white font-bold tracking-wider text-red-400">NO / DESACTIVADO</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassWidget title="Solicitudes Pendientes (Push)" icon={Server}>
          <div className="flex flex-col gap-3 p-4">
            {loading ? (
              <div className="flex justify-center p-8 text-zinc-500">
                <Activity className="w-6 h-6 animate-spin" />
              </div>
            ) : pendingDevices.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-zinc-500 gap-2 text-center">
                <Wifi className="w-8 h-8 mb-2 opacity-50" />
                <p>No hay equipos intentando conectarse a la red en este momento.</p>
                <p className="text-xs opacity-70">Asegúrese de configurar el ADMS Server en su reloj ZKTeco apuntando a la nube.</p>
              </div>
            ) : (
              pendingDevices.map((device, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-zinc-800/40 rounded-xl border border-yellow-500/20 hover:border-yellow-500/40 transition-colors gap-4">
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="p-2 bg-yellow-500/10 rounded-lg">
                      <Server className="w-5 h-5 text-yellow-500" />
                    </div>
                    <div>
                      <h3 className="font-bold text-zinc-200">SN: {device.id}</h3>
                      <p className="text-xs text-zinc-400 flex items-center gap-1 mt-1">
                        IP: {device.ip}
                      </p>
                      <p className="text-xs text-zinc-500 flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3" /> Último ping: {formatTime(device.lastSync)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                    <button 
                      onClick={() => handleIgnore(device.id)}
                      className="flex-1 sm:flex-none px-3 py-1.5 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors border border-zinc-700"
                    >
                      Ignorar
                    </button>
                    <button 
                      onClick={() => handleApprove(device.id)}
                      className="flex-1 sm:flex-none px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors shadow-lg shadow-blue-900/20 flex items-center justify-center gap-1"
                    >
                      <ShieldCheck className="w-3 h-3" /> Aprobar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </GlassWidget>

        <GlassWidget title="Equipos Aprobados (En Línea)" icon={Activity}>
          <div className="flex justify-between items-center mb-2 mt-4 px-4 border-b border-zinc-800 pb-2">
            <span className="text-xs text-zinc-400">Sincronización manual</span>
            <button 
              onClick={async () => {
                try {
                  const res = await fetch('/api/sync-test');
                  const data = await res.json();
                  if(data.success) {
                    alert(`¡Sincronización Iniciada!\nSe han encolado ${data.queued} comandos hacia los dispositivos.\nRevisa la pantalla del equipo en unos segundos.`);
                  } else {
                    alert(`Error: ${data.message || 'No se pudo sincronizar'}`);
                  }
                } catch(e) {
                  alert('Error de conexión al sincronizar.');
                }
              }}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_10px_rgba(37,99,235,0.4)] rounded-lg text-xs transition-colors flex items-center gap-2"
            >
              Forzar Sincronización de Usuarios
            </button>
          </div>
          <div className="flex flex-col gap-3 p-4 pt-2">
            {loading ? (
              <div className="flex justify-center p-8 text-zinc-500">
                <Activity className="w-6 h-6 animate-spin" />
              </div>
            ) : activeDevices.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-zinc-500 gap-2 text-center">
                <Activity className="w-8 h-8 mb-2 opacity-50" />
                <p>No hay equipos aprobados en línea.</p>
              </div>
            ) : (
              activeDevices.map((device, idx) => (
                <div key={idx} className="flex flex-col p-4 bg-zinc-800/50 rounded-xl border border-green-500/20 hover:border-green-500/40 transition-colors gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                      <div>
                        <h3 className="font-bold text-zinc-200">
                          {device.name ? device.name : `SN: ${device.id}`}
                        </h3>
                        {device.name && <p className="text-xs text-zinc-400">SN: {device.id}</p>}
                        <p className="text-xs text-zinc-400 mt-0.5">
                          IP: {device.ip} {device.location && `| Ubicación: ${device.location}`} {device.model && `| Modelo: ${device.model}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-2">
                      <span className="text-xs font-medium text-green-400 bg-green-400/10 px-2 py-1 rounded border border-green-500/20">
                        En Línea
                      </span>
                      <button 
                        onClick={() => {
                          setEditingDevice(device.id);
                          setEditForm({ name: device.name || '', location: device.location || '', model: device.model || '' });
                        }}
                        className="text-xs text-blue-400 hover:text-blue-300 underline"
                      >
                        Editar Datos
                      </button>
                    </div>
                  </div>
                  
                  {editingDevice === device.id && (
                    <div className="mt-2 p-3 bg-zinc-900 rounded-lg border border-zinc-700">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                        <div>
                          <label className="block text-xs text-zinc-400 mb-1">Nombre Descriptivo</label>
                          <input 
                            type="text" 
                            value={editForm.name}
                            onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                            placeholder="Ej. Reloj Recepción" 
                            className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-sm text-white focus:outline-none focus:border-blue-500" 
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-zinc-400 mb-1">Ubicación</label>
                          <input 
                            type="text" 
                            value={editForm.location}
                            onChange={(e) => setEditForm({...editForm, location: e.target.value})}
                            placeholder="Ej. Planta Baja, Quito" 
                            className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-sm text-white focus:outline-none focus:border-blue-500" 
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-zinc-400 mb-1">Modelo ZKTeco</label>
                          <input 
                            type="text" 
                            value={editForm.model}
                            onChange={(e) => setEditForm({...editForm, model: e.target.value})}
                            placeholder="Ej. SpeedFace V5L" 
                            className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-sm text-white focus:outline-none focus:border-blue-500" 
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => setEditingDevice(null)}
                          className="px-3 py-1.5 bg-zinc-800 text-zinc-300 text-xs rounded hover:bg-zinc-700"
                        >
                          Cancelar
                        </button>
                        <button 
                          onClick={() => handleUpdateDevice(device.id)}
                          className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-500"
                        >
                          Guardar Cambios
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-1 justify-end mt-1 pt-2 border-t border-zinc-700/50">
                    <Clock className="w-3 h-3 text-zinc-500" /> 
                    <span className="text-xs text-zinc-500">
                      Último ping: {formatTime(device.lastSync)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </GlassWidget>
      </div>

      <div className="mt-2">
        <GlassWidget title="Monitor de Marcaciones (Tiempo Real)" icon={Fingerprint}>
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-300 whitespace-nowrap">
              <thead className="bg-zinc-800/80 text-zinc-400 border-b border-zinc-700">
                <tr>
                  <th className="px-6 py-4 font-medium">Fecha y Hora</th>
                  <th className="px-6 py-4 font-medium">ID de Usuario</th>
                  <th className="px-6 py-4 font-medium">Estado ZKTeco</th>
                  <th className="px-6 py-4 font-medium">Equipo (SN)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {realtimeLogs.filter((log: any) => companyEmployees.some(ce => ce.id === log.user_id)).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-zinc-500">
                      No hay marcaciones recientes en la base de datos para esta empresa.
                    </td>
                  </tr>
                ) : (
                  realtimeLogs
                    .filter((log: any) => companyEmployees.some(ce => ce.id === log.user_id))
                    .map((log: any, i: number) => {
                    const emp = companyEmployees.find(e => e.id === log.user_id);
                    const empName = emp ? emp.name : "Usuario Desconocido";
                    
                    let stateLabel = log.state;
                    let stateBadge = "bg-zinc-800 text-zinc-400 border-zinc-700";
                    switch(log.state) {
                      case "0": stateLabel = "Entrada"; stateBadge = "bg-green-500/20 text-green-400 border-green-500/30"; break;
                      case "1": stateLabel = "Salida"; stateBadge = "bg-red-500/20 text-red-400 border-red-500/30"; break;
                      case "2": stateLabel = "Descanso (Salida)"; stateBadge = "bg-orange-500/20 text-orange-400 border-orange-500/30"; break;
                      case "3": stateLabel = "Descanso (Entrada)"; stateBadge = "bg-blue-500/20 text-blue-400 border-blue-500/30"; break;
                      case "4": stateLabel = "Horas Extras (Entrada)"; stateBadge = "bg-purple-500/20 text-purple-400 border-purple-500/30"; break;
                      case "5": stateLabel = "Horas Extras (Salida)"; stateBadge = "bg-pink-500/20 text-pink-400 border-pink-500/30"; break;
                      case "255": stateLabel = "No Definido"; break;
                    }

                    return (
                      <tr key={i} className="hover:bg-zinc-800/40 transition-colors animate-in fade-in">
                        <td className="px-6 py-4 font-medium text-blue-400">{log.timestamp}</td>
                        <td className="px-6 py-4">
                          <Link href={`/people?id=${log.user_id}`} className="hover:underline flex items-center gap-2 group">
                            <span className="font-bold text-white text-lg group-hover:text-blue-400 transition-colors">{log.user_id}</span>
                            <span className="text-zinc-400 text-sm hidden md:inline-block truncate max-w-[200px]">({empName})</span>
                          </Link>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded border font-mono text-xs ${stateBadge}`}>
                            {stateLabel} ({log.state})
                          </span>
                        </td>
                        <td className="px-6 py-4 text-zinc-500 text-xs font-mono">{log.serial_number}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </GlassWidget>
      </div>

      <div className="mt-2">
        <GlassWidget title="Consola de Comandos ADMS (Sincronización)" icon={Terminal}>
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-300 whitespace-nowrap">
              <thead className="bg-zinc-800/80 text-zinc-400 border-b border-zinc-700">
                <tr>
                  <th className="px-6 py-4 font-medium">Fecha y Hora</th>
                  <th className="px-6 py-4 font-medium">Comando</th>
                  <th className="px-6 py-4 font-medium">Estado</th>
                  <th className="px-6 py-4 font-medium">ACK (Respuesta)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {commandLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-zinc-500">
                      No hay comandos recientes en la base de datos.
                    </td>
                  </tr>
                ) : (
                  commandLogs.map((cmd: any, i: number) => {
                    let statusColor = "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
                    if (cmd.status === "sent") statusColor = "bg-blue-500/20 text-blue-400 border-blue-500/30";
                    if (cmd.status === "completed") statusColor = "bg-green-500/20 text-green-400 border-green-500/30";
                    
                    return (
                      <tr key={i} className="hover:bg-zinc-800/40 transition-colors animate-in fade-in">
                        <td className="px-6 py-4 font-medium text-blue-400 text-xs">
                          {new Date(cmd.createdAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-zinc-300 font-mono text-xs max-w-[300px] truncate" title={cmd.command}>
                          {cmd.command}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded border font-medium text-xs ${statusColor}`}>
                            {cmd.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-zinc-400 font-mono text-xs">
                          {cmd.returnCode || "-"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </GlassWidget>
      </div>
    </main>
  );
}
