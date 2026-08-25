"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Clock, MonitorSmartphone, FileBarChart, Globe, Menu, X, HelpCircle, Smartphone, UserCheck, LogOut, WalletCards, CalendarDays } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { useAuth } from "@/contexts/AuthContext";

type Role = 'master_admin' | 'tenant_admin' | 'hr' | 'payroll_approver' | 'supervisor' | 'employee';

export default function Sidebar() {
  const { t, language, setLanguage } = useI18n();
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const navItems: Array<{icon: React.ComponentType<{className?:string}>; label:string; href:string; roles:Role[]}> = [
    { icon: LayoutDashboard, label: t("dashboard"), href: "/", roles: ['master_admin','tenant_admin','hr','payroll_approver','supervisor'] },
    { icon: Users, label: t("people"), href: "/people", roles: ['master_admin','tenant_admin','hr'] },
    { icon: Clock, label: t("schedules"), href: "/schedules", roles: ['master_admin','tenant_admin','hr','supervisor'] },
    { icon: CalendarDays, label: "Permisos / Vacaciones", href: "/leaves", roles: ['master_admin','tenant_admin','hr','payroll_approver','supervisor','employee'] },
    { icon: WalletCards, label: "Pre‑nómina", href: "/prepayroll", roles: ['master_admin','tenant_admin','hr','payroll_approver'] },
    { icon: MonitorSmartphone, label: t("devices"), href: "/devices", roles: ['master_admin','tenant_admin'] },
    { icon: FileBarChart, label: t("reports"), href: "/reports", roles: ['master_admin','tenant_admin','hr','payroll_approver','supervisor'] },
    { icon: UserCheck, label: "Aprobaciones", href: "/approvals", roles: ['master_admin','tenant_admin'] },
    { icon: Smartphone, label: t("mobile_checkin") || "Marcación Remota", href: "/mobile", roles: ['master_admin','tenant_admin','hr','payroll_approver','supervisor','employee'] },
    { icon: HelpCircle, label: t("help") || "Ayuda / Manual", href: "/help", roles: ['master_admin','tenant_admin','hr','payroll_approver','supervisor','employee'] },
  ];

  const visibleItems = user ? navItems.filter(item => item.roles.includes(user.role)) : [];

  return (
    <>
      <div className="md:hidden flex items-center justify-between p-4 glass sticky top-0 z-50">
        <div className="font-bold text-xl text-blue-500">Workforce</div>
        <button onClick={() => setIsOpen(!isOpen)} className="text-zinc-300">{isOpen ? <X /> : <Menu />}</button>
      </div>

      <div className={`fixed inset-y-0 left-0 z-40 w-64 glass-card transform transition-transform duration-300 md:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full"} md:static md:block flex flex-col h-screen border-r border-zinc-800`}>
        <div className="p-6 hidden md:block">
          <div className="font-bold text-2xl bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">Workforce</div>
          {user && <div className="mt-2 text-xs text-zinc-500">{user.name} · {user.role}</div>}
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} onClick={() => setIsOpen(false)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive ? "bg-blue-600/20 text-blue-400 border border-blue-500/30" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"}`}>
                <item.icon className="w-5 h-5" /><span className="font-medium text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <div className="flex items-center gap-2 text-zinc-400"><Globe className="w-4 h-4" /><span className="text-xs font-medium">Idioma / Lang</span></div>
            <button onClick={() => setLanguage(language === "es" ? "en" : "es")} className="text-xs font-bold text-blue-400 hover:text-blue-300 uppercase">{language}</button>
          </div>
          <button onClick={() => void logout()} className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors border border-transparent hover:border-red-500/20">
            <LogOut className="w-4 h-4" /><span className="text-sm font-medium">Cerrar Sesión</span>
          </button>
        </div>
      </div>

      {isOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setIsOpen(false)} />}
    </>
  );
}
