"use client";

import React, { useState } from "react";
import AgentCommandBar from "@/components/AgentCommandBar";
import ClientErrorBoundary from "@/components/ClientErrorBoundary";
import GlassWidget from "@/components/GlassWidget";
import ExcelUploader from "@/components/ExcelUploader";
import { useI18n } from "@/contexts/I18nContext";
import { useAuth } from "@/contexts/AuthContext";
import { useEmployees } from "@/hooks/useEmployees";
import { AlertCircle, CheckCircle2, Clock, FileSpreadsheet, Fingerprint, MonitorSmartphone, TrendingUp } from "lucide-react";

export default function Home() {
  return (
    <ClientErrorBoundary fallbackTitle="Dashboard recovery mode">
      <DashboardContent />
    </ClientErrorBoundary>
  );
}

function DashboardContent() {
  const { t, language } = useI18n();
  const { activeCompanyId, user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [devices, setDevices] = useState<any[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const { employees: companyEmployees } = useEmployees(activeCompanyId);

  const hasModule = (moduleName: string) => {
    if (user?.role === "superadmin") return true;
    return user?.modules?.includes(moduleName) || false;
  };

  React.useEffect(() => {
    const fetchLiveData = async () => {
      try {
        const [devicesRes, admsRes, mobileRes] = await Promise.all([
          fetch("/api/devices", { cache: "no-store" }),
          fetch("/api/logs/realtime", { cache: "no-store" }),
          fetch("/api/mobile/logs", { cache: "no-store" }),
        ]);

        if (devicesRes.ok) {
          const data = await devicesRes.json();
          setDevices(data.active || []);
        }

        const admsData = admsRes.ok ? await admsRes.json() : { logs: [] };
        const mobileData = mobileRes.ok ? await mobileRes.json() : { logs: [] };
        const employeeIds = new Set(companyEmployees.map((emp) => emp.id));
        const logs = [
          ...(admsData.logs || []).map((log: any) => ({ ...log, source: "ZKTECO" })),
          ...(mobileData.logs || []).map((log: any) => ({ ...log, source: "MOBILE" })),
        ]
          .filter((log: any) => !employeeIds.size || employeeIds.has(log.user_id) || log.companyId === activeCompanyId)
          .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 12);
        setAttendanceLogs(logs);
      } catch (err) {
        console.error("Error fetching live workforce data:", err);
      }
    };

    fetchLiveData();
    const interval = setInterval(fetchLiveData, 5000);
    return () => clearInterval(interval);
  }, [activeCompanyId]);

  const handleAgentCommand = (command: string) => {
    setIsProcessing(true);
    setTimeout(() => {
      console.log("Agent command executed:", command);
      setIsProcessing(false);
    }, 800);
  };

  const copy = {
    title: language === "es" ? "Centro de Control FEMAR" : "FEMAR Command Center",
    subtitle: language === "es" ? "Asistencia, reportes, prenomina y agente Gemini" : "Attendance, reports, pre-payroll, and Gemini agent",
    liveMarks: language === "es" ? "Marcaciones en Vivo" : "Live Attendance",
    noMarks: language === "es" ? "No hay marcaciones recientes para esta empresa." : "No recent attendance events for this company.",
    sync: language === "es" ? "Forzar Sincronización" : "Force Sync",
    deviceTitle: language === "es" ? "Dispositivos Biométricos ADMS" : "ADMS Biometric Devices",
    date: language === "es" ? "Fecha / Hora" : "Date / Time",
    employee: language === "es" ? "Empleado" : "Employee",
    source: language === "es" ? "Origen" : "Source",
    status: language === "es" ? "Estado" : "Status",
    in: language === "es" ? "Entrada" : "Check-in",
    out: language === "es" ? "Salida" : "Check-out",
    mark: language === "es" ? "Marcación" : "Attendance",
  };

  return (
    <main className="p-4 md:p-8 w-full max-w-7xl mx-auto flex flex-col gap-6 md:gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
          {copy.title}
        </h1>
        <p className="text-sm md:text-base text-zinc-400">{copy.subtitle}</p>
      </div>

      <div className="w-full">
        <ClientErrorBoundary fallbackTitle="Gemini agent unavailable">
          <AgentCommandBar onCommand={handleAgentCommand} isProcessing={isProcessing} />
        </ClientErrorBoundary>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 mt-4">
        <div className="lg:col-span-2 flex flex-col gap-6 md:gap-8">
          {hasModule("hardware") && (
            <GlassWidget title={t("hardware")} icon={MonitorSmartphone}>
              <div className="flex justify-between items-center mb-4 border-b border-zinc-800 pb-2 px-2">
                <span className="text-xs text-zinc-400">{copy.deviceTitle}</span>
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch("/api/sync-test");
                      const data = await res.json();
                      alert(data.success ? `Sync started: ${data.queued} queued commands.` : `Error: ${data.message || "Sync failed"}`);
                    } catch {
                      alert("Connection error while syncing.");
                    }
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs transition-colors"
                >
                  {copy.sync}
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {devices.length === 0 ? (
                  <div className="text-zinc-500 text-sm p-4 text-center col-span-full">No active devices connected</div>
                ) : devices.map((device) => {
                  const isOnline = device.lastSync && new Date().getTime() - new Date(device.lastSync).getTime() < 300000;
                  return (
                    <div key={device.id} className="p-4 rounded-xl bg-zinc-800/40 border border-zinc-700/50 flex flex-col gap-2 relative overflow-hidden">
                      <div className={`absolute top-0 right-0 w-2 h-full ${isOnline ? "bg-green-500" : "bg-red-500"}`} />
                      <h4 className="font-semibold text-sm text-zinc-200 pr-4">SN: {device.id}</h4>
                      <p className="text-xs text-zinc-500">IP: {device.ip || "N/A"}</p>
                      <span className={`text-xs font-medium flex items-center gap-1 ${isOnline ? "text-green-400" : "text-red-400"}`}>
                        {isOnline ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                        {isOnline ? t("online") : t("offline")}
                      </span>
                    </div>
                  );
                })}
              </div>
            </GlassWidget>
          )}

          <ClientErrorBoundary fallbackTitle="Live attendance unavailable">
            <GlassWidget title={copy.liveMarks} icon={Fingerprint}>
              <div className="p-0 overflow-x-auto">
                <table className="w-full text-left text-sm text-zinc-300 whitespace-nowrap">
                  <thead className="bg-zinc-800/80 text-zinc-400 border-b border-zinc-700">
                    <tr>
                      <th className="px-4 py-3">{copy.date}</th>
                      <th className="px-4 py-3">{copy.employee}</th>
                      <th className="px-4 py-3">{copy.source}</th>
                      <th className="px-4 py-3">{copy.status}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {attendanceLogs.length === 0 ? (
                      <tr><td colSpan={4} className="px-4 py-8 text-center text-zinc-500">{copy.noMarks}</td></tr>
                    ) : attendanceLogs.map((log: any) => {
                      const emp = companyEmployees.find((item) => item.id === log.user_id);
                      const state = String(log.state ?? "");
                      const label = state === "0" ? copy.in : state === "1" ? copy.out : copy.mark;
                      const timestamp = typeof log.timestamp === "string" ? log.timestamp : log.timestamp?.toDate?.()?.toISOString?.() || new Date().toISOString();
                      return (
                        <tr key={log.id || `${log.user_id}-${timestamp}`} className="hover:bg-zinc-800/40">
                          <td className="px-4 py-3 text-blue-400">{new Date(timestamp).toLocaleString(language === "es" ? "es-EC" : "en-US")}</td>
                          <td className="px-4 py-3 text-white">{emp?.name || log.user_id || "Mobile user"}</td>
                          <td className="px-4 py-3">{log.source}</td>
                          <td className="px-4 py-3">{label}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </GlassWidget>
          </ClientErrorBoundary>
        </div>

        <div className="flex flex-col gap-6 md:gap-8">
          {hasModule("payroll") && (
            <GlassWidget title={t("payroll")} icon={TrendingUp}>
              <div className="flex flex-col items-center justify-center py-6">
                <div className="text-3xl md:text-5xl font-bold text-white mb-2 text-glow">
                  ${companyEmployees.reduce((sum, emp) => sum + (Number(emp.baseSalary) || 0), 0).toLocaleString()}
                </div>
                <span className="text-xs md:text-sm text-zinc-400">Gross estimate ({companyEmployees.length} employees)</span>
              </div>
            </GlassWidget>
          )}

          {hasModule("upload") && (
            <GlassWidget title={t("upload")} icon={FileSpreadsheet}>
              <ExcelUploader onDataLoaded={(data) => console.log("Excel data loaded:", data)} />
            </GlassWidget>
          )}
        </div>
      </div>
    </main>
  );
}
