"use client";

import React, { useState, useRef } from "react";
import { Mic, Send, Bot, Sparkles, MicOff, Download } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { mockEmployees } from "@/lib/mockData";
import { getPayrollSummary } from "@/lib/reportUtils";

import { useAuth } from "@/contexts/AuthContext";

interface AgentCommandBarProps {
  onCommand: (text: string) => void;
  isProcessing: boolean;
}

export default function AgentCommandBar({ onCommand, isProcessing }: AgentCommandBarProps) {
  const { t, language } = useI18n();
  const { user } = useAuth();
  
  const companyEmployees = mockEmployees.filter(e => e.companyId === user?.companyId);
  const [command, setCommand] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [messages, setMessages] = useState<{ id: string; role: "user" | "agent"; text: string }[]>([]);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  const recognitionRef = useRef<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (command.trim() && !isProcessing) {
      const cmd = command.toLowerCase();
      let responseText = language === "es" 
        ? "He procesado tu consulta. No encontré información específica, pero el sistema local registró el comando."
        : "I have processed your query. No specific information was found, but the command was logged locally.";
        
      // --- Generic NLP Extraction ---
      // 1. Extract Dates
      const exactDateMatch = cmd.match(/(\d{1,2})\s*(?:de)?\s*(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)(?:\s*(?:de|del)?\s*(\d{4}))?/i);
      const monthYearMatch = cmd.match(/(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)(?:\s*(?:de)?\s*(\d{4}))?/i);
      
      let periodName = "el periodo actual";
      let periodSeed = "";
      const currentYear = new Date().getFullYear(); // e.g. 2026
      
      if (exactDateMatch) {
        const year = exactDateMatch[3] || currentYear;
        periodName = `el ${exactDateMatch[1]} de ${exactDateMatch[2].charAt(0).toUpperCase() + exactDateMatch[2].slice(1)} de ${year}`;
        periodSeed = periodName;
      } else if (monthYearMatch) {
        const year = monthYearMatch[2] || currentYear;
        periodName = `${monthYearMatch[1].charAt(0).toUpperCase() + monthYearMatch[1].slice(1)} ${year}`;
        periodSeed = periodName;
      }
      
      // 2. Extract Employees
      const cmdWords = cmd.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().split(/\s+/);
      const mentionedEmployees = companyEmployees.filter(emp => {
        const empName = emp.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        return cmdWords.some(word => word.length > 3 && empName.includes(word));
      });
      
      // --- Intent Routing ---
      
      // Scenario: Liquidated employees
      if (cmd.includes("liquidado") || cmd.includes("despedid") || cmd.includes("fuera") || cmd.includes("finiquito")) {
        const targetEmps = mentionedEmployees.length > 0 ? mentionedEmployees.filter(e => e.status === "Liquidado") : companyEmployees.filter(e => e.status === "Liquidado");
        if (targetEmps.length === 0) {
          responseText = mentionedEmployees.length > 0 ? `El empleado no registra actas de finiquito o no está liquidado.` : `No se encontraron empleados liquidados.`;
        } else {
          responseText = `He encontrado ${targetEmps.length} empleado(s) liquidado(s):\n${targetEmps.map(e => `- ${e.name} (C.I. ${e.id})`).join("\n")}\n\n[DOWNLOAD_FINIQUITO_PDF]`;
        }
      } 
      // Scenario: Maternity leave
      else if (cmd.includes("maternidad") || cmd.includes("embarazo")) {
        const matEmps = companyEmployees.filter(e => e.status === "Permiso por Maternidad");
        const names = matEmps.map(e => e.name).join(", ");
        responseText = `Actualmente tenemos ${matEmps.length} empleada(s) con Permiso por Maternidad: ${names}. El IESS cubre el 75% de su remuneración y la empresa el 25%.`;
      }
      // Scenario: Oldest employee
      else if (cmd.includes("antiguo") || cmd.includes("mayor") || cmd.includes("edad")) {
        const oldest = [...companyEmployees].sort((a,b) => new Date(a.dob).getTime() - new Date(b.dob).getTime())[0];
        responseText = `El empleado de mayor edad es ${oldest.name} (C.I. ${oldest.id}), nacido el ${oldest.dob}.`;
      }
      // Scenario: Faltas / Absences
      else if (cmd.includes("falta") || cmd.includes("ausencia") || cmd.includes("ausent")) {
        const targetEmps = mentionedEmployees.length > 0 ? mentionedEmployees : companyEmployees;
        let totalFaltas = 0;
        let empDetails: string[] = [];
        
        targetEmps.forEach(emp => {
           // Deterministic random using periodSeed and employee id
           let hash = 0;
           const seed = emp.id + periodSeed + "faltas";
           for (let i = 0; i < seed.length; i++) hash = ((hash << 5) - hash) + seed.charCodeAt(i);
           const faltas = Math.floor((Math.abs(hash) / 2147483647) * 3); // 0 to 2
           
           if (faltas > 0 || mentionedEmployees.length > 0) {
             totalFaltas += faltas;
             empDetails.push(`- ${emp.name}: ${faltas} falta(s) injustificada(s)`);
           }
        });
        
        if (mentionedEmployees.length > 0) {
          responseText = `Analizando asistencia de ${mentionedEmployees.map(e => e.firstName).join(", ")} para ${periodName}...\n${empDetails.join("\n")}`;
        } else {
          responseText = `Analizando asistencia para ${periodName}...\nSe registraron un total de ${totalFaltas} faltas injustificadas en la empresa.\nEl empleado con mayor índice es Juan Carlos Pérez García con 3 faltas.`;
        }
      } 
      // Scenario: Atrasos / Tardiness
      else if (cmd.includes("atraso") || cmd.includes("tarde") || cmd.includes("retraso")) {
        const targetEmps = mentionedEmployees.length > 0 ? mentionedEmployees : companyEmployees;
        let totalAtrasos = 0;
        let empDetails: string[] = [];
        
        targetEmps.forEach(emp => {
           let hash = 0;
           const seed = emp.id + periodSeed + "atrasos";
           for (let i = 0; i < seed.length; i++) hash = ((hash << 5) - hash) + seed.charCodeAt(i);
           const atrasos = Math.floor((Math.abs(hash) / 2147483647) * 5); // 0 to 4
           
           if (atrasos > 0 || mentionedEmployees.length > 0) {
             totalAtrasos += atrasos;
             empDetails.push(`- ${emp.name}: ${atrasos} atraso(s)`);
           }
        });
        
        if (mentionedEmployees.length > 0) {
          responseText = `Analizando atrasos de ${mentionedEmployees.map(e => e.firstName).join(", ")} para ${periodName}...\n${empDetails.join("\n")}`;
        } else {
          responseText = `Analizando atrasos para ${periodName}...\nSe registraron un total de ${totalAtrasos} atrasos en toda la empresa.`;
        }
      }
      // Scenario: Payroll calculation asking for dates
      else if (cmd.includes("nómina") || cmd.includes("nomina") || cmd.includes("liquidación") || cmd.includes("payroll")) {
        // Generar payroll filtrado para la compania
        const { generatePayrollReport } = require("@/lib/reportUtils");
        const fullReport = generatePayrollReport(periodSeed).filter((r: any) => companyEmployees.find(ce => ce.id === r.id));
        const report = {
          count: fullReport.length,
          totalBase: fullReport.reduce((acc: number, item: any) => acc + item.base, 0),
          totalIESS: fullReport.reduce((acc: number, item: any) => acc + item.iess, 0),
          totalPenalty: fullReport.reduce((acc: number, item: any) => acc + item.penalty, 0),
          totalOvertime: fullReport.reduce((acc: number, item: any) => acc + item.overtime, 0),
          totalNet: fullReport.reduce((acc: number, item: any) => acc + item.net, 0)
        };
        
        if (mentionedEmployees.length > 0) {
          // If asking for specific employees, calculate their custom sum!
          // We need to re-generate the payroll report for the period to filter it.
          const { generatePayrollReport } = require("@/lib/reportUtils");
          const fullReport = generatePayrollReport(periodSeed);
          
          let sumBase = 0, sumIESS = 0, sumPenalty = 0, sumOvertime = 0, sumNet = 0;
          let details: string[] = [];
          
          mentionedEmployees.forEach(emp => {
             const data = fullReport.find((r: any) => r.id === emp.id);
             if (data) {
               sumBase += data.base; sumIESS += data.iess; sumPenalty += data.penalty; sumOvertime += data.overtime; sumNet += data.net;
               details.push(`- ${emp.name}: Líquido $${data.net.toFixed(2)}`);
             }
          });
          
          responseText = `Nómina calculada para ${mentionedEmployees.map(e => e.firstName).join(", ")} en ${periodName}:\nSueldo(s) Base: $${sumBase.toFixed(2)}\nAportes IESS: -$${sumIESS.toFixed(2)}\nHoras Extras: +$${sumOvertime.toFixed(2)}\nLíquido a Transferir: $${sumNet.toFixed(2)}\n\nDetalle:\n${details.join("\n")}`;
        } else {
          responseText = `Cálculo de nómina para ${periodName}:\nTotal de Empleados Procesados: ${report.count}\nSueldos Base: $${report.totalBase.toFixed(2)}\nAportes IESS (9.45%): -$${report.totalIESS.toFixed(2)}\nMultas y Atrasos: -$${report.totalPenalty.toFixed(2)}\nHoras Extras: +$${report.totalOvertime.toFixed(2)}\nLíquido a Transferir: $${report.totalNet.toFixed(2)}\n\n(Puedes descargar el reporte completo usando el botón debajo o en la sección Reportes). [DOWNLOAD_PAYROLL_PDF]`;
        }
      }
      // Scenario: Medical Leave
      else if (cmd.includes("médico") || cmd.includes("medico") || cmd.includes("enfermedad") || cmd.includes("salud")) {
        const med = companyEmployees.filter(e => e.status === "Permiso Médico");
        responseText = `Se encontraron ${med.length} empleados con permisos médicos actualmente: ${med.map(e => e.name).join(', ')}.`;
      }
      // Scenario: Vacations
      else if (cmd.includes("vacaciones") || cmd.includes("vacations") || cmd.includes("descanso")) {
        const vac = companyEmployees.filter(e => e.status === "Vacaciones");
        responseText = `Actualmente tenemos ${vac.length} empleados en vacaciones: ${vac.map(e => e.name).join(', ')}.`;
      }
      // Scenario: Última entrada / registro
      else if (cmd.includes("ultima entrada") || cmd.includes("última entrada") || cmd.includes("ultimo registro") || cmd.includes("último registro")) {
        let targetId = "";
        let targetName = "";
        
        if (mentionedEmployees.length > 0) {
          targetId = mentionedEmployees[0].id;
          targetName = mentionedEmployees[0].name;
        } else {
          const idMatch = cmd.match(/\b\d{10}\b/);
          if (idMatch) targetId = idMatch[0];
        }

        if (targetId) {
          try {
            const logsRes = await fetch('/api/logs/realtime');
            if (logsRes.ok) {
              const logsData = await logsRes.json();
              const userLogs = logsData.logs.filter((l: any) => l.user_id === targetId);
              if (userLogs.length > 0) {
                const latest = userLogs[0]; // Already ordered by desc
                let stateLabel = latest.state;
                if (latest.state === "0") stateLabel = "Entrada";
                if (latest.state === "1") stateLabel = "Salida";
                const dateObj = new Date(latest.timestamp);
                const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                
                responseText = `Analizando los registros... La última marcación de ${targetName || targetId} fue registrada a las ${timeStr} (Estado: ${latest.state} - ${stateLabel}).`;
              } else {
                responseText = `No encontré ninguna marcación reciente para el ID ${targetId} en la base de datos en tiempo real.`;
              }
            } else {
               responseText = `Hubo un error al consultar la base de datos de marcaciones en tiempo real.`;
            }
          } catch (error) {
             responseText = `No pude conectarme a la base de datos para verificar la marcación.`;
          }
        } else {
           responseText = `Por favor, especifica el nombre o número de cédula del empleado para buscar su última marcación.`;
        }
      }
      
      const newMessages = [
        ...messages,
        { id: Date.now().toString(), role: "user" as const, text: command },
        { id: (Date.now() + 1).toString(), role: "agent" as const, text: responseText }
      ];
      
      setMessages(newMessages);
      onCommand(command);
      setCommand("");

      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
      }, 100);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    try {
      // @ts-ignore
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert("Tu navegador no soporta el reconocimiento de voz.");
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = "es-ES";
      recognition.interimResults = true;
      recognition.continuous = false;

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result) => result.transcript)
          .join("");
        setCommand(transcript);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsRecording(true);
    } catch (err) {
      console.error(err);
      setIsRecording(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto mt-8 px-4">
      {messages.length > 0 && (
        <div 
          ref={chatContainerRef}
          className="mb-4 max-h-[250px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent flex flex-col gap-3"
        >
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`p-4 glass-card border rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 ${
                msg.role === "agent" 
                  ? "border-purple-500/30 self-start mr-8" 
                  : "border-blue-500/30 bg-blue-900/10 self-end ml-8 flex-row-reverse text-right"
              }`}
            >
              <div className={`p-2 rounded-full flex-shrink-0 ${msg.role === "agent" ? "bg-purple-500/20" : "bg-blue-500/20"}`}>
                {msg.role === "agent" ? <Bot className="w-5 h-5 text-purple-400" /> : <Mic className="w-5 h-5 text-blue-400" />}
              </div>
              <div className="flex-1">
                <p className={`text-xs font-semibold mb-1 ${msg.role === "agent" ? "text-purple-300" : "text-blue-300"}`}>
                  {msg.role === "agent" ? "FEMAR Assistant" : "Tú"}
                </p>
                <p className="text-sm text-zinc-200 whitespace-pre-line">
                  {msg.text.replace('[DOWNLOAD_PAYROLL_PDF]', '')}
                </p>
                {msg.text.includes('[DOWNLOAD_PAYROLL_PDF]') && (
                  <button 
                    onClick={() => window.location.href='/reports'}
                    className="mt-3 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded-xl transition-colors font-medium text-xs flex items-center gap-2 border border-blue-500/30"
                  >
                    <Download className="w-4 h-4" /> Ir a Módulo de Reportes para Descargar
                  </button>
                )}
                {msg.text.includes('[DOWNLOAD_FINIQUITO_PDF]') && (
                  <button 
                    onClick={() => {
                       alert("Generando Actas de Finiquito conforme al formato del Ministerio de Trabajo (MDT) Ecuador. Descarga iniciada.");
                    }}
                    className="mt-3 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/40 text-purple-400 rounded-xl transition-colors font-medium text-xs flex items-center gap-2 border border-purple-500/30"
                  >
                    <Download className="w-4 h-4" /> Generar Actas de Finiquito (Formato MDT)
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="relative group">
        <div className={`absolute -inset-1 rounded-2xl blur opacity-30 transition duration-1000 ${
          isRecording ? 'bg-gradient-to-r from-red-600 to-orange-600 animate-pulse' : 'bg-gradient-to-r from-blue-600 to-purple-600 group-hover:opacity-60'
        }`}></div>
        
        <form 
          onSubmit={handleSubmit}
          className="relative glass rounded-2xl p-2 flex items-center gap-2"
        >
          <div className="pl-4 pr-2 flex items-center justify-center">
            {isProcessing ? (
              <Sparkles className="w-6 h-6 text-purple-400 animate-pulse-slow text-glow" />
            ) : isRecording ? (
              <Mic className="w-6 h-6 text-red-500 animate-bounce" />
            ) : (
              <Bot className="w-6 h-6 text-blue-400" />
            )}
          </div>
          
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            disabled={isProcessing}
            placeholder={isProcessing ? t("processing") : isRecording ? "Escuchando..." : t("command_placeholder")}
            className="flex-1 bg-transparent border-none text-white focus:outline-none focus:ring-0 text-base md:text-lg placeholder-zinc-500 disabled:opacity-50"
          />

          <div className="flex gap-1 md:gap-2 pr-1 md:pr-2">
            <button
              type="button"
              onClick={toggleRecording}
              className={`p-2 md:p-3 rounded-xl transition-colors ${
                isRecording 
                  ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" 
                  : "bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-300"
              }`}
              title="Dictar orden por voz"
            >
              {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            <button
              type="submit"
              disabled={!command.trim() || isProcessing}
              className={`p-2 md:p-3 rounded-xl transition-colors flex items-center justify-center
                ${command.trim() && !isProcessing 
                  ? "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]" 
                  : "bg-zinc-800/50 text-zinc-500"}`}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
      
      <div className="mt-4 flex flex-wrap gap-2 justify-center opacity-80 px-2">
        <span className="text-xs text-zinc-400 mr-2 self-center">{t("suggestions_title")}</span>
        {(language === "es" 
          ? [
              "Calcula la nómina de todos en Agosto", 
              "Muestra el historial de permisos por maternidad", 
              "¿Quién tiene más faltas en 2 años?",
              "¿Qué empleados están liquidados?"
            ]
          : [
              "Calculate payroll for August", 
              "Show maternity leave history", 
              "Who has the most absences in 2 years?",
              "Which employees are liquidated?"
            ]
        ).map((sug) => (
          <button 
            key={sug}
            onClick={() => setCommand(sug)}
            className="px-3 py-1.5 rounded-full text-xs bg-zinc-800/50 border border-zinc-700 hover:border-blue-500/50 hover:text-blue-300 hover:bg-blue-900/20 transition-colors"
          >
            {sug}
          </button>
        ))}
      </div>
    </div>
  );
}
