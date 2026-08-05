import { useState } from 'react';
import { Clock, CalendarDays, Sun, Moon, Users, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { mockData } from '../services/mock-data';
import { locations } from '../data/company-data';
import { employees } from '../data/employees-data';

type Tab = 'policies' | 'groups' | 'calendar';

export default function SchedulesPage() {
  const [tab, setTab] = useState<Tab>('policies');
  const policies = mockData.shiftPolicies();
  const groups = mockData.scheduleGroups();
  const holidays = mockData.holidays();
  const marchHolidays = mockData.holidaysInMonth(3);

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'policies', label: 'Políticas de Turno', icon: Clock },
    { key: 'groups', label: 'Asignación por Grupo', icon: Users },
    { key: 'calendar', label: 'Calendario / Feriados', icon: CalendarDays },
  ];

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Horarios y Turnos</h1>
        <p className="text-sm text-muted mt-1">Políticas de turno, grupos y calendario laboral</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface rounded-xl border border-border p-1 w-fit">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              tab === t.key ? 'bg-accent text-white shadow-sm' : 'text-muted hover:text-foreground'
            }`}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Policies */}
      {tab === 'policies' && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {policies.map(p => (
            <div key={p.id} className={`bg-surface rounded-xl border p-5 ${p.active ? 'border-border' : 'border-destructive/30 opacity-70'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {p.shiftType === 'night' ? <Moon size={16} className="text-accent" /> : <Sun size={16} className="text-amber" />}
                  <h3 className="text-sm font-semibold text-foreground">{p.name}</h3>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${p.active ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                  {p.active ? 'Activo' : 'Inactivo'}
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between"><span className="text-muted">Horario</span><span className="text-foreground font-mono">{p.startTime} — {p.endTime}</span></div>
                <div className="flex justify-between"><span className="text-muted">Tolerancia</span><span className="text-foreground">{p.graceMinutes} min</span></div>
                <div className="flex justify-between"><span className="text-muted">Horas/día</span><span className="text-foreground">{p.workHoursPerDay}h</span></div>
                <div className="flex justify-between"><span className="text-muted">Marcaciones req.</span><span className="text-foreground">{p.requiredPunches}</span></div>
                {p.requiresNightSurcharge && (
                  <div className="flex justify-between"><span className="text-muted">Recargo nocturno</span><span className="text-accent font-medium">{p.nightSurchargeStart}—{p.nightSurchargeEnd}</span></div>
                )}
                <div className="flex justify-between"><span className="text-muted">Política HE</span><span className="text-foreground text-right max-w-[180px]">{p.overtimePolicy}</span></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Groups */}
      {tab === 'groups' && (
        <div className="space-y-4">
          {locations.map(loc => {
            const locGroups = groups.filter(g => g.locationId === loc.id);
            return (
              <div key={loc.id} className="bg-surface rounded-xl border border-border overflow-hidden">
                <div className="px-5 py-3 border-b border-border flex items-center gap-2">
                  <ShieldCheck size={14} className="text-accent" />
                  <span className="text-sm font-semibold text-foreground">{loc.name}</span>
                  <span className="ml-auto text-[10px] text-muted bg-muted/20 px-2 py-0.5 rounded">{loc.address}</span>
                </div>
                <div className="divide-y divide-border">
                  {locGroups.map(g => {
                    const policy = policies.find(p => p.id === g.policyId);
                    const empNames = g.employeeIds.map(eid => employees.find(e => e.id === eid)?.fullName).filter(Boolean);
                    return (
                      <div key={g.id} className="px-5 py-3">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm text-foreground font-medium">{g.name}</p>
                          <span className="text-[10px] text-muted bg-muted/20 px-2 py-0.5 rounded">{g.employeeIds.length} empleados</span>
                        </div>
                        <p className="text-[10px] text-muted">Política: {policy?.name || 'Sin asignar'}</p>
                        {empNames.length > 0 && (
                          <p className="text-[10px] text-muted mt-1">{empNames.join(', ')}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab: Calendar */}
      {tab === 'calendar' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* March 2025 calendar preview */}
          <div className="bg-surface rounded-xl border border-border p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <CalendarDays size={14} className="text-accent" /> Marzo 2025
            </h3>
            <div className="grid grid-cols-7 gap-1 text-center text-[10px]">
              {['Do','Lu','Ma','Mi','Ju','Vi','Sá'].map(d => (
                <div key={d} className="text-muted font-medium py-1">{d}</div>
              ))}
              {Array.from({ length: 31 }, (_, i) => {
                const day = i + 1;
                const dow = new Date(2025, 2, day).getDay();
                const isHoliday = marchHolidays.some(h => parseInt(h.date.split('-')[1], 10) === day);
                const isWeekend = dow === 0 || dow === 6;
                return (
                  <div
                    key={day}
                    className={`py-1.5 rounded text-xs ${
                      isHoliday ? 'bg-destructive/15 text-destructive font-bold' :
                      isWeekend ? 'text-muted/40' : 'text-foreground'
                    }`}
                  >
                    {day}
                  </div>
                );
              })}
            </div>
            {marchHolidays.length > 0 && (
              <div className="mt-3 space-y-1">
                <p className="text-[10px] font-semibold text-muted uppercase">Feriados</p>
                {marchHolidays.map(h => (
                  <div key={h.id} className="flex items-center gap-2 text-xs">
                    <CheckCircle2 size={10} className="text-destructive" />
                    <span className="text-foreground">{h.name}</span>
                    <span className="text-muted">{h.date}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* All holidays */}
          <div className="bg-surface rounded-xl border border-border p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <CalendarDays size={14} className="text-accent" /> Feriados 2025
            </h3>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {holidays.filter(h => !h.year || h.year === 2025).map(h => (
                <div key={h.id} className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-mono ${parseInt(h.date.split('-')[1], 10) === 3 ? 'text-destructive' : 'text-muted'}`}>{h.date}</span>
                    <span className="text-xs text-foreground">{h.name}</span>
                  </div>
                  <span className={`text-[10px] ${h.isPaid ? 'text-success' : 'text-muted'}`}>
                    {h.isPaid ? 'Pagado' : 'No laboral'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}