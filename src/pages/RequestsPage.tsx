import { useState, useCallback } from 'react';
import { AlertTriangle, FileText, XCircle, CheckCircle2, MessageSquare } from 'lucide-react';
import { mockData } from '../services/mock-data';
import { employees } from '../data/employees-data';
import type { AttendanceException, EmployeeRequest, RequestType } from '../domain/types';

type RequestTab = 'exceptions' | 'requests';

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = { critical: 'bg-destructive/20 text-destructive', high: 'bg-warning/20 text-warning', medium: 'bg-accent/10 text-accent', low: 'bg-muted/30 text-muted' };
  return <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${colors[severity] || colors.low}`}>{severity.toUpperCase()}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = { pending: 'bg-warning/20 text-warning', approved: 'bg-success/15 text-success', rejected: 'bg-destructive/20 text-destructive' };
  return <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${colors[status] || ''}`}>{status === 'pending' ? 'Pendiente' : status === 'approved' ? 'Aprobado' : 'Rechazado'}</span>;
}

function RequestTypeBadge({ type }: { type: RequestType }) {
  const labels: Record<string, string> = { overtime: 'Hora extra', justification: 'Justificación', permission: 'Permiso', manual_punch: 'Marcación manual', vacation: 'Vacaciones', schedule_change: 'Cambio turno' };
  return <span className="text-[10px] text-muted bg-muted/20 px-1.5 py-0.5 rounded">{labels[type] || type}</span>;
}

