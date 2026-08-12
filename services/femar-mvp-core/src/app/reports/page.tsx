"use client";

import React, { useState } from "react";
import GlassWidget from "@/components/GlassWidget";
import { FileBarChart, Download, FileSpreadsheet, Calculator, Filter, Printer, User, Clock, AlertTriangle } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { useAuth } from "@/contexts/AuthContext";
import { mockEmployees } from "@/lib/mockData";
import { generatePayrollReport, getDeterministicRandom } from "@/lib/reportUtils";
import * as XLSX from "xlsx";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

function ReportsContent() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const { activeCompanyId } = useAuth();

  const companyEmployees = mockEmployees.filter(e => e.companyId === activeCompanyId);

  const [reportType, setReportType] = useState("nomina"); // nomina, faltas, atrasos, consolidado
  const [selectedEmployee, setSelectedEmployee] = useState("all");
  const [dateRange, setDateRange] = useState("month");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  
  // Custom Combobox state
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");

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
      const periodStr = getReportSubtitle();
      const report = generatePayrollReport(periodStr);
      if (selectedEmployee === "all") return report.filter(r => companyEmployees.find(ce => ce.id === r.id));
      return report.filter(r => r.id === selectedEmployee);
    }

    if (reportType === "faltas") {
      const periodStr = getReportSubtitle();
      return filteredEmployees.map(emp => {
        const faltas = emp.status === "Activo" ? getDeterministicRandom(emp.id+periodStr+"f", 0, 3) : 0;
        return {
          id: emp.id,
          name: emp.name,
          department: emp.department,
          faltasInjustificadas: faltas,
          faltasJustificadas: emp.status === "Permiso Médico" ? 5 : 0,
          total: faltas + (emp.status === "Permiso Médico" ? 5 : 0)
        };
      }).filter(e => e.total > 0 || selectedEmployee !== "all");
    }

    if (reportType === "atrasos") {
      const periodStr = getReportSubtitle();
      return filteredEmployees.map(emp => {
        const atrasos = emp.status === "Activo" ? getDeterministicRandom(emp.id+periodStr+"a", 0, 5) : 0;
        const minutos = atrasos * getDeterministicRandom(emp.id+periodStr+"m", 5, 20);
        return {
          id: emp.id,
          name: emp.name,
          department: emp.department,
          cantidadAtrasos: atrasos,
          minutosTotales: minutos
        };
      }).filter(e => e.cantidadAtrasos > 0 || selectedEmployee !== "all");
    }

    if (reportType === "consolidado") {
      return filteredEmployees.map(emp => ({
        id: emp.id,
        name: emp.name,
        status: emp.status,
        diasTrabajados: emp.status === "Activo" ? 30 : (emp.status === "Liquidado" ? 0 : 15),
        novedades: emp.status !== "Activo" ? emp.status : "Ninguna"
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
