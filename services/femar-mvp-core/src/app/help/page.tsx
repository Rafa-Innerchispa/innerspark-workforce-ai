"use client";

import React from "react";
import GlassWidget from "@/components/GlassWidget";
import { HelpCircle, BookOpen } from "lucide-react";

export default function HelpPage() {
  return (
    <main className="p-4 md:p-8 w-full max-w-7xl mx-auto flex flex-col gap-6 md:gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
          Ayuda y Manual de Usuario
        </h1>
        <p className="text-sm md:text-base text-zinc-400">
          Aprenda a utilizar el sistema de forma fácil
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <GlassWidget title="Preguntas Frecuentes (FAQ)" icon={HelpCircle}>
          <div className="flex flex-col gap-4 p-2">
            <details className="group border border-zinc-700/50 bg-zinc-800/30 rounded-xl p-4 cursor-pointer">
              <summary className="font-semibold text-blue-300 outline-none">¿Cómo pregunto sobre una falta?</summary>
              <p className="text-zinc-400 text-sm mt-2">Vaya al Panel Principal (Dashboard). Haga clic en el botón del micrófono o escriba en la barra principal "Cuántas faltas tiene Juan Pérez". El asistente le responderá de inmediato.</p>
            </details>
            <details className="group border border-zinc-700/50 bg-zinc-800/30 rounded-xl p-4 cursor-pointer">
              <summary className="font-semibold text-blue-300 outline-none">¿Dónde importo mis clientes o reportes en Excel?</summary>
              <p className="text-zinc-400 text-sm mt-2">En el menú lateral, diríjase a "Clientes" o "Reportes y Nómina". Verá un componente visual donde podrá arrastrar su archivo Excel (Máx. 5MB).</p>
            </details>
            <details className="group border border-zinc-700/50 bg-zinc-800/30 rounded-xl p-4 cursor-pointer">
              <summary className="font-semibold text-blue-300 outline-none">¿Cómo exportar información?</summary>
              <p className="text-zinc-400 text-sm mt-2">En las secciones correspondientes encontrará botones verdes y rojos para exportar sus tablas directamente a formato Excel (.xlsx) o PDF.</p>
            </details>
          </div>
        </GlassWidget>

        <GlassWidget title="Guía Rápida" icon={BookOpen}>
          <div className="p-4 text-zinc-300 text-sm leading-relaxed space-y-2">
            <p>1. <strong>Dashboard:</strong> Vista general de su fuerza laboral y barra de IA.</p>
            <p>2. <strong>Personal y Horarios:</strong> Gestione a sus empleados y asigne turnos de trabajo.</p>
            <p>3. <strong>Equipos:</strong> Vea el estado de conexión de sus biométricos en tiempo real.</p>
            <p>4. <strong>Idioma:</strong> Puede cambiar el idioma usando el botón en la parte inferior del menú lateral.</p>
          </div>
        </GlassWidget>
      </div>
    </main>
  );
}
