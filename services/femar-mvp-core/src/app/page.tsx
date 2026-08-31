"use client";

import React, { useState } from "react";
import AgentCommandBar from "@/components/AgentCommandBar";
import GlassWidget from "@/components/GlassWidget";
import ExcelUploader from "@/components/ExcelUploader";
import TagsSalesWidget from "@/components/TagsSalesWidget";
import { useI18n } from "@/contexts/I18nContext";
import { useAuth } from "@/contexts/AuthContext";
import { mockEmployees } from "@/lib/mockData";
import { AlertCircle, Clock, CheckCircle2, TrendingUp, MonitorSmartphone, FileSpreadsheet } from "lucide-react";

export default function Home() {
  const { t } = useI18n();
  const { activeCompanyId, user } = useAuth();

  const hasModule = (moduleName: string) => {
    if (user?.role === 'superadmin') return true;
    return user?.modules?.includes(moduleName) || false;
  };
  const [isProcessing, setIsProcessing] = useState(false);
  const [devices, setDevices] = useState<any[]>([]);
  const [companyEmployees, setCompanyEmployees] = useState<any[]>(
    mockEmployees.filter(e => e.companyId === activeCompanyId)
  );

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
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
    })();
    return () => { cancelled = true; };
  }, [activeCompanyId]);

  React.useEffect(() => {
    const fetchDevices = async () => {
      try {
        const res = await fetch('/api/devices');
        if (res.ok) {
          const data = await res.json();
          // Only show approved/active devices
          setDevices(data.active || []);
        }
      } catch (err) {
        console.error("Error fetching devices:", err);
      }
    };
    fetchDevices();
    const interval = setInterval(fetchDevices, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleAgentCommand = (command: string) => {
    setIsProcessing(true);
    setTimeout(() => {
      console.log("Agent command executed:", command);
      setIsProcessing(false);
    }, 1500);
  };



  return (
    <main className="p-4 md:p-8 w-full max-w-7xl mx-auto flex flex-col gap-6 md:gap-8">
      
      {/* Header section */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
          FEMAR Command Center
        </h1>
        <p className="text-sm md:text-base text-zinc-400">
          Supervisión Avanzada de Fuerza Laboral y Analítica de Datos
        </p>
      </div>

      {/* Main Agent Interface */}
      <div className="w-full">
        <AgentCommandBar 
          onCommand={handleAgentCommand} 
          isProcessing={isProcessing} 
        />
      </div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 mt-4">
        
        {/* Left Column (Wider on Desktop) */}
        <div className="lg:col-span-2 flex flex-col gap-6 md:gap-8">
          
          {hasModule('anomalies') && (
            <GlassWidget title={t("anomalies")} icon={AlertCircle}>
              <div className="flex flex-col gap-3">
                {[
                  { type: 'warning', text: `${companyEmployees[0]?.name || 'Un empleado'} registró atraso de 45 mins`, time: '08:45 AM' },
                  { type: 'info', text: '5 empleados no marcaron salida ayer', time: '07:30 AM' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 md:p-4 rounded-xl bg-zinc-800/40 border border-zinc-700/50 hover:bg-zinc-800/60 transition-colors">
                    <div className="flex items-center gap-3">
                      <Clock className={`w-5 h-5 ${item.type === 'warning' ? 'text-amber-400' : 'text-blue-400'}`} />
                      <span className="text-sm md:text-base text-zinc-300">{item.text}</span>
                    </div>
                    <div className="flex items-center gap-2 md:gap-4">
                      <span className="text-xs text-zinc-500 hidden sm:block">{item.time}</span>
                      <button className="text-xs px-3 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white transition-colors">
                        {t("review")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </GlassWidget>
          )}

          {hasModule('hardware') && (
            <GlassWidget title={t("hardware")} icon={MonitorSmartphone}>
              <div className="flex justify-between items-center mb-4 border-b border-zinc-800 pb-2 px-2">
                <span className="text-xs text-zinc-400">Dispositivos Biométricos ADMS</span>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {devices.length === 0 ? (
                  <div className="text-zinc-500 text-sm p-4 text-center col-span-full">No hay equipos activos conectados</div>
                ) : devices.map((device) => {
                  const isOnline = new Date().getTime() - new Date(device.lastSync).getTime() < 300000; // 5 mins
                  return (
                    <div key={device.id} className="p-4 rounded-xl bg-zinc-800/40 border border-zinc-700/50 flex flex-col gap-2 relative overflow-hidden">
                      <div className={`absolute top-0 right-0 w-2 h-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <h4 className="font-semibold text-sm text-zinc-200 pr-4">SN: {device.id}</h4>
                      <p className="text-xs text-zinc-500">IP: {device.ip}</p>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-700/50">
                        <span className="text-xs text-zinc-400">
                          {new Date(device.lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className={`text-xs font-medium flex items-center gap-1 ${isOnline ? 'text-green-400' : 'text-red-400'}`}>
                          {isOnline ? <CheckCircle2 className="w-3 h-3"/> : <AlertCircle className="w-3 h-3"/>}
                          {isOnline ? t("online") : t("offline")}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </GlassWidget>
          )}

          {hasModule('tags_sales') && (
            <TagsSalesWidget />
          )}

        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-6 md:gap-8">
          
          {hasModule('payroll') && (
            <GlassWidget title={t("payroll")} icon={TrendingUp}>
              <div className="flex flex-col items-center justify-center py-6">
                <div className="text-3xl md:text-5xl font-bold text-white mb-2 text-glow">
                  ${companyEmployees.reduce((sum, emp) => sum + (emp.baseSalary || 0), 0).toLocaleString()}
                </div>
                <span className="text-xs md:text-sm text-zinc-400">Estimación actual bruto ({companyEmployees.length} empleados)</span>
                <button className="mt-6 w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-medium text-white transition-colors border border-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.3)]">
                  Ver Desglose
                </button>
              </div>
            </GlassWidget>
          )}

          {hasModule('upload') && (
            <GlassWidget title={t("upload")} icon={FileSpreadsheet}>
              <ExcelUploader onDataLoaded={(data) => console.log("Data Excel cargada:", data)} />
            </GlassWidget>
          )}
          
        </div>

      </div>
    </main>
  );
}
