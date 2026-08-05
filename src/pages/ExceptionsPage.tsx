import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, XCircle, Clock, ArrowDownRight, AlertCircle, ThumbsUp } from 'lucide-react';
import { mockData } from '../services/mock-data';
import { employees } from '../data/employees-data';
import type { AttendanceException } from '../domain/types';

const severityColors: Record<string, string> = {
  critical: 'bg-destructive/20 text-destructive border-destructive/30',
  high: 'bg-warning/20 text-warning border-warning/30',
  medium: 'bg-accent/10 text-accent border-accent/20',
  low: 'bg-muted/30 text-muted border-border',
};
const severityLabels: Record<string, string> = {
  critical: 'CRÍTICO', high: 'ALTO', medium: 'MEDIO', low: 'BAJO',
};
const typeIcons: Record<string, any> = {
  lateness: AlertCircle, absence: XCircle, missing_punch: XCircle,
  early_exit: ArrowDownRight, extra_time: Clock,
};
const typeLabels: Record<string, string> = {
  lateness: 'Atraso', absence: 'Ausencia', missing_punch: 'Marcaje faltante',
  early_exit: 'Salida temprana', extra_time: 'Tiempo extra',
};

function ExceptionCard({
  ex,
  onApprove,
  onDismiss,
}: {
  ex: AttendanceException;
  onApprove: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const emp = employees.find(e => e.id === ex.employeeId);
  const Icon = typeIcons[ex.type] || AlertCircle;

  return (
    <div className={`bg-surface rounded-xl border p-4 transition-all ${
      ex.status === 'approved' ? 'border-success/30 opacity-70' : 'border-border'
    }`}>
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
          ex.severity === 'critical' ? 'bg-destructive/15' :
          ex.severity === 'high' ? 'bg-warning/15' : 'bg-accent/10'
        }`}>
          <Icon size={16} className={
            ex.severity === 'critical' ? 'text-destructive' :
            ex.severity === 'high' ? 'text-warning' : 'text-accent'
          } />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-foreground">{emp?.fullName || ex.employeeId}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${severityColors[ex.severity] || severityColors.low}`}>
              {severityLabels[ex.severity] || ex.severity.toUpperCase()}
            </span>
            <span className="text-[10px] text-muted bg-muted/10 px-1.5 py-0.5 rounded">{typeLabels[ex.type] || ex.type}</span>
            {ex.status === 'approved' && (
              <span className="text-[10px] text-success bg-success/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                <CheckCircle2 size={10} /> Aprobado
              </span>
            )}
          </div>
          <p className="text-xs text-muted mt-1.5">{ex.description}</p>
          <div className="flex items-center gap-4 mt-2 text-[10px] text-muted">
            <span>{ex.date}</span>
            {ex.minutesAffected > 0 && <span>{ex.minutesAffected} min</span>}
            {ex.monetaryImpact > 0 && <span>Impacto: ${ex.monetaryImpact.toFixed(2)}</span>}
            {ex.actualStart && <span>Entrada: {ex.actualStart}</span>}
            {ex.actualEnd && <span>Salida: {ex.actualEnd}</span>}
          </div>
          {ex.aiNote && (
            <p className="text-[10px] text-accent mt-1 italic">IA: {ex.aiNote}</p>
          )}
        </div>

        {ex.status === 'pending' && (
          <div className="flex flex-col gap-1.5 shrink-0">
            <button
              onClick={() => onApprove(ex.id)}
              className="px-3 py-1.5 text-[11px] font-medium rounded-lg bg-success/15 text-success hover:bg-success/25 transition-colors flex items-center gap-1.5"
            >
              <ThumbsUp size={12} /> Aprobar
            </button>
            <button
              onClick={() => onDismiss(ex.id)}
              className="px-3 py-1.5 text-[11px] font-medium rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors flex items-center gap-1.5"
            >
              <XCircle size={12} /> Rechazar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ExceptionsPage() {
  const [exceptions, setExceptions] = useState<AttendanceException[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('pending');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  useEffect(() => {
    setExceptions(mockData.exceptions());
  }, []);

  const displayList = exceptions.filter(ex => {
    if (filter === 'pending') return ex.status === 'pending';
    if (filter === 'approved') return ex.status === 'approved';
    return true;
  });

  const pendingCount = exceptions.filter(e => e.status === 'pending').length;
  const criticalCount = exceptions.filter(e => e.status === 'pending' && e.severity === 'critical').length;

  const handleApprove = (id: string) => {
    mockData.approve(id, 'emp-001', 'Aprobado por RR. HH.');
    setExceptions(mockData.exceptions());
    setMessage({ text: 'Excepción aprobada correctamente.', type: 'success' });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleDismiss = (id: string) => {
    const exc = exceptions.find(e => e.id === id);
    if (!exc) return;
    exc.status = 'rejected';
    exc.resolvedAt = new Date().toISOString();
    exc.resolvedBy = 'emp-001';
    setExceptions([...exceptions]);
    setMessage({ text: 'Excepción rechazada.', type: 'info' });
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Excepciones</h1>
        <p className="text-sm text-muted mt-1">
          {pendingCount} pendientes{criticalCount > 0 ? ` · ${criticalCount} críticas` : ''}
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-surface rounded-xl border border-border p-4">
          <p className="text-xs text-muted uppercase tracking-wider">Total</p>
          <p className="text-2xl font-bold text-foreground mt-1">{exceptions.length}</p>
        </div>
        <div className="bg-surface rounded-xl border border-border p-4">
          <p className="text-xs text-muted uppercase tracking-wider">Pendientes</p>
          <p className="text-2xl font-bold text-warning mt-1">{pendingCount}</p>
        </div>
        <div className="bg-surface rounded-xl border border-border p-4">
          <p className="text-xs text-muted uppercase tracking-wider">Críticas</p>
          <p className="text-2xl font-bold text-destructive mt-1">{criticalCount}</p>
        </div>
      </div>

      {/* Toast */}
      {message && (
        <div className={`px-4 py-2.5 rounded-lg text-sm flex items-center gap-2 ${
          message.type === 'success' ? 'bg-success/15 text-success border border-success/30' : 'bg-accent/10 text-accent border border-accent/20'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
          {message.text}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['pending', 'approved', 'all'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              filter === f
                ? 'bg-accent/15 text-accent border border-accent/30'
                : 'text-muted hover:text-foreground bg-surface border border-border'
            }`}
          >
            {f === 'pending' ? 'Pendientes' : f === 'approved' ? 'Aprobadas' : 'Todas'}
          </button>
        ))}
      </div>

      {/* Exception cards */}
      <div className="space-y-3">
        {displayList.length === 0 ? (
          <div className="bg-surface rounded-xl border border-border p-8 text-center">
            <AlertTriangle size={32} className="mx-auto text-muted mb-2" />
            <p className="text-sm text-muted">
              {filter === 'pending' ? 'No hay excepciones pendientes.' : 'No hay excepciones registradas.'}
            </p>
          </div>
        ) : (
          displayList.map(ex => (
            <ExceptionCard key={ex.id} ex={ex} onApprove={handleApprove} onDismiss={handleDismiss} />
          ))
        )}
      </div>
    </div>
  );
}