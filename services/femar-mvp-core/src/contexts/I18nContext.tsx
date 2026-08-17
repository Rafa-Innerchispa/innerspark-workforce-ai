"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

type Language = "es" | "en";

interface I18nContextProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  es: {
    "dashboard": "Panel Principal",
    "people": "Personal",
    "schedules": "Horarios y Turnos",
    "devices": "Equipos Biométricos",
    "clients": "Clientes",
    "reports": "Reportes y Nómina",
    "command_placeholder": "Dicta o escribe una novedad (ej. Buscar equipo en Sede Norte)...",
    "processing": "El agente está procesando tu solicitud...",
    "suggestions_title": "Sugerencias:",
    "sug_1": "Mostrar reporte de atrasos",
    "sug_2": "Calcular prenómina mensual",
    "sug_3": "Estado de biométricos",
    "anomalies": "Anomalías Recientes",
    "payroll": "Pre-nómina Mensual",
    "hardware": "Estado de Biométricos",
    "upload": "Carga de Plantillas",
    "online": "En línea",
    "offline": "Desconectado",
    "approve": "Aprobar",
    "review": "Revisar"
  },
  en: {
    "dashboard": "Dashboard",
    "people": "People",
    "schedules": "Schedules & Shifts",
    "devices": "Biometric Devices",
    "clients": "Clients",
    "reports": "Reports & Payroll",
    "command_placeholder": "Dictate or type an update (e.g. Search device in North Branch)...",
    "processing": "Agent is processing your request...",
    "suggestions_title": "Suggestions:",
    "sug_1": "Show delay report",
    "sug_2": "Calculate monthly payroll",
    "sug_3": "Biometric status",
    "anomalies": "Recent Anomalies",
    "payroll": "Monthly Pre-payroll",
    "hardware": "Biometric Status",
    "upload": "Template Upload",
    "online": "Online",
    "offline": "Offline",
    "approve": "Approve",
    "review": "Review"
  }
};

const I18nContext = createContext<I18nContextProps | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("en");

  const t = (key: string) => {
    return translations[language][key as keyof typeof translations["es"]] || key;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}
