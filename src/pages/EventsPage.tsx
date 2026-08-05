import { Fingerprint } from 'lucide-react';
import { mockData } from '../services/mock-data';
import { employees } from '../data/employees-data';

export default function EventsPage() {
  const events = mockData.events();
  const todayEvents = mockData.eventsToday();

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Marcaciones</h1>
        <p className="text-sm text-muted mt-1">{events.length} eventos registrados en el período</p>
      </div>

      {/* Today summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-surface rounded-xl border border-border p-4">
          <p className="text-xs text-muted uppercase">Hoy</p>
          <p className="text-2xl font-bold text-foreground mt-1">{todayEvents.filter(e => e.eventType === 'clock_in').length}</p>
          <p className="text-[10px] text-muted mt-1">entradas</p>
        </div>
        <div className="bg-surface rounded-xl border border-border p-4">
          <p className="text-xs text-muted uppercase">Hoy</p>
          <p className="text-2xl font-bold text-foreground mt-1">{todayEvents.filter(e => e.eventType === 'clock_out').length}</p>
          <p className="text-[10px] text-muted mt-1">salidas</p>
        </div>
        <div className="bg-surface rounded-xl border border-border p-4">
          <p className="text-xs text-muted uppercase">Dispositivos</p>
          <p className="text-2xl font-bold text-foreground mt-1">{mockData.devices.filter(d => d.status === 'online').length}</p>
          <p className="text-[10px] text-muted mt-1">en línea</p>
        </div>
      </div>

      {/* Event log */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center gap-2">
          <Fingerprint size={16} className="text-accent" />
          <span className="text-sm font-semibold text-foreground">Registro de Eventos</span>
          <span className="ml-auto text-[10px] text-muted bg-muted/20 px-2 py-0.5 rounded">{events.length} registros</span>
        </div>
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted border-b border-border sticky top-0 bg-surface">
                <th className="text-left px-4 py-3 font-medium">Hora</th>
                <th className="text-left px-4 py-3 font-medium">Empleado</th>
                <th className="text-left px-4 py-3 font-medium">Tipo</th>
                <th className="text-left px-4 py-3 font-medium">Dispositivo</th>
                <th className="text-left px-4 py-3 font-medium">Verificación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {events.slice(-100).reverse().map(ev => {
                const emp = employees.find(e => e.id === ev.employeeId);
                return (
                  <tr key={ev.id} className="hover:bg-surface-raised/30 transition-colors">
                    <td className="px-4 py-2 font-mono text-foreground">{ev.eventTime.slice(11, 16)}</td>
                    <td className="px-4 py-2 text-foreground">{emp?.fullName || ev.employeePin}</td>
                    <td className="px-4 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${ev.eventType === 'clock_in' ? 'bg-success/10 text-success' : 'bg-muted/30 text-muted'}`}>
                        {ev.eventType === 'clock_in' ? 'ENTRADA' : 'SALIDA'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-muted">{ev.deviceModel.replace('ZKTeco_', '')}</td>
                    <td className="px-4 py-2 text-muted capitalize">{ev.verificationMethod}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}