export default function RequestsPage() {
  const [tab, setTab] = useState<RequestTab>('exceptions');
  const [exceptions, setExceptions] = useState<AttendanceException[]>(() => mockData.exceptions());
  const [requests, setRequests] = useState<EmployeeRequest[]>(() => mockData.requests());
  const [auditNote, setAuditNote] = useState<Record<string, string>>({});
  const [showAudit, setShowAudit] = useState<string | null>(null);

  const totalPending = exceptions.filter(e => e.status === 'pending').length;
  const reqPending = requests.filter(r => r.status === 'pending').length;

  const handleApprove = useCallback((excId: string) => {
    const note = auditNote[excId] || 'Aprobado por RR. HH.';
    mockData.approve(excId, 'emp-001', note);
    setExceptions([...mockData.exceptions()]);
    setAuditNote(prev => ({ ...prev, [excId]: '' }));
    setShowAudit(null);
  }, [auditNote]);

  const handleReject = useCallback((excId: string) => {
    const exc = exceptions.find(e => e.id === excId);
    if (exc) {
      exc.status = 'rejected';
      exc.resolvedAt = new Date().toISOString();
      exc.resolvedBy = 'emp-001';
    }
    setExceptions([...exceptions]);
    setAuditNote(prev => ({ ...prev, [excId]: '' }));
    setShowAudit(null);
  }, [exceptions]);

  const handleApproveReq = useCallback((reqId: string) => {
    const note = auditNote[reqId] || 'Aprobado por RR. HH.';
    mockData.approveRequest(reqId, 'emp-001', note);
    setRequests([...mockData.requests()]);
    setAuditNote(prev => ({ ...prev, [reqId]: '' }));
    setShowAudit(null);
  }, [auditNote]);

  const handleRejectReq = useCallback((reqId: string) => {
    const note = auditNote[reqId] || 'Rechazado por RR. HH.';
    mockData.rejectRequest(reqId, 'emp-001', note);
    setRequests([...mockData.requests()]);
    setAuditNote(prev => ({ ...prev, [reqId]: '' }));
    setShowAudit(null);
  }, [auditNote]);

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Excepciones y Solicitudes</h1>
        <p className="text-sm text-muted mt-1">Gestión de incidencias de asistencia y solicitudes de empleados</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface rounded-xl border border-border p-1 w-fit">
        <button
          onClick={() => setTab('exceptions')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
            tab === 'exceptions' ? 'bg-accent text-white shadow-sm' : 'text-muted hover:text-foreground'
          }`}
        >
          <AlertTriangle size={14} />
          Excepciones
          {totalPending > 0 && <span className="bg-destructive text-white text-[9px] px-1.5 py-0.5 rounded-full">{totalPending}</span>}
        </button>
        <button
          onClick={() => setTab('requests')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
            tab === 'requests' ? 'bg-accent text-white shadow-sm' : 'text-muted hover:text-foreground'
          }`}
        >
          <FileText size={14} />
          Solicitudes
          {reqPending > 0 && <span className="bg-warning text-white text-[9px] px-1.5 py-0.5 rounded-full">{reqPending}</span>}
        </button>
      </div>

      {/* === EXCEPTIONS TAB === */}
      {tab === 'exceptions' && (
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center gap-2">
            <AlertTriangle size={16} className="text-accent" />
            <span className="text-sm font-semibold text-foreground">Excepciones de Asistencia</span>
            <span className="ml-auto text-[10px] text-muted bg-muted/20 px-2 py-0.5 rounded">{exceptions.length} registros</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted border-b border-border">
                  <th className="text-left px-4 py-3 font-medium">Empleado</th>
                  <th className="text-left px-4 py-3 font-medium">Fecha</th>
                  <th className="text-left px-4 py-3 font-medium">Tipo</th>
                  <th className="text-left px-4 py-3 font-medium">Descripción</th>
                  <th className="text-right px-4 py-3 font-medium">Minutos</th>
                  <th className="text-right px-4 py-3 font-medium">Impacto $</th>
                  <th className="text-center px-4 py-3 font-medium">Estado</th>
                  <th className="text-center px-4 py-3 font-medium">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {exceptions.map(ex => {
                  const emp = employees.find(e => e.id === ex.employeeId);
                  return (
                    <tr key={ex.id} className="hover:bg-surface-raised/30 transition-colors">
                      <td className="px-4 py-2.5 text-foreground">{emp?.fullName || ex.employeeId}</td>
                      <td className="px-4 py-2.5 text-muted">{ex.date}</td>
                      <td className="px-4 py-2.5"><SeverityBadge severity={ex.severity} /></td>
                      <td className="px-4 py-2.5 text-muted max-w-[240px] truncate">{ex.description}</td>
                      <td className="px-4 py-2.5 text-right text-muted font-mono">{ex.minutesAffected}</td>
                      <td className="px-4 py-2.5 text-right text-muted font-mono">${ex.monetaryImpact.toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-center"><StatusBadge status={ex.status} /></td>
                      <td className="px-4 py-2.5 text-center">
                        {ex.status === 'pending' ? (
                          showAudit === ex.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={auditNote[ex.id] || ''}
                                onChange={e => setAuditNote(prev => ({ ...prev, [ex.id]: e.target.value }))}
                                placeholder="Nota de auditoría..."
                                className="w-28 text-[10px] px-1.5 py-1 rounded border border-border bg-surface text-foreground"
                              />
                              <button onClick={() => handleApprove(ex.id)} className="text-success hover:opacity-80 cursor-pointer p-0.5" title="Aprobar"><CheckCircle2 size={14} /></button>
                              <button onClick={() => handleReject(ex.id)} className="text-destructive hover:opacity-80 cursor-pointer p-0.5" title="Rechazar"><XCircle size={14} /></button>
                              <button onClick={() => setShowAudit(null)} className="text-muted hover:text-foreground cursor-pointer p-0.5" title="Cancelar"><XCircle size={14} /></button>
                            </div>
                          ) : (
                            <button onClick={() => setShowAudit(ex.id)}
                              className="flex items-center gap-1 text-accent hover:text-accent/80 text-[10px] cursor-pointer">
                              <MessageSquare size={12} /> Resolver
                            </button>
                          )
                        ) : (
                          <span className="text-[10px] text-muted">
                            {ex.resolvedBy ? (ex.resolvedBy === 'emp-001' ? 'RR. HH.' : 'Sistema') : ''}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* === REQUESTS TAB === */}
      {tab === 'requests' && (
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center gap-2">
            <FileText size={16} className="text-accent" />
            <span className="text-sm font-semibold text-foreground">Solicitudes de Empleados</span>
            <span className="ml-auto text-[10px] text-muted bg-muted/20 px-2 py-0.5 rounded">{requests.length} registros</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted border-b border-border">
                  <th className="text-left px-4 py-3 font-medium">Empleado</th>
                  <th className="text-left px-4 py-3 font-medium">Tipo</th>
                  <th className="text-left px-4 py-3 font-medium">Desde</th>
                  <th className="text-left px-4 py-3 font-medium">Hasta</th>
                  <th className="text-left px-4 py-3 font-medium">Motivo</th>
                  <th className="text-center px-4 py-3 font-medium">Estado</th>
                  <th className="text-center px-4 py-3 font-medium">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {requests.map(req => {
                  const emp = employees.find(e => e.id === req.employeeId);
                  return (
                    <tr key={req.id} className="hover:bg-surface-raised/30 transition-colors">
                      <td className="px-4 py-2.5 text-foreground">{emp?.fullName || req.employeeId}</td>
                      <td className="px-4 py-2.5"><RequestTypeBadge type={req.type} /></td>
                      <td className="px-4 py-2.5 text-muted font-mono">{req.startDate}</td>
                      <td className="px-4 py-2.5 text-muted font-mono">{req.endDate || '—'}</td>
                      <td className="px-4 py-2.5 text-muted max-w-[200px] truncate">{req.reason}</td>
                      <td className="px-4 py-2.5 text-center"><StatusBadge status={req.status} /></td>
                      <td className="px-4 py-2.5 text-center">
                        {req.status === 'pending' ? (
                          showAudit === req.id ? (
                            <div className="flex items-center gap-1 justify-center">
                              <input
                                type="text"
                                value={auditNote[req.id] || ''}
                                onChange={e => setAuditNote(prev => ({ ...prev, [req.id]: e.target.value }))}
                                placeholder="Nota..."
                                className="w-24 text-[10px] px-1.5 py-1 rounded border border-border bg-surface text-foreground"
                              />
                              <button onClick={() => handleApproveReq(req.id)} className="text-success hover:opacity-80 cursor-pointer p-0.5"><CheckCircle2 size={14} /></button>
                              <button onClick={() => handleRejectReq(req.id)} className="text-destructive hover:opacity-80 cursor-pointer p-0.5"><XCircle size={14} /></button>
                              <button onClick={() => setShowAudit(null)} className="text-muted hover:text-foreground cursor-pointer p-0.5"><XCircle size={14} /></button>
                            </div>
                          ) : (
                            <button onClick={() => setShowAudit(req.id)}
                              className="flex items-center gap-1 text-accent hover:text-accent/80 text-[10px] cursor-pointer">
                              <MessageSquare size={12} /> Resolver
                            </button>
                          )
                        ) : req.approverComment ? (
                          <span className="text-[10px] text-muted truncate max-w-[100px] inline-block" title={req.approverComment}>{req.approverComment}</span>
                        ) : (
                          <span className="text-[10px] text-muted">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}