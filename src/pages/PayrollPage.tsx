import { useState, useEffect, useRef } from 'react';
import { DollarSign, Clock, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown, ShieldCheck, Eye, FileDown, Printer, Search, X, ChevronRight, ChevronDown, Cpu } from 'lucide-react';
import { mockData } from '../services/mock-data';
import type { EmployeePaySlip, PaySlipLine, PayrollPeriodV2, AIReviewResult } from '../domain/types';

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    borrador: 'bg-muted/30 text-muted',
    en_revision: 'bg-warning/20 text-warning',
    aprobada: 'bg-success/15 text-success',
    has_anomalies: 'bg-destructive/15 text-destructive',
    complete: 'bg-success/15 text-success',
    pending_review: 'bg-warning/20 text-warning',
  };
  const labels: Record<string, string> = {
    borrador: 'Borrador',
    en_revision: 'En revisión',
    aprobada: 'Aprobada para exportar',
    has_anomalies: 'Anomalías',
    complete: 'Completo',
    pending_review: 'Pendiente revisión',
  };
  return <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${colors[status] || ''}`}>{labels[status] || status}</span>;
}

function PaySlipDetail({ slip, onClose }: { slip: EmployeePaySlip; onClose: () => void }) {
  const earnings = slip.lines.filter(l => l.type === 'earnings');
  const deductions = slip.lines.filter(l => l.type === 'deduction');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-surface rounded-xl border border-border shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-surface border-b border-border px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h3 className="text-base font-bold text-foreground">{slip.fullName}</h3>
            <p className="text-xs text-muted">{slip.position} · {slip.department}</p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={slip.status} />
            <button onClick={onClose} className="text-muted hover:text-foreground cursor-pointer transition-colors p-1">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-surface-raised/30 rounded-lg p-3">
              <p className="text-[10px] text-muted">Salario Base</p>
              <p className="text-sm font-bold text-foreground">${slip.baseSalary.toFixed(2)}</p>
            </div>
            <div className="bg-surface-raised/30 rounded-lg p-3">
              <p className="text-[10px] text-muted">Valor Hora</p>
              <p className="text-sm font-bold text-foreground">${slip.hourlyRate.toFixed(2)}</p>
            </div>
            <div className="bg-surface-raised/30 rounded-lg p-3">
              <p className="text-[10px] text-muted">Días Trabajados</p>
              <p className="text-sm font-bold text-foreground">{slip.workedDays}</p>
            </div>
            <div className="bg-surface-raised/30 rounded-lg p-3">
              <p className="text-[10px] text-muted">Neto Estimado</p>
              <p className="text-sm font-bold text-foreground">${slip.netPay.toFixed(2)}</p>
            </div>
          </div>

          {/* Earnings */}
          <div>
            <h4 className="text-xs font-semibold text-success flex items-center gap-1 mb-2"><TrendingUp size={12} /> Ingresos</h4>
            <div className="space-y-1">
              {earnings.map((line, i) => (
                <PaySlipLineRow key={i} line={line} />
              ))}
              <div className="flex justify-between items-center pt-2 border-t border-border text-xs font-bold text-foreground">
                <span>Total Ingresos</span>
                <span>${slip.grossPay.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Deductions */}
          <div>
            <h4 className="text-xs font-semibold text-destructive flex items-center gap-1 mb-2"><TrendingDown size={12} /> Deducciones</h4>
            <div className="space-y-1">
              {deductions.map((line, i) => (
                <PaySlipLineRow key={i} line={line} />
              ))}
              <div className="flex justify-between items-center pt-2 border-t border-border text-xs font-bold text-foreground">
                <span>Total Deducciones</span>
                <span className="text-destructive">-${slip.totalDeductions.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Net Pay */}
          <div className="bg-accent/5 border border-accent/20 rounded-lg p-4 flex items-center justify-between">
            <span className="text-sm font-bold text-foreground">NETO ESTIMADO</span>
            <span className="text-lg font-bold text-accent">${slip.netPay.toFixed(2)}</span>
          </div>

          {/* Anomalies warning */}
          {slip.criticalAnomalies > 0 && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle size={14} className="text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-destructive">{slip.criticalAnomalies} anomalía(s) crítica(s) sin resolver</p>
                <p className="text-[10px] text-muted mt-0.5">Este monto no será definitivo hasta que se resuelvan las excepciones pendientes.</p>
              </div>
            </div>
          )}

          <p className="text-[9px] text-muted text-center pt-2 border-t border-border/50">
            Pre-nómina estimada — sujeta a revisión de RR. HH. No constituye comprobante de pago oficial ni declaración ante IESS/SRI.
          </p>
        </div>
      </div>
    </div>
  );
}

function PaySlipLineRow({ line }: { line: PaySlipLine }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="text-xs">
      <div className="flex items-center justify-between py-1 px-2 rounded hover:bg-surface-raised/30 transition-colors">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {line.ruleApplied && (
            <button onClick={() => setExpanded(!expanded)} className="text-muted hover:text-foreground cursor-pointer shrink-0 p-0.5">
              {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
            </button>
          )}
          <span className="text-muted truncate">{line.concept}</span>
        </div>
        <span className={`font-mono shrink-0 ml-2 ${line.type === 'deduction' ? 'text-destructive' : 'text-foreground'}`}>
          {line.type === 'deduction' ? '-' : '+'}${line.amount.toFixed(2)}
        </span>
      </div>
      {expanded && line.ruleApplied && (
        <div className="ml-5 pl-3 border-l-2 border-accent/30 py-1.5 space-y-0.5 text-[10px] text-muted">
          <p><span className="font-medium text-foreground">Regla:</span> {line.ruleApplied}</p>
          {line.evidenceLink && <p><span className="font-medium text-foreground">Evidencia:</span> {line.evidenceLink}</p>}
          {line.referenceDate && <p><span className="font-medium text-foreground">Fecha ref.:</span> {line.referenceDate}</p>}
        </div>
      )}
    </div>
  );
}

export default function PayrollPage() {
  const [period, setPeriod] = useState<PayrollPeriodV2 | null>(null);
  const [slips, setSlips] = useState<EmployeePaySlip[]>([]);
  const [review, setReview] = useState<AIReviewResult | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState<EmployeePaySlip | null>(null);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState<string>('todas');
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPeriod(mockData.payrollPeriodV2());
    setSlips(mockData.paySlips());
    setReview(mockData.aiReview());
  }, []);

  if (!period) return null;

  const depts = [...new Set(slips.map(s => s.department))];
  const filtered = slips.filter(s => {
    if (search && !s.fullName.toLowerCase().includes(search.toLowerCase())) return false;
    if (deptFilter !== 'todas' && s.department !== deptFilter) return false;
    return true;
  });

  const totalNet = filtered.reduce((s, sl) => s + sl.netPay, 0);
  const totalGross = filtered.reduce((s, sl) => s + sl.grossPay, 0);
  const totalDed = filtered.reduce((s, sl) => s + sl.totalDeductions, 0);
  const anomaliesCount = slips.filter(s => s.criticalAnomalies > 0).length;
  const canApprove = period.criticalAnomalyCount === 0;

  // Summary totals computed entirely from slips (all employees)
  const sumBase = slips.reduce((s, sl) => s + sl.baseSalary, 0);
  const sumOT50 = slips.reduce((s, sl) => s + sl.lines.filter(l => l.concept.includes('Hora extra 50%')).reduce((a, l) => a + l.amount, 0), 0);
  const sumOT100 = slips.reduce((s, sl) => s + sl.lines.filter(l => l.concept.includes('Hora extra 100%')).reduce((a, l) => a + l.amount, 0), 0);
  const sumNight = slips.reduce((s, sl) => s + sl.lines.filter(l => l.concept.includes('nocturno')).reduce((a, l) => a + l.amount, 0), 0);
  const sumDed = slips.reduce((s, sl) => s + sl.totalDeductions, 0);
  const sumNet = slips.reduce((s, sl) => s + sl.netPay, 0);
  const sumGross = slips.reduce((s, sl) => s + sl.grossPay, 0);
  // Adiciones = earnings beyond base, overtime, and night surcharge
  const sumAdditions = sumGross - sumBase - sumOT50 - sumOT100 - sumNight;

  const handleExportCSV = () => {
    const header = 'Empleado,Departamento,Cargo,Salario Base,Horas Días,Bruto,Deducciones,Neto,Estado\n';
    const rows = filtered.map(s =>
      `"${s.fullName}","${s.department}","${s.position}",${s.baseSalary.toFixed(2)},${s.workedDays},${s.grossPay.toFixed(2)},${s.totalDeductions.toFixed(2)},${s.netPay.toFixed(2)},${s.status}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `pre-nomina-${period.name.replace(/\s/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAdvancePeriod = () => {
    if (!canApprove) return;
    setPeriod(prev => prev ? { ...prev, status: 'aprobada' } : null);
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pre-nómina</h1>
          <p className="text-sm text-muted mt-1">{period.name} · {period.totalEmployees} empleados</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-muted italic">Pre-nómina estimada — sujeta a revisión de RR. HH.</span>
        </div>
      </div>

      {/* Period Status Banner */}
      <div className={`rounded-xl border p-4 flex items-center justify-between ${
        period.status === 'borrador' ? 'border-muted/30 bg-muted/10' :
        period.status === 'en_revision' ? 'border-warning/30 bg-warning/5' :
        'border-success/30 bg-success/5'
      }`}>
        <div className="flex items-center gap-3">
          {period.status === 'borrador' ? <Clock size={18} className="text-muted" /> :
           period.status === 'en_revision' ? <AlertTriangle size={18} className="text-warning" /> :
           <CheckCircle2 size={18} className="text-success" />}
          <div>
            <p className="text-sm font-semibold text-foreground">
              Período: <StatusBadge status={period.status} />
            </p>
            <p className="text-[10px] text-muted mt-0.5">
              {period.status === 'borrador' && 'Excepciones críticas sin resolver — no puede aprobarse'}
              {period.status === 'en_revision' && 'Período listo para revisión final y aprobación'}
              {period.status === 'aprobada' && 'Período aprobado. Listo para exportar a nómina oficial.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {period.status === 'en_revision' && (
            <button
              onClick={handleAdvancePeriod}
              disabled={!canApprove}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                canApprove
                  ? 'bg-accent text-white hover:bg-accent/90 shadow-sm'
                  : 'bg-muted/30 text-muted cursor-not-allowed'
              }`}
            >
              <CheckCircle2 size={14} />
              Aprobar para exportar
            </button>
          )}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-border text-muted hover:text-foreground transition-all cursor-pointer"
          >
            <FileDown size={14} /> CSV
          </button>
          <button
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-border text-muted hover:text-foreground transition-all cursor-pointer"
          >
            <Printer size={14} /> Imprimir
          </button>
        </div>
      </div>

      {/* Summary Cards — all values computed from paySlips() */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-surface rounded-xl border border-border p-4">
          <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Base Salarial</p>
          <p className="text-lg font-bold text-foreground">${sumBase.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-surface rounded-xl border border-border p-4">
          <p className="text-[10px] text-muted uppercase tracking-wider mb-1">HE 50% / 100%</p>
          <p className="text-lg font-bold text-foreground">${(sumOT50 + sumOT100).toFixed(2)}</p>
          <p className="text-[9px] text-muted mt-0.5">50%: ${sumOT50.toFixed(2)} · 100%: ${sumOT100.toFixed(2)}</p>
        </div>
        <div className="bg-surface rounded-xl border border-border p-4">
          <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Recargo Nocturno</p>
          <p className="text-lg font-bold text-foreground">${sumNight.toFixed(2)}</p>
          <p className="text-[9px] text-muted mt-0.5">Art. 49 CT 25%</p>
        </div>
        <div className="bg-surface rounded-xl border border-border p-4">
          <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Adiciones</p>
          <p className="text-lg font-bold text-success">+${sumAdditions.toFixed(2)}</p>
        </div>
        <div className="bg-surface rounded-xl border border-border p-4">
          <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Deducciones</p>
          <p className="text-lg font-bold text-destructive">-${sumDed.toFixed(2)}</p>
        </div>
      </div>

      {/* Net + AI Review + Reconciliation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-surface rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted uppercase tracking-wider">Neto Estimado del Período</p>
            <StatusBadge status={period.status} />
          </div>
          <p className="text-3xl font-bold text-foreground">${sumNet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <div className="flex items-center gap-4 mt-2 text-[10px] text-muted">
            <span>Bruto: ${sumGross.toFixed(2)}</span>
            <span>Neto tabla emp.: ${totalNet.toFixed(2)}</span>
            <span>Deducciones: -${sumDed.toFixed(2)}</span>
            {anomaliesCount > 0 && <span className="text-destructive">{anomaliesCount} emp. con anomalías</span>}
          </div>

          {/* Reconciliation line */}
          <div className="mt-3 pt-3 border-t border-border/50 text-[10px] text-muted font-mono leading-relaxed">
            <span className="text-foreground font-medium text-[9px] uppercase tracking-wider">Conciliación</span><br />
            Base ${sumBase.toFixed(2)} + HE ${(sumOT50+sumOT100).toFixed(2)} + Nocturno ${sumNight.toFixed(2)} + Adiciones ${sumAdditions.toFixed(2)} − Deducciones ${sumDed.toFixed(2)}
            <span className="text-foreground font-semibold"> = Neto ${sumNet.toFixed(2)}</span>
          </div>
        </div>

        {/* AI Review Agent Panel */}
        <button
          onClick={() => setShowReview(!showReview)}
          className="bg-surface rounded-xl border border-accent/30 p-5 text-left hover:border-accent/60 transition-all group cursor-pointer"
        >
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck size={18} className="text-accent group-hover:scale-110 transition-transform duration-150" />
            <span className="text-sm font-semibold text-foreground">Workforce Review Agent</span>
          </div>
          {review && (
            <>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                review.overallRiskLevel === 'high' || review.overallRiskLevel === 'critical'
                  ? 'bg-destructive/20 text-destructive'
                  : review.overallRiskLevel === 'medium' ? 'bg-warning/20 text-warning'
                  : 'bg-success/15 text-success'
              }`}>{review.overallRiskLevel.toUpperCase()}</span>
              <p className="text-xs text-muted mt-2 line-clamp-2">{review.summary}</p>
              <div className="flex items-center gap-1 text-[10px] text-accent mt-2">
                <Eye size={12} /> {showReview ? 'Ocultar panel' : 'Ver hallazgos detallados'}
              </div>
            </>
          )}
        </button>
      </div>

      {/* AI Review Panel */}
      {showReview && review && (
        <div className={`rounded-xl border p-5 ${
          review.canClosePeriod ? 'border-success/30 bg-success/3' : 'border-destructive/30 bg-destructive/3'
        }`}>
          <div className="flex items-center gap-2 mb-3">
            {review.canClosePeriod ? <CheckCircle2 size={18} className="text-success" /> : <AlertTriangle size={18} className="text-destructive" />}
            <span className="text-sm font-semibold text-foreground">Workforce Review Agent — Hallazgos</span>
            <span className={`ml-auto text-[10px] px-2 py-0.5 rounded font-medium ${
              review.overallRiskLevel === 'high' || review.overallRiskLevel === 'critical'
                ? 'bg-destructive/20 text-destructive'
                : review.overallRiskLevel === 'medium' ? 'bg-warning/20 text-warning'
                : 'bg-success/15 text-success'
            }`}>{review.overallRiskLevel.toUpperCase()}</span>
          </div>

          <p className="text-xs text-muted mb-4">{review.summary}</p>

          {/* Anomaly breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            {review.anomalyBreakdown.map(a => (
              <div key={a.type} className="bg-surface-raised/50 rounded-lg p-2.5 text-center">
                <p className="text-lg font-bold text-foreground">{a.count}</p>
                <p className="text-[10px] text-muted capitalize">{a.type.replace('_', ' ')}</p>
                <p className="text-[9px] text-muted mt-0.5">${a.totalImpact.toFixed(2)}</p>
              </div>
            ))}
          </div>

          {/* Critical findings with evidence */}
          {review.criticalFindings.length > 0 && (
            <div className="space-y-2 mb-4">
              <p className="text-xs font-semibold text-destructive">Hallazgos críticos</p>
              {review.criticalFindings.map((f, i) => (
                <div key={i} className="bg-destructive/5 border border-destructive/20 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-foreground font-medium">{f.employeeName}</p>
                    <span className="text-[10px] font-medium text-destructive">${f.estimatedImpact.toFixed(2)}</span>
                  </div>
                  <p className="text-[10px] text-muted mt-0.5">{f.issue}</p>
                  <div className="mt-1.5 space-y-0.5">
                    {f.evidence.map((e, j) => (
                      <p key={j} className="text-[9px] text-muted flex items-start gap-1">
                        <span className="text-accent mt-0.5">→</span> {e}
                      </p>
                    ))}
                    {f.rulesApplied.map((r, j) => (
                      <p key={j} className="text-[9px] text-muted flex items-start gap-1">
                        <span className="text-amber mt-0.5">⚖</span> {r}
                      </p>
                    ))}
                  </div>
                  <p className="text-[9px] text-muted mt-1">
                    <span className={`font-medium ${
                      f.riskLevel === 'critical' ? 'text-destructive' :
                      f.riskLevel === 'high' ? 'text-warning' : 'text-muted'
                    }`}>Riesgo: {f.riskLevel.toUpperCase()}</span>
                    <span className="ml-2">Acción: Revisar y documentar</span>
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Recommendations */}
          <div className="space-y-1 mb-3">
            <p className="text-xs font-semibold text-foreground">Recomendaciones del Agente</p>
            {review.recommendations.map((r, i) => (
              <p key={i} className="text-[10px] text-muted flex items-start gap-1">
                <span className="mt-0.5 shrink-0">•</span>
                <span>{r}</span>
              </p>
            ))}
          </div>

          {/* Period close info */}
          <div className={`rounded-lg p-3 text-xs ${review.canClosePeriod ? 'bg-success/5 text-success' : 'bg-destructive/10 text-destructive'}`}>
            <p className="font-medium">{review.reasonSummary}</p>
          </div>

          <div className="flex items-center justify-between mt-3 text-[9px] text-muted">
            <span>Revisado: {new Date(review.reviewedAt).toLocaleString('es-EC', { timeZone: 'America/Guayaquil' })}</span>
            <span className="flex items-center gap-1">
              <Cpu size={10} /> {review.modelUsed === 'deterministic' ? 'Motor determinista' : 'API ML'}
            </span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar empleado..."
            className="w-full pl-8 pr-8 py-2 rounded-lg border border-border bg-surface text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-foreground cursor-pointer">
              <X size={14} />
            </button>
          )}
        </div>
        <select
          value={deptFilter}
          onChange={e => setDeptFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border bg-surface text-xs text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-accent"
        >
          <option value="todas">Todos los departamentos</option>
          {depts.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <span className="text-[10px] text-muted">{filtered.length} empleados</span>
      </div>

      {/* Employee Pay Slips Table */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden" ref={tableRef}>
        <div className="px-5 py-3 border-b border-border flex items-center gap-2">
          <DollarSign size={14} className="text-accent" />
          <span className="text-sm font-semibold text-foreground">Desglose por Empleado</span>
          <span className="ml-auto text-[10px] text-muted bg-muted/20 px-2 py-0.5 rounded">
            Neto total: ${totalNet.toFixed(2)}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted border-b border-border">
                <th className="text-left px-4 py-2.5 font-medium">Empleado</th>
                <th className="text-left px-4 py-2.5 font-medium">Depto</th>
                <th className="text-right px-4 py-2.5 font-medium">Base</th>
                <th className="text-right px-4 py-2.5 font-medium">HE</th>
                <th className="text-right px-4 py-2.5 font-medium">Nocturno</th>
                <th className="text-right px-4 py-2.5 font-medium">Adiciones</th>
                <th className="text-right px-4 py-2.5 font-medium">Deducciones</th>
                <th className="text-right px-4 py-2.5 font-medium">Neto</th>
                <th className="text-center px-4 py-2.5 font-medium">Estado</th>
                <th className="text-center px-4 py-2.5 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(s => {
                const overtimeAmt = s.lines.filter(l => l.concept.includes('Hora extra')).reduce((a, l) => a + l.amount, 0);
                const nightAmt = s.lines.filter(l => l.concept.includes('nocturno')).reduce((a, l) => a + l.amount, 0);
                const additions = s.lines.filter(l => l.type === 'earnings').reduce((a, l) => a + l.amount, 0) - s.baseSalary - overtimeAmt - nightAmt;
                return (
                  <tr key={s.employeeId} className="hover:bg-surface-raised/30 transition-colors">
                    <td className="px-4 py-2.5 text-foreground font-medium">{s.fullName}</td>
                    <td className="px-4 py-2.5 text-muted">{s.department}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-foreground">${s.baseSalary.toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-foreground">${overtimeAmt.toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-foreground">${nightAmt.toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-success">+${Math.max(0, additions).toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-destructive">-${s.totalDeductions.toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-foreground font-semibold">${s.netPay.toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-center"><StatusBadge status={s.status} /></td>
                    <td className="px-4 py-2.5 text-center">
                      <button
                        onClick={() => setSelectedSlip(s)}
                        className="text-accent hover:text-accent/80 text-[10px] flex items-center gap-1 cursor-pointer"
                      >
                        <Eye size={12} /> Desglose
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <p className="text-xs text-muted text-center py-8">No se encontraron empleados con los filtros aplicados.</p>
        )}
      </div>

      {/* Pay slip modal */}
      {selectedSlip && <PaySlipDetail slip={selectedSlip} onClose={() => setSelectedSlip(null)} />}
    </div>
  );
}