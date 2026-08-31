"use client";

import React, { useState, useEffect } from "react";
import GlassWidget from "@/components/GlassWidget";
import { FileBarChart, Download, FileSpreadsheet, Calculator, Filter, Printer, User, Clock, AlertTriangle, MapPin } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { useAuth } from "@/contexts/AuthContext";
import { mockEmployees } from "@/lib/mockData";
import { generateDeterministicPayroll } from "@/lib/reportUtils";
import * as XLSX from "xlsx";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const LocationAddress = ({ lat, lng }: { lat: number; lng: number }) => {
  const [address, setAddress] = useState<string>("Cargando ubicación...");
  
  React.useEffect(() => {
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`)
      .then(res => res.json())
      .then(data => {
        if (data && data.display_name) {
          const parts = data.display_name.split(", ");
          setAddress(parts.slice(0, 3).join(", "));
        } else {
          setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        }
      })
      .catch(() => setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`));
  }, [lat, lng]);

  return <span className="text-zinc-300 block text-xs mb-1 truncate max-w-[250px]" title={address}>{address}</span>;
};

export const dynamic = "force-dynamic";

function ReportsContent() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const { activeCompanyId } = useAuth();

  const mockFallback = mockEmployees.filter(e => e.companyId === activeCompanyId);
  const [companyEmployees, setCompanyEmployees] = useState<any[]>(mockFallback);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const fallback = mockEmployees.filter(e => e.companyId === activeCompanyId);
      try {
        const url = activeCompanyId
          ? `/api/employees?companyId=${encodeURIComponent(activeCompanyId)}`
          : "/api/employees";
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && Array.isArray(data.employees) && data.employees.length > 0) {
            setCompanyEmployees(data.employees);
            return;
          }
        }
      } catch {
        // fallback below
      }
      if (!cancelled) setCompanyEmployees(fallback);
    })();
    return () => {
      cancelled = true;
    };
  }, [activeCompanyId]);

  const [reportType, setReportType] = useState("nomina"); // nomina, faltas, atrasos, consolidado
  const [selectedEmployee, setSelectedEmployee] = useState("all");
  const [dateRange, setDateRange] = useState("month");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  
  // Custom Combobox state
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");

  const [mobileLogs, setMobileLogs] = useState<any[]>([]);
  const [loadingMobileLogs, setLoadingMobileLogs] = useState(false);

  React.useEffect(() => {
    // Fetch logs for ALL report types since we removed fake data generators
    setLoadingMobileLogs(true);
    fetch('/api/mobile/logs')
      .then(res => res.json())
      .then(data => {
        if (data.logs) {
          setMobileLogs(data.logs);
        }
      })
      .finally(() => setLoadingMobileLogs(false));
  }, [activeCompanyId]);

  React.useEffect(() => {
    if (searchParams?.get("download") === "pdf") {
      setTimeout(() => {
        window.print();
      }, 1000);
    }
  }, [searchParams]);

  const getReportSubtitle = () => {
    if (dateRange === "month") return "Mes Actual";
    if (dateRange === "last_month") return "Mes Anterior";
    if (dateRange === "year") return "Año en Curso";
    if (dateRange === "custom" && customStartDate && customEndDate) return `Del ${customStartDate} al ${customEndDate}`;
    return "Periodo Personalizado";
  };

  // Generate dynamic fake data for the selected report
  const generateReportData = () => {
    let filteredEmployees = companyEmployees;
    if (selectedEmployee !== "all") {
      filteredEmployees = companyEmployees.filter(e => e.id === selectedEmployee);
    }

    if (reportType === "nomina") {
      const report = generateDeterministicPayroll(companyEmployees, mobileLogs);
      if (selectedEmployee === "all") return report;
      return report.filter(r => r.id === selectedEmployee);
    }

    // Since we removed fake data generators, other reports will just show empty or basic info
    // For XPRIZE, the main focus is the agent and payroll deterministic logic.
    if (reportType === "faltas") {
      return filteredEmployees.map(emp => ({
        id: emp.id,
        name: emp.name,
        department: emp.department,
        faltasInjustificadas: 0, // Requires real attendance backend
        faltasJustificadas: 0,
        total: 0
      })).filter(e => selectedEmployee !== "all" || true);
    }

    if (reportType === "atrasos") {
      return filteredEmployees.map(emp => ({
        id: emp.id,
        name: emp.name,
        department: emp.department,
        cantidadAtrasos: 0, // Requires real attendance backend
        minutosTotales: 0
      })).filter(e => selectedEmployee !== "all" || true);
    }

    if (reportType === "consolidado") {
      return filteredEmployees.map(emp => ({
        id: emp.id,
        name: emp.name,
        status: emp.status,
        diasTrabajados: 0,
        novedades: "Ninguna"
      }));
    }

    return [];
  };

  const reportData = generateReportData();

  // Calculate totals for nomina
  const totalsNomina = reportType === "nomina" ? reportData.reduce((acc: any, row: any) => ({
    base: acc.base + row.base,
    overtime: acc.overtime + row.overtime,
    iess: acc.iess + row.iess,
    penalty: acc.penalty + row.penalty,
    net: acc.net + row.net
  }), { base: 0, overtime: 0, iess: 0, penalty: 0, net: 0 }) : null;

  const handleExportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(reportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte");
    XLSX.writeFile(workbook, `Reporte_FEMAR_${reportType}.xlsx`);
  };

  return (
    <main className="p-4 md:p-8 w-full max-w-7xl mx-auto flex flex-col gap-6 md:gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
          Generador de Reportes
        </h1>
        <p className="text-sm md:text-base text-zinc-400">
          Crea analíticas detalladas de asistencia, atrasos, faltas y nómina para tus empleados.
        </p>
      </div>

      <GlassWidget title="Filtros del Reporte" icon={Filter}>
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Tipo de Reporte</label>
            <select 
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="nomina">Rol de Pagos (Sueldos y Descuentos)</option>
              <option value="faltas">Reporte de Faltas (Ausentismo)</option>
              <option value="atrasos">Reporte de Atrasos (Minutos tarde)</option>
              <option value="consolidado">Consolidado General por Persona</option>
              <option value="mobile_checkins">Marcaciones Móviles (GPS y Fotos)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Periodo</label>
            <select 
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="month">Mes Actual</option>
              <option value="last_month">Mes Anterior</option>
              <option value="year">Año en curso</option>
              <option value="custom">Rango Personalizado...</option>
            </select>
            {dateRange === "custom" && (
              <div className="flex gap-2 mt-2">
                <input 
                  type="date" 
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-2 text-white focus:outline-none text-xs" 
                />
                <input 
                  type="date" 
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-2 text-white focus:outline-none text-xs" 
                />
              </div>
            )}
          </div>
          <div className="relative">
            <label className="block text-sm text-zinc-400 mb-2">Buscar Empleado</label>
            <div 
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white flex items-center justify-between cursor-text relative z-20"
              onClick={() => setIsEmployeeDropdownOpen(true)}
            >
              <input
                type="text"
                placeholder="Escribe el apellido o nombre..."
                value={employeeSearch}
                onChange={(e) => {
                  setEmployeeSearch(e.target.value);
                  setIsEmployeeDropdownOpen(true);
                  if (e.target.value === "") setSelectedEmployee("all");
                }}
                onFocus={() => setIsEmployeeDropdownOpen(true)}
                className="bg-transparent border-none outline-none w-full text-white placeholder-zinc-500"
              />
              <User className="w-4 h-4 text-zinc-500" />
            </div>
            
            {isEmployeeDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setIsEmployeeDropdownOpen(false)} 
                />
                <div className="absolute top-full left-0 mt-2 w-full bg-zinc-800 border border-zinc-700 rounded-xl shadow-2xl z-20 max-h-60 overflow-y-auto">
                  <div 
                    className={`p-3 text-sm cursor-pointer hover:bg-zinc-700/50 ${selectedEmployee === "all" ? "text-blue-400 bg-blue-500/10" : "text-white"}`}
                    onClick={() => {
                      setSelectedEmployee("all");
                      setEmployeeSearch("");
                      setIsEmployeeDropdownOpen(false);
                    }}
                  >
                    Todos los Empleados ({companyEmployees.length})
                  </div>
                  {companyEmployees
                    .slice()
                    .sort((a,b) => a.firstLastName.localeCompare(b.firstLastName))
                    .filter(emp => emp.name.toLowerCase().includes(employeeSearch.toLowerCase()) || emp.id.includes(employeeSearch))
                    .map(emp => (
                      <div 
                        key={emp.id}
                        className={`p-3 text-sm cursor-pointer hover:bg-zinc-700/50 border-t border-zinc-700/50 ${selectedEmployee === emp.id ? "text-blue-400 bg-blue-500/10" : "text-zinc-300"}`}
                        onClick={() => {
                          setSelectedEmployee(emp.id);
                          setEmployeeSearch(emp.name);
                          setIsEmployeeDropdownOpen(false);
                        }}
                      >
                        {emp.firstLastName} {emp.secondLastName} {emp.firstName} {emp.secondName}
                      </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </GlassWidget>

      <GlassWidget 
        title={`Vista Previa del Reporte (${getReportSubtitle()})`} 
        icon={FileBarChart}
      >
        <div className="p-0 overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-300 whitespace-nowrap">
            <thead className="bg-zinc-800/80 text-zinc-400 border-b border-zinc-700">
              <tr>
                {reportType === "nomina" && (
                  <>
                    <th className="px-6 py-4 font-medium">Empleado</th>
                    <th className="px-6 py-4 font-medium">C.I.</th>
                    <th className="px-6 py-4 font-medium text-right">Sueldo Base</th>
                    <th className="px-6 py-4 font-medium text-right text-green-400">H. Extras</th>
                    <th className="px-6 py-4 font-medium text-right text-red-400">IESS</th>
                    <th className="px-6 py-4 font-medium text-right text-red-400">Multas</th>
                    <th className="px-6 py-4 font-bold text-right text-blue-400">Líquido a Recibir</th>
                  </>
                )}
                {reportType === "faltas" && (
                  <>
                    <th className="px-6 py-4 font-medium">Empleado</th>
                    <th className="px-6 py-4 font-medium">Departamento</th>
                    <th className="px-6 py-4 font-medium text-center text-red-400">Faltas Injustificadas</th>
                    <th className="px-6 py-4 font-medium text-center text-yellow-400">Faltas Justificadas</th>
                    <th className="px-6 py-4 font-bold text-center">Total Faltas</th>
                  </>
                )}
                {reportType === "atrasos" && (
                  <>
                    <th className="px-6 py-4 font-medium">Empleado</th>
                    <th className="px-6 py-4 font-medium">Departamento</th>
                    <th className="px-6 py-4 font-medium text-center text-orange-400">Nº de Atrasos</th>
                    <th className="px-6 py-4 font-medium text-center text-red-400">Minutos Totales Perdidos</th>
                  </>
                )}
                {reportType === "consolidado" && (
                  <>
                    <th className="px-6 py-4 font-medium">Empleado</th>
                    <th className="px-6 py-4 font-medium">C.I.</th>
                    <th className="px-6 py-4 font-medium text-center">Días Trabajados</th>
                    <th className="px-6 py-4 font-medium">Estado / Novedades</th>
                  </>
                )}
                {reportType === "mobile_checkins" && (
                  <>
                    <th className="px-6 py-4 font-medium">Empleado (ID)</th>
                    <th className="px-6 py-4 font-medium">Fecha y Hora</th>
                    <th className="px-6 py-4 font-medium">Ubicación GPS</th>
                    <th className="px-6 py-4 font-medium">Foto (Liveness)</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {reportData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-zinc-500">
                    No hay datos para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                reportData.map((row: any, i) => (
                  <tr key={i} className="hover:bg-zinc-800/40 transition-colors">
                    {reportType === "nomina" && (
                      <>
                        <td className="px-6 py-4 font-medium text-zinc-200">{row.name}</td>
                        <td className="px-6 py-4 text-zinc-500">{row.id}</td>
                        <td className="px-6 py-4 text-right">${row.base.toFixed(2)}</td>
                        <td className="px-6 py-4 text-right text-green-400/90">${row.overtime.toFixed(2)}</td>
                        <td className="px-6 py-4 text-right text-red-400/90">-${row.iess.toFixed(2)}</td>
                        <td className="px-6 py-4 text-right text-red-400/90">-${row.penalty.toFixed(2)}</td>
                        <td className="px-6 py-4 text-right font-bold text-blue-400">${row.net.toFixed(2)}</td>
                      </>
                    )}
                    {reportType === "faltas" && (
                      <>
                        <td className="px-6 py-4 font-medium text-zinc-200">{row.name}</td>
                        <td className="px-6 py-4 text-zinc-400">{row.department}</td>
                        <td className="px-6 py-4 text-center text-red-400/90 font-bold">{row.faltasInjustificadas}</td>
                        <td className="px-6 py-4 text-center text-yellow-400/90">{row.faltasJustificadas}</td>
                        <td className="px-6 py-4 text-center font-bold">{row.total}</td>
                      </>
                    )}
                    {reportType === "atrasos" && (
                      <>
                        <td className="px-6 py-4 font-medium text-zinc-200">{row.name}</td>
                        <td className="px-6 py-4 text-zinc-400">{row.department}</td>
                        <td className="px-6 py-4 text-center text-orange-400/90 font-bold">{row.cantidadAtrasos}</td>
                        <td className="px-6 py-4 text-center text-red-400/90 font-bold">{row.minutosTotales} min</td>
                      </>
                    )}
                    {reportType === "consolidado" && (
                      <>
                        <td className="px-6 py-4 font-medium text-zinc-200">{row.name}</td>
                        <td className="px-6 py-4 text-zinc-500">{row.id}</td>
                        <td className="px-6 py-4 text-center font-bold text-blue-400">{row.diasTrabajados}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs border ${
                            row.status === "Activo" ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                          }`}>
                            {row.status}
                          </span>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
              {reportType === "mobile_checkins" && (
                loadingMobileLogs ? (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-zinc-500">Cargando marcaciones y resolviendo imágenes seguras...</td></tr>
                ) : mobileLogs.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-zinc-500">No hay marcaciones móviles registradas aún.</td></tr>
                ) : (
                  mobileLogs.map((log: any, i) => {
                    const date = new Date(log.timestamp).toLocaleString('es-EC');
                    const mapLink = `https://www.google.com/maps?q=${log.location.lat},${log.location.lng}`;
                    const userId = log.user_id === "mobile-user" ? "3333333333" : log.user_id;
                    const employee = companyEmployees.find(e => e.id === userId);
                    const employeeName = employee ? employee.name : (userId === "3333333333" ? "Empleado Prueba" : "Desconocido");

                    return (
                      <tr key={i} className="hover:bg-zinc-800/40 transition-colors">
                        <td className="px-6 py-4">
                          <span className="font-medium text-zinc-200 block">{employeeName}</span>
                          <span className="text-xs text-zinc-500 font-normal">C.I. {userId}</span>
                        </td>
                        <td className="px-6 py-4 text-zinc-300">{date}</td>
                        <td className="px-6 py-4">
                          <LocationAddress lat={log.location.lat} lng={log.location.lng} />
                          <a href={mapLink} target="_blank" rel="noreferrer" className="text-blue-400 text-xs hover:underline flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3" /> Ver en Google Maps
                          </a>
                        </td>
                        <td className="px-6 py-4">
                          {log.photo_url ? (
                            <a href={log.photo_url} target="_blank" rel="noreferrer">
                              <img src={log.photo_url} alt="Checkin" className="w-12 h-12 rounded-lg object-cover border border-zinc-700 hover:border-blue-500 transition-colors" />
                            </a>
                          ) : (
                            <span className="text-zinc-500">Sin foto</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )
              )}
              {reportType === "nomina" && totalsNomina && reportData.length > 0 && (
                <tr className="bg-zinc-800/80 border-t border-zinc-700">
                  <td className="px-6 py-4 font-bold text-zinc-200" colSpan={2}>TOTALES ({reportData.length} Empleados)</td>
                  <td className="px-6 py-4 text-right font-bold text-zinc-200">${totalsNomina.base.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right font-bold text-green-400/90">+${totalsNomina.overtime.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right font-bold text-red-400/90">-${totalsNomina.iess.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right font-bold text-red-400/90">-${totalsNomina.penalty.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right font-bold text-blue-400">${totalsNomina.net.toFixed(2)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 rounded-b-2xl flex flex-wrap justify-end gap-3 print:hidden">
          <button 
            onClick={() => window.print()}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors font-medium text-sm flex items-center gap-2 border border-zinc-700"
          >
            <Printer className="w-4 h-4" /> Imprimir
          </button>
          <button 
            onClick={handleExportExcel}
            className="px-4 py-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-xl transition-colors font-medium text-sm flex items-center gap-2 border border-green-500/30"
          >
            <FileSpreadsheet className="w-4 h-4" /> Exportar a Excel
          </button>
          <button 
            onClick={() => window.print()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors font-medium text-sm flex items-center gap-2 shadow-[0_0_15px_rgba(37,99,235,0.4)]"
          >
            <Download className="w-4 h-4" /> Descargar PDF
          </button>
        </div>
      </GlassWidget>
    </main>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-zinc-500">Cargando reportes...</div>}>
      <ReportsContent />
    </Suspense>
  );
}
