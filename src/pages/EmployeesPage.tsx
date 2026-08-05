import { Users } from 'lucide-react';
import { employees } from '../data/employees-data';

export default function EmployeesPage() {
  const departments = [...new Set(employees.map(e => e.department))];
  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Empleados</h1>
        <p className="text-sm text-muted mt-1">{employees.filter(e => e.status === 'active').length} activos · {employees.length} total</p>
      </div>

      {/* Department summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {departments.map(dept => {
          const count = employees.filter(e => e.department === dept && e.status === 'active').length;
          return (
            <div key={dept} className="bg-surface rounded-xl border border-border p-4">
              <p className="text-xs text-muted uppercase tracking-wider">{dept}</p>
              <p className="text-2xl font-bold text-foreground mt-1">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Employee table */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center gap-2">
          <Users size={16} className="text-accent" />
          <span className="text-sm font-semibold text-foreground">Directorio</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted border-b border-border">
                <th className="text-left px-4 py-3 font-medium">Nombre</th>
                <th className="text-left px-4 py-3 font-medium">Departamento</th>
                <th className="text-left px-4 py-3 font-medium">Cargo</th>
                <th className="text-left px-4 py-3 font-medium">Ubicación</th>
                <th className="text-right px-4 py-3 font-medium">Salario</th>
                <th className="text-center px-4 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {employees.map(emp => (
                <tr key={emp.id} className="hover:bg-surface-raised/30 transition-colors">
                  <td className="px-4 py-3 text-foreground">{emp.fullName}</td>
                  <td className="px-4 py-3 text-muted">{emp.department}</td>
                  <td className="px-4 py-3 text-muted">{emp.position}</td>
                  <td className="px-4 py-3 text-muted capitalize">{emp.locationId === 'loc-001' ? 'Quito' : emp.locationId === 'loc-002' ? 'Guayaquil' : 'Cuenca'}</td>
                  <td className="px-4 py-3 text-right font-mono text-foreground">${emp.baseSalary.toFixed(2)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] ${emp.status === 'active' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                      {emp.status === 'active' ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}