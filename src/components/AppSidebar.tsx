import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, CalendarDays, FileText,
  DollarSign, Fingerprint, ShieldCheck, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useState } from 'react';

interface NavGroup {
  title: string;
  items: { to: string; label: string; icon: any; badge?: number }[];
}

const navGroups: NavGroup[] = [
  {
    title: 'Inicio',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Personas',
    items: [
      { to: '/employees', label: 'Empleados', icon: Users },
    ],
  },
  {
    title: 'Tiempo',
    items: [
      { to: '/events', label: 'Marcaciones', icon: Fingerprint },
      { to: '/schedules', label: 'Horarios y Turnos', icon: CalendarDays },
    ],
  },
  {
    title: 'Solicitudes',
    items: [
      { to: '/requests', label: 'Excepciones y Solicitudes', icon: FileText },
    ],
  },
  {
    title: 'Pre-nómina',
    items: [
      { to: '/payroll', label: 'Pre-nómina', icon: DollarSign },
    ],
  },
  {
    title: 'Integraciones',
    items: [
      { to: '/integrations', label: 'Dispositivos y Servicios', icon: Fingerprint },
    ],
  },
];

export default function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <aside className={`${collapsed ? 'w-16' : 'w-60'} transition-all duration-300 flex flex-col border-r border-border bg-surface-alt relative shrink-0`}>
      {/* Brand */}
      <div className={`flex items-center gap-3 px-4 h-16 border-b border-border ${collapsed ? 'justify-center px-0' : ''}`}>
        <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center shrink-0">
          <ShieldCheck size={18} className="text-accent" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">InnerSpark</p>
            <p className="text-[10px] text-muted truncate">Workforce AI</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto space-y-4">
        {navGroups.map(group => (
          <div key={group.title}>
            {!collapsed && (
              <p className="px-3 mb-1 text-[9px] text-muted uppercase tracking-widest font-semibold">
                {group.title}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive: active }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-all duration-150 cursor-pointer
                    ${active || isActive(item.to)
                      ? 'bg-accent/10 text-accent font-medium'
                      : 'text-muted hover:text-foreground hover:bg-surface/50'
                    } ${collapsed ? 'justify-center px-0' : ''}`
                  }
                >
                  <item.icon size={16} className="shrink-0" />
                  {!collapsed && (
                    <span className="truncate">{item.label}</span>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="flex items-center justify-center h-10 border-t border-border text-muted hover:text-foreground transition-colors cursor-pointer shrink-0"
        aria-label={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </aside>
  );
}