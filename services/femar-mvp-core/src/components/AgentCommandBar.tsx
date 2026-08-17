"use client";

import React, { useState, useRef, useEffect } from "react";
import { Mic, Send, Bot, Sparkles, MicOff, Download } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { useAuth } from "@/contexts/AuthContext";

interface AgentCommandBarProps {
  onCommand: (text: string) => void;
  isProcessing: boolean;
}

export default function AgentCommandBar({ onCommand, isProcessing }: AgentCommandBarProps) {
  const { t, language } = useI18n();
  const { activeCompanyId } = useAuth();
  
  const [command, setCommand] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [messages, setMessages] = useState<{ id: string; role: "user" | "model"; text: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [devices, setDevices] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(`gemini_chat_history_${activeCompanyId}`);
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {}
    }
  }, [activeCompanyId]);

  // Polling devices and realtime logs
  useEffect(() => {
    const fetchData = async () => {
      try {
        const resDev = await fetch('/api/devices');
        if (resDev.ok) {
          const data = await resDev.json();
          setDevices(data.active || []);
        }
        const resLogs = await fetch('/api/logs/realtime');
        if (resLogs.ok) {
          const data = await resLogs.json();
          setLogs((data.logs || []).slice(0, 5));
        }
      } catch (e) {
        console.error("Error polling data:", e);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [activeCompanyId]);

  // Save to localStorage when messages change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(`gemini_chat_history_${activeCompanyId}`, JSON.stringify(messages));
    }
  }, [messages, activeCompanyId]);
  
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (command.trim() && !loading && !isProcessing) {
      const userMessage = command;
      setCommand("");
      
      const newHistory = [
        ...messages,
        { id: Date.now().toString(), role: "user" as const, text: userMessage }
      ];
      setMessages(newHistory);
      onCommand(userMessage);
      
      setLoading(true);

      try {
        const response = await fetch('/api/agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: userMessage,
            history: messages,
            companyId: activeCompanyId || 'femar'
          })
        });

        if (response.ok) {
          const data = await response.json();
          setMessages(prev => [
            ...prev,
            { id: (Date.now() + 1).toString(), role: "model", text: data.text }
          ]);
        } else {
          // Fallback router if API fails
          let fallbackText = "Lo siento, mi conexión con Inteligencia Artificial está caída en este momento. Sin embargo, en mi modo básico te informo que puedes usar el panel de Reportes para ver esta información.";
          
          const lowerCmd = userMessage.toLowerCase();
          if (lowerCmd.includes("empleado")) {
            fallbackText = "Modo Básico: Tienes empleados registrados en el sistema. Por favor ve al módulo de Personal para el detalle exacto.";
          } else if (lowerCmd.includes("nomina") || lowerCmd.includes("pagos") || lowerCmd.includes("calcul")) {
            fallbackText = "Modo Básico: Para calcular la nómina sin IA, dirígete a la pestaña 'Reportes' y selecciona 'Rol de Pagos'.";
          } else if (lowerCmd.includes("atraso") || lowerCmd.includes("falta")) {
            fallbackText = "Modo Básico: Puedes consultar las faltas y atrasos manualmente en la pestaña de Reportes.";
          }

          setMessages(prev => [
            ...prev,
            { id: (Date.now() + 1).toString(), role: "model", text: fallbackText }
          ]);
        }
      } catch (error) {
        setMessages(prev => [
          ...prev,
          { id: (Date.now() + 1).toString(), role: "model", text: "Modo Básico Activado: No tengo conexión a internet o a Gemini. Usa los menús de la izquierda para navegar." }
        ]);
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

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
                msg.role === "model" 
                  ? "border-purple-500/30 self-start mr-8" 
                  : "border-blue-500/30 bg-blue-900/10 self-end ml-8 flex-row-reverse text-right"
              }`}
            >
              <div className={`p-2 rounded-full flex-shrink-0 ${msg.role === "model" ? "bg-purple-500/20" : "bg-blue-500/20"}`}>
                {msg.role === "model" ? <Bot className="w-5 h-5 text-purple-400" /> : <Mic className="w-5 h-5 text-blue-400" />}
              </div>
              <div className="flex-1">
                <p className={`text-xs font-semibold mb-1 ${msg.role === "model" ? "text-purple-300" : "text-blue-300"}`}>
                  {msg.role === "model" ? (activeCompanyId === 'femar' ? "FEMAR Agent" : "InnerSpark Agent") : "Tú"}
                </p>
                <p className="text-sm text-zinc-200 whitespace-pre-line">
                  {msg.text}
                </p>
              </div>
            </div>
          ))}
          {loading && (
             <div className="p-4 glass-card border border-purple-500/30 rounded-2xl flex items-start gap-3 animate-pulse self-start mr-8">
               <div className="p-2 rounded-full flex-shrink-0 bg-purple-500/20">
                 <Bot className="w-5 h-5 text-purple-400" />
               </div>
               <div className="flex-1 self-center">
                 <div className="flex gap-1">
                   <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                   <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-75"></div>
                   <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-150"></div>
                 </div>
               </div>
             </div>
          )}
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
            {loading ? (
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
            disabled={loading}
            placeholder={loading ? "Pensando..." : isRecording ? "Escuchando..." : t("command_placeholder")}
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
              disabled={!command.trim() || loading}
              className={`p-2 md:p-3 rounded-xl transition-colors flex items-center justify-center
                ${command.trim() && !loading
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
        {[
          "Calcula la nómina de todos", 
          "¿Cuántos empleados tenemos?", 
          "Revisa quién llegó tarde hoy"
        ].map((sug) => (
          <button 
            key={sug}
            onClick={() => setCommand(sug)}
            className="px-3 py-1.5 rounded-full text-xs bg-zinc-800/50 border border-zinc-700 hover:border-blue-500/50 hover:text-blue-300 hover:bg-blue-900/20 transition-colors"
          >
            {sug}
          </button>
        ))}
      </div>

      {/* Real-time Hardware & Logs Monitor Panel */}
      <div className="mt-8 p-4 glass-card border border-zinc-700/50 rounded-2xl bg-zinc-900/40 text-left">
        <h4 className="text-sm font-semibold text-blue-400 mb-3 flex items-center gap-2">
          <Bot className="w-4 h-4" /> {t("agent_monitor_title")}
        </h4>
        
        {/* Devices list row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          {devices.length === 0 ? (
            <p className="text-xs text-zinc-500 col-span-full">{t("agent_monitor_no_dev")}</p>
          ) : (
            devices.map((d: any) => {
              const isOnline = d.lastSync && (new Date().getTime() - new Date(d.lastSync).getTime() < 300000);
              return (
                <div key={d.id} className="p-2.5 rounded-xl bg-zinc-800/30 border border-zinc-700/50 flex items-center justify-between text-xs">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-zinc-300">SN: {d.id}</span>
                    <span className="text-[10px] text-zinc-500">{d.location || "Principal"}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse animate-duration-1000' : 'bg-red-500'}`} />
                    <span className="text-[10px] text-zinc-400">{isOnline ? "On" : "Off"}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Real-time Logs list */}
        <div className="border-t border-zinc-800 pt-3">
          <p className="text-xs font-semibold text-zinc-400 mb-2">{t("agent_monitor_latest_events")}</p>
          <div className="flex flex-col gap-2 max-h-[120px] overflow-y-auto pr-1">
            {logs.length === 0 ? (
              <p className="text-xs text-zinc-500">{t("agent_monitor_waiting_logs")}</p>
            ) : (
              logs.map((log: any, idx: number) => {
                const date = new Date(log.timestamp);
                const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                return (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-zinc-800/20 text-[11px] text-zinc-300 border border-zinc-800/50">
                    <div className="flex items-center gap-2">
                      <span className="text-blue-400">👤 {log.employeeName || log.user_id}</span>
                      <span>{log.type === "checkout" ? t("agent_monitor_checked_out") : t("agent_monitor_checked_in")} ({log.deviceName || t("agent_monitor_mobile")})</span>
                    </div>
                    <span className="text-zinc-500">{timeString}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
