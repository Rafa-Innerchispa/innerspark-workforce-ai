"use client";

import React from "react";
import Link from "next/link";
import { Users, FileBarChart, MonitorSmartphone, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEmployees } from "@/hooks/useEmployees";

export default function Home() {
  const { activeCompanyId, user } = useAuth();
  const { employees, loadingEmployees, employeeError } = useEmployees(activeCompanyId);
  const totalPayroll = employees.reduce((sum, emp) => sum + (Number(emp.baseSalary) || 0), 0);

  return (
    <main className="p-4 md:p-8 w-full max-w-7xl mx-auto flex flex-col gap-6 md:gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl md:text-4xl font-bold text-white">Workforce Control</h1>
        <p className="text-sm md:text-base text-zinc-400">
          {user?.name || "Usuario"} - {(activeCompanyId || "femar").toUpperCase()}
        </p>
      </div>

      {employeeError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
          No se pudieron cargar empleados: {employeeError}
        </div>
      )}

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5">
          <div className="flex items-center gap-3 text-zinc-400 mb-3">
            <Users className="w-5 h-5 text-blue-400" />
            <span>Empleados</span>
          </div>
          <div className="text-4xl font-bold text-white">{loadingEmployees ? "..." : employees.length}</div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5">
          <div className="flex items-center gap-3 text-zinc-400 mb-3">
            <FileBarChart className="w-5 h-5 text-emerald-400" />
            <span>Base salarial</span>
          </div>
          <div className="text-4xl font-bold text-white">${totalPayroll.toLocaleString()}</div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5">
          <div className="flex items-center gap-3 text-zinc-400 mb-3">
            <Clock className="w-5 h-5 text-amber-400" />
            <span>Estado</span>
          </div>
          <div className="text-2xl font-bold text-white">Operativo</div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/people" className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5 hover:border-blue-500/60 transition-colors">
          <Users className="w-6 h-6 text-blue-400 mb-3" />
          <h2 className="text-xl font-semibold text-white mb-1">Personal</h2>
          <p className="text-sm text-zinc-400">Ver y editar empleados.</p>
        </Link>
        <Link href="/reports" className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5 hover:border-blue-500/60 transition-colors">
          <FileBarChart className="w-6 h-6 text-emerald-400 mb-3" />
          <h2 className="text-xl font-semibold text-white mb-1">Reportes</h2>
          <p className="text-sm text-zinc-400">Prenomina, asistencia y marcaciones.</p>
        </Link>
        <Link href="/devices" className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5 hover:border-blue-500/60 transition-colors">
          <MonitorSmartphone className="w-6 h-6 text-purple-400 mb-3" />
          <h2 className="text-xl font-semibold text-white mb-1">Dispositivos</h2>
          <p className="text-sm text-zinc-400">Relojes biometricos y sincronizacion.</p>
        </Link>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/70 overflow-hidden">
        <div className="p-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-white">Empleados recientes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-zinc-400 bg-zinc-950/50">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Departamento</th>
                <th className="px-4 py-3">Cargo</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {employees.slice(0, 10).map((emp) => (
                <tr key={emp.id} className="border-t border-zinc-800 text-zinc-300">
                  <td className="px-4 py-3 text-white">{emp.name}</td>
                  <td className="px-4 py-3">{emp.department}</td>
                  <td className="px-4 py-3">{emp.role}</td>
                  <td className="px-4 py-3">{emp.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
