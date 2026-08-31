"use client";

import React, { useState, useEffect } from "react";
import GlassWidget from "@/components/GlassWidget";
import { Clock, Calendar, CheckCircle2, AlertTriangle, ChevronLeft, ChevronRight, Search, Plus, Edit2, X, Save, User } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";

// Fallback local si Firestore/API no responde
const EMPLOYEES_FALLBACK = [
  { id: "1790000001", name: "Juan Pérez" },
  { id: "1790000002", name: "María Fernanda Gómez" },
  { id: "1790000003", name: "Roberto Almeida" },
  { id: "1790000004", name: "Luis Montero" },
  { id: "1790000005", name: "Sofía Ruiz" },
  { id: "1790000006", name: "Ana Lucía Torres" },
  { id: "1790000007", name: "Carlos Mendoza" },
  { id: "1790000008", name: "Diana Vega" },
  { id: "1790000009", name: "Carmen Salazar" },
  { id: "1790000010", name: "Pedro Páez" },
  { id: "1790000011", name: "Javier Viteri" },
  { id: "1790000012", name: "Elena Castro" }
];

export default function SchedulesPage() {
  const { t } = useI18n();
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const itemsPerPage = 15;

  const [schedules, setSchedules] = useState<any[]>([]);
  const [employees, setEmployees] = useState<Array<{ id: string; name: string }>>(EMPLOYEES_FALLBACK);
  const [isInitialized, setIsInitialized] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<any | null>(null);
  
  // Form State
  const [formEmployeeId, setFormEmployeeId] = useState("");
  const [formShift, setFormShift] = useState("Mañana (08:00 - 17:00)");
  const [formDate, setFormDate] = useState("");
  const [formStatus, setFormStatus] = useState("Pendiente");

  // Status mapping
  const statuses = {
    "Completado": "bg-green-500/10 text-green-400 border-green-500/30",
    "Falta Injustificada": "bg-red-500/10 text-red-400 border-red-500/30",
    "Atraso": "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
    "Vacaciones": "bg-purple-500/10 text-purple-400 border-purple-500/30",
    "Pendiente": "bg-blue-500/10 text-blue-400 border-blue-500/30"
  };

  const withStatusColor = (rows: any[]) =>
    rows.map((row) => ({
      ...row,
      color: statuses[row.status as keyof typeof statuses] || statuses.Pendiente,
    }));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let roster = EMPLOYEES_FALLBACK;
      try {
        const empRes = await fetch("/api/employees");
        if (empRes.ok) {
          const empData = await empRes.json();
          if (!cancelled && Array.isArray(empData.employees) && empData.employees.length > 0) {
            roster = empData.employees
              .map((e: { id?: string; name?: string }) => ({
                id: String(e.id || ""),
                name: String(e.name || "Sin nombre"),
              }))
              .filter((e: { id: string }) => e.id);
            setEmployees(roster);
          }
        }
      } catch {
        // keep EMPLOYEES_FALLBACK
      }

      try {
        const res = await fetch("/api/schedules?limit=500");
        if (!res.ok) throw new Error("schedules fetch failed");
        const data = await res.json();
        if (!cancelled && Array.isArray(data.schedules) && data.schedules.length > 0) {
          setSchedules(withStatusColor(data.schedules));
          setIsInitialized(true);
          return;
        }
      } catch {
        // fall through to legacy mock seed below
      }
      if (cancelled) return;
    const shiftsList = [
      "Mañana (08:00 - 17:00)", 
      "Tarde (14:00 - 22:00)", 
      "Noche (22:00 - 06:00)"
    ];
    const statusKeys = ["Completado", "Falta Injustificada", "Atraso", "Vacaciones"];

    const initialSchedules = [];
    const today = new Date();
    
    for (let i = 0; i < 1500; i++) {
      const emp = roster[i % roster.length];
      const shift = shiftsList[i % shiftsList.length];
      
      const statusRoll = Math.random();
      let status = statusKeys[0]; 
      if (statusRoll > 0.8 && statusRoll <= 0.9) status = statusKeys[2]; 
      if (statusRoll > 0.9 && statusRoll <= 0.95) status = statusKeys[1]; 
      if (statusRoll > 0.95) status = statusKeys[3]; 

      const date = new Date(today);
      date.setDate(date.getDate() - Math.floor(i / roster.length));
      
      initialSchedules.push({
        id: `SCH-${1500 - i}`,
        employeeId: emp.id,
        employeeName: emp.name,
        shift,
        date: date.toISOString().split('T')[0],
        status,
        color: statuses[status as keyof typeof statuses],
      });
    }
    setSchedules(withStatusColor(initialSchedules));
    setIsInitialized(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleOpenCreate = () => {
    setEditingSchedule(null);
    setFormEmployeeId("");
    setFormShift("Mañana (08:00 - 17:00)");
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormStatus("Pendiente");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (schedule: any) => {
    setEditingSchedule(schedule);
    setFormEmployeeId(schedule.employeeId);
    setFormShift(schedule.shift);
    setFormDate(schedule.date);
    setFormStatus(schedule.status);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formEmployeeId || !formDate) return;

    const selectedEmp = employees.find(e => e.id === formEmployeeId);
    if (!selectedEmp) return;

    if (editingSchedule) {
      setSchedules(schedules.map(s => 
        s.id === editingSchedule.id 
          ? { ...s, shift: formShift, date: formDate, status: formStatus, color: statuses[formStatus as keyof typeof statuses] } 
          : s
      ));
      setIsModalOpen(false);
      return;
    }

    try {
      const res = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: selectedEmp.id,
          employeeName: selectedEmp.name,
          shift: formShift,
          date: formDate,
          status: formStatus,
        }),
      });
      if (!res.ok) throw new Error("create schedule failed");
      const data = await res.json();
      const created = withStatusColor([data.schedule])[0];
      setSchedules([created, ...schedules]);
    } catch {
      const fallback = withStatusColor([{
        id: `SCH-NEW-${Date.now()}`,
        employeeId: selectedEmp.id,
        employeeName: selectedEmp.name,
        shift: formShift,
        date: formDate,
        status: formStatus,
      }])[0];
      setSchedules([fallback, ...schedules]);
    }
    setIsModalOpen(false);
  };

  const filteredSchedules = schedules.filter(s => 
    s.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.employeeId.includes(searchTerm) ||
    s.date.includes(searchTerm)
  );

  const paginatedSchedules = filteredSchedules.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  const totalPages = Math.ceil(filteredSchedules.length / itemsPerPage) || 1;

  return (
    <main className="p-4 md:p-8 w-full max-w-7xl mx-auto flex flex-col gap-6 md:gap-8">
      <div className="flex flex-col gap-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
              {t("schedules")}
            </h1>
            <p className="text-sm md:text-base text-zinc-400">
              Historial y asignación de jornadas laborales
            </p>
          </div>
          <button 
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors font-medium text-sm shadow-[0_0_15px_rgba(37,99,235,0.3)] w-fit"
          >
            <Plus className="w-4 h-4" /> Asignar Nuevo Turno
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <GlassWidget title={`Historial Operativo (${filteredSchedules.length} registros)`} icon={Clock}>
          <div className="p-4 border-b border-zinc-800/50">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input 
                type="text" 
                placeholder="Buscar por empleado, cédula o fecha (ej. 2026-08-15)..." 
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-zinc-900/50 border border-zinc-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 p-4">
            {paginatedSchedules.map((schedule) => (
              <div key={schedule.id} className="group flex flex-col md:flex-row items-start md:items-center justify-between p-4 bg-zinc-800/40 border border-zinc-700/50 rounded-xl hover:border-blue-500/50 hover:bg-zinc-800/60 transition-colors gap-4">
                <div className="flex items-center gap-4 w-full md:w-auto">
                  <div className="p-3 bg-blue-500/10 rounded-full border border-blue-500/20 hidden md:block">
                    <Calendar className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-zinc-200">{schedule.employeeName}</h4>
                    <p className="text-xs text-zinc-400 flex items-center gap-1 mt-1">
                      <User className="w-3 h-3" /> C.I. {schedule.employeeId}
                    </p>
                    <p className="text-sm text-zinc-300 mt-1">Turno {schedule.shift}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-none border-zinc-700/50 pt-3 md:pt-0 relative">
                  <span className="text-sm font-medium text-zinc-300 bg-zinc-900/50 px-3 py-1 rounded-md">{schedule.date}</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1 min-w-[140px] justify-center ${schedule.color}`}>
                    {schedule.status === "Completado" && <CheckCircle2 className="w-3 h-3" />}
                    {(schedule.status === "Falta Injustificada" || schedule.status === "Atraso") && <AlertTriangle className="w-3 h-3" />}
                    {schedule.status}
                  </span>
                  
                  <button 
                    onClick={() => handleOpenEdit(schedule)}
                    className="p-2 text-zinc-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all absolute -right-2 top-0 md:static"
                    title="Editar Turno"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-zinc-800/50 flex items-center justify-between">
            <span className="text-sm text-zinc-400">Página {page} de {totalPages}</span>
            <div className="flex gap-2">
              <button 
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="p-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:hover:bg-zinc-800 text-white rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
                className="p-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:hover:bg-zinc-800 text-white rounded-lg transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </GlassWidget>
      </div>

      {/* Modal Crear/Editar */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 sticky top-0 bg-zinc-900 pt-2 pb-4 border-b border-zinc-800 z-10">
              <h2 className="text-xl font-bold text-white">
                {editingSchedule ? "Editar Turno" : "Asignar Nuevo Turno"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">
                  Empleado <span className="text-red-500">*</span>
                </label>
                {editingSchedule ? (
                  // Modo Edición: Cédula/Nombre Bloqueados
                  <div className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-300 opacity-70 flex justify-between items-center cursor-not-allowed">
                    <span>{editingSchedule.employeeName}</span>
                    <span className="text-xs font-mono text-zinc-500">C.I. {editingSchedule.employeeId}</span>
                  </div>
                ) : (
                  // Modo Creación: Selector de empleados existentes
                  <select
                    value={formEmployeeId}
                    onChange={(e) => setFormEmployeeId(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="" disabled>Seleccione un empleado de la lista...</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} (C.I. {emp.id})
                      </option>
                    ))}
                  </select>
                )}
                {editingSchedule && <p className="text-xs text-red-400/80 mt-1">El empleado no puede ser modificado en un turno existente.</p>}
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">
                  Fecha <span className="text-red-500">*</span>
                </label>
                <input 
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">Horario del Turno</label>
                <select 
                  value={formShift}
                  onChange={(e) => setFormShift(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option>Mañana (08:00 - 17:00)</option>
                  <option>Tarde (14:00 - 22:00)</option>
                  <option>Noche (22:00 - 06:00)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">Estado</label>
                <select 
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option>Pendiente</option>
                  <option>Completado</option>
                  <option>Atraso</option>
                  <option>Falta Injustificada</option>
                  <option>Vacaciones</option>
                </select>
              </div>
            </div>

            <div className="mt-8 flex gap-3 justify-end sticky bottom-0 bg-zinc-900 pt-4 border-t border-zinc-800">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors font-medium text-sm"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSave}
                disabled={!formEmployeeId || !formDate}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-medium text-sm flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" /> Guardar Turno
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
