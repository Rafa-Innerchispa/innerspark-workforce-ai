import { useEffect, useState } from 'react';
import { Clock, Users, AlertTriangle, DollarSign, ArrowUpRight, ArrowDownRight, Fingerprint, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { mockData } from '../services/mock-data';
import { employees } from '../data/employees-data';
import type { AttendanceEvent, AttendanceException, AIReviewResult } from '../domain/types';

// Mini stat card
function StatCard({ icon: Icon, label, value, sub, accent, trend }: { icon: any; label: string; value: string; sub?: string; accent?: string; trend?: 'up' | 'down' }) {
  return (
    <div className="bg-surface rounded-xl border border-border p-4 flex items-start gap-3 hover:border-border-light transition-colors">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${accent || 'bg-accent/10'}`}>
        <Icon size={20} className={accent ? `text-${accent?.replace('bg-', '')}` : 'text-accent'} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted uppercase tracking-wider">{label}</p>
        <p className="text-xl font-bold text-foreground mt-0.5">{value}</p>
        {sub && (
          <p className="flex items-center gap-1 text-xs mt-1">
            {trend === 'up' ? <ArrowUpRight size={12} className="text-success" /> : trend === 'down' ? <ArrowDownRight size={12} className="text-destructive" /> : null}
            <span className={trend === 'up' ? 'text-success' : trend === 'down' ? 'text-destructive' : 'text-muted'}>{sub}</span>
          </p>
        )}
      </div>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = { critical: 'bg-destructive/20 text-destructive border-destructive/30', high: 'bg-warning/20 text-warning border-warning/30', medium: 'bg-accent/10 text-accent border-accent/20', low: 'bg-muted/30 text-muted border-border' };
  return <span className={`text-[10px] px-1.5 py-0.5 rounded border ${colors[severity] || colors.low}`}>{severity === 'critical' ? 'CRÍTICO' : severity.toUpperCase()}</span>;
}

function ExceptionTypeIcon({ type }: { type: string }) {
  const icons: Record<string, any> = { lateness: AlertCircle, absence: XCircle, missing_punch: XCircle, early_exit: ArrowDownRight, extra_time: Clock };
  const Icon = icons[type] || AlertCircle;
  return <Icon size={14} className="text-muted shrink-0" />;
}

export default function DashboardPage() {
  const [events, setEvents] = useState<AttendanceEvent[]>([]);
  const [exceptions, setExceptions] = useState<AttendanceException[]>([]);
  const [review, setReview] = useState<AIReviewResult | null>(null);
  const [todayEvents, setTodayEvents] = useState<AttendanceEvent[]>([]);

  useEffect(() => {
    setEvents(mockData.recentEvents(20));
    setExceptions(mockData.pendingExceptions());
    setTodayEvents(mockData.eventsToday());
    setReview(mockData.aiReview());
  }, []);

  const activeEmps = employees.filter(e => e.status === 'active');
  const totalSalary = activeEmps.reduce((s, e) => s + e.baseSalary, 0);
  const onlineDevices = mockData.devices.filter(d => d.status === 'online').length;
  const pendingExc = exceptions.length;
  const clockedToday = new Set(todayEvents.filter(e => e.eventType === 'clock_in').map(e => e.employeeId)).size;

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Panel Principal</h1>
        <p className="text-sm text-muted mt-1">FEMAR — datos demostrativos · Resumen del período 3–14 de marzo 2025</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Empleados Activos" value={String(activeEmps.length)} sub={`${activeEmps.filter(e=>e.department==='Operaciones').length} en Operaciones`} trend="up" />
        <StatCard icon={Clock} label="Marcaciones Hoy" value={String(todayEvents.length)} sub={`${clockedToday} empleados registrados`} accent="bg-accent/10" />
        <StatCard icon={AlertTriangle} label="Excepciones Pendientes" value={String(pendingExc)} sub={pendingExc > 0 ? `${mockData.payrollPeriod().criticalAnomalyCount} críticas` : 'Sin novedades'} trend={pendingExc > 0 ? 'down' : 'up'} />
        <StatCard icon={DollarSign} label="Nómina Total" value={`$${(totalSalary + 98.24).toLocaleString()}`} sub="Período P1 — Marzo 2025" accent="bg-amber/10" />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Events */}
        <div className="lg:col-span-2 bg-surface rounded-xl border border-border overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2"><Fingerprint size={16} className="text-accent" /> Marcaciones Recientes</h2>
            <span className="text-[10px] text-muted bg-muted/20 px-2 py-0.5 rounded">{events.length} eventos</span>
          </div>
          <div className="divide-y divide-border max-h-[340px] overflow-y-auto">
            {events.slice(0, 15).map(ev => {
              const emp = employees.find(e => e.id === ev.employeeId);
              const time = ev.eventTime.slice(11, 16);
              const date = ev.eventTime.slice(0, 10);
              return (
                <div key={ev.id} className="flex items-center gap-3 px-5 py-2.5 hover:bg-surface-raised/50 transition-colors">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${ev.eventType === 'clock_in' ? 'bg-success' : 'bg-muted'}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground truncate">{emp?.fullName || ev.employeePin}</p>
                    <p className="text-[10px] text-muted">{ev.eventType === 'clock_in' ? 'Entrada' : 'Salida'} · {ev.deviceModel.replace('ZKTeco_', '')}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-mono text-foreground">{time}</p>
                    <p className="text-[10px] text-muted">{date}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Exceptions + AI Review */}
        <div className="space-y-4">
          {/* AI Review Summary */}
          {review && (
            <div className={`rounded-xl border p-4 ${review.canClosePeriod ? 'border-success/30 bg-success/5' : 'border-destructive/30 bg-destructive/5'}`}>
              <div className="flex items-center gap-2 mb-2">
                {review.canClosePeriod ? <CheckCircle2 size={16} className="text-success" /> : <AlertCircle size={16} className="text-destructive" />}
                <span className="text-xs font-semibold text-foreground">Revisión IA</span>
                <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded ${review.overallRiskLevel === 'high' ? 'bg-destructive/20 text-destructive' : 'bg-warning/20 text-warning'}`}>{review.overallRiskLevel.toUpperCase()}</span>
              </div>
              <p className="text-xs text-muted leading-relaxed line-clamp-3">{review.summary}</p>
              {!review.canClosePeriod && (
                <div className="mt-2 space-y-1">
                  {review.recommendations.slice(0, 2).map((r, i) => (
                    <p key={i} className="text-[10px] text-destructive/80 flex items-start gap-1"><span className="mt-0.5">•</span>{r}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Pending Exceptions */}
          <div className="bg-surface rounded-xl border border-border">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider">Excepciones Pendientes</h2>
              <span className="text-[10px] bg-destructive/20 text-destructive px-1.5 py-0.5 rounded-full">{exceptions.length}</span>
            </div>
            <div className="divide-y divide-border max-h-[260px] overflow-y-auto">
              {exceptions.map(ex => {
                const emp = employees.find(e => e.id === ex.employeeId);
                return (
                  <div key={ex.id} className="px-4 py-2.5 hover:bg-surface-raised/50 transition-colors">
                    <div className="flex items-center gap-2">
                      <ExceptionTypeIcon type={ex.type} />
                      <p className="text-xs text-foreground truncate flex-1">{emp?.fullName?.split(' ')[0] || ex.employeeId}</p>
                      <SeverityBadge severity={ex.severity} />
                    </div>
                    <p className="text-[10px] text-muted mt-0.5 ml-6 truncate">{ex.description}</p>
                  </div>
                );
              })}
              {exceptions.length === 0 && <p className="text-xs text-muted text-center py-6">No hay excepciones pendientes</p>}
            </div>
          </div>

          {/* Device Status */}
          <div className="bg-surface rounded-xl border border-border p-4">
            <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Estado de Dispositivos</h2>
            <div className="space-y-2">
              {mockData.devices.slice(0, 3).map(d => (
                <div key={d.id} className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${d.status === 'online' ? 'bg-success' : 'bg-destructive'}`} />
                  <p className="text-xs text-foreground truncate flex-1">{d.name}</p>
                  <span className="text-[10px] text-muted">{d.employeeCount} emp.</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted mt-2">{onlineDevices}/{mockData.devices.length} dispositivos en línea</p>
          </div>
        </div>
      </div>
    </div>
  );
}