"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Clock, MonitorSmartphone, Building2, FileBarChart, Globe, Menu, X, HelpCircle, Smartphone } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";

export default function Sidebar() {
  const { t, language, setLanguage } = useI18n();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { icon: LayoutDashboard, label: t("dashboard"), href: "/" },
    { icon: Users, label: t("people"), href: "/people" },
    { icon: Clock, label: t("schedules"), href: "/schedules" },
    { icon: MonitorSmartphone, label: t("devices"), href: "/devices" },
    { icon: FileBarChart, label: t("reports"), href: "/reports" },
    { icon: Smartphone, label: t("mobile_checkin") || "Marcación Remota", href: "/mobile" },
    { icon: HelpCircle, label: t("help") || "Ayuda / Manual", href: "/help" },
  ];

  return (
    <>
      <div className="md:hidden flex items-center justify-between p-4 glass sticky top-0 z-50">
        <div className="font-bold text-xl text-blue-500">FEMAR AI</div>
        <button onClick={() => setIsOpen(!isOpen)} className="text-zinc-300">
          {isOpen ? <X /> : <Menu />}
        </button>
      </div>

      <div className={`fixed inset-y-0 left-0 z-40 w-64 glass-card transform transition-transform duration-300 md:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full"} md:static md:block flex flex-col h-screen border-r border-zinc-800`}>
        <div className="p-6 hidden md:block">
          <div className="font-bold text-2xl bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
            FEMAR AI
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
          {navItems.map((item, index) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={index}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive 
                    ? "bg-blue-600/20 text-blue-400 border border-blue-500/30" 
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <div className="flex items-center gap-2 text-zinc-400">
              <Globe className="w-4 h-4" />
              <span className="text-xs font-medium">Idioma / Lang</span>
            </div>
            <button
              onClick={() => setLanguage(language === "es" ? "en" : "es")}
              className="text-xs font-bold text-blue-400 hover:text-blue-300 uppercase"
            >
              {language}
            </button>
          </div>
        </div>
      </div>
      
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